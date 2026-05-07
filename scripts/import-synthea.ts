/**
 * scripts/import-synthea.ts
 *
 * Reads Synthea FHIR Bundle JSON files from SYNTHEA_OUTPUT_DIR
 * (default: ./public/synthea/fhir) and imports them into Neon Postgres.
 *
 * Run: npx tsx scripts/import-synthea.ts
 *
 * Requires DATABASE_URL in environment. Run scripts/migrate.ts first.
 *
 * Supported FHIR resource types:
 *   Patient, Condition, MedicationRequest, Observation,
 *   AllergyIntolerance, Encounter
 */

import path from 'path'
import fs from 'fs'
import { neonConfig, Pool } from '@neondatabase/serverless'
import type { PoolClient } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

// ─── Config ──────────────────────────────────────────────────────────────────

const SYNTHEA_DIR = process.env.SYNTHEA_OUTPUT_DIR
  ? path.resolve(process.env.SYNTHEA_OUTPUT_DIR)
  : path.join(process.cwd(), 'public', 'synthea', 'fhir')

// ─── Observation LOINC codes we care about ────────────────────────────────────

const VITAL_CODES: Record<string, string> = {
  '8480-6':  'Systolic BP',
  '8462-4':  'Diastolic BP',
  '8867-4':  'Heart Rate',
  '39156-5': 'BMI',
  '29463-7': 'Body Weight',
  '8302-2':  'Body Height',
  '2093-3':  'Total Cholesterol',
  '18262-6': 'LDL Cholesterol',
  '2085-9':  'HDL Cholesterol',
  '2571-8':  'Triglycerides',
  '2339-0':  'Fasting Glucose',
  '4548-4':  'HbA1c',
  '55284-4': 'Blood Pressure (panel)',
}

// ─── FHIR helpers ─────────────────────────────────────────────────────────────

function fhirId(reference: string | undefined): string {
  if (!reference) return ''
  const parts = reference.split('/')
  return parts[parts.length - 1].replace('urn:uuid:', '')
}

function extensionValue(resource: any, url: string): string | undefined {
  return resource.extension?.find((e: any) => e.url === url)?.valueString
    ?? resource.extension?.find((e: any) => e.url === url)?.valueCoding?.display
}

// ─── Resource importers ───────────────────────────────────────────────────────

async function importPatient(client: PoolClient, res: any) {
  const name = res.name?.[0] ?? {}
  const firstName = name.given?.join(' ') ?? 'Unknown'
  const lastName = name.family ?? 'Unknown'
  await client.query(
    `INSERT INTO patients (id, first_name, last_name, birth_date, gender, race, ethnicity, marital_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET
       first_name=$2, last_name=$3, birth_date=$4, gender=$5, race=$6, ethnicity=$7, marital_status=$8`,
    [
      res.id, firstName, lastName, res.birthDate ?? null, res.gender ?? null,
      extensionValue(res, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race') ?? null,
      extensionValue(res, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity') ?? null,
      res.maritalStatus?.text ?? null,
    ]
  )
}

async function importCondition(client: PoolClient, res: any) {
  await client.query(
    `INSERT INTO conditions (id, patient_id, code, display, onset_date, abatement_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET
       patient_id=$2, code=$3, display=$4, onset_date=$5, abatement_date=$6, status=$7`,
    [
      res.id, fhirId(res.subject?.reference),
      res.code?.coding?.[0]?.code ?? null,
      res.code?.text ?? res.code?.coding?.[0]?.display ?? 'Unknown condition',
      res.onsetDateTime ?? res.onsetPeriod?.start ?? null,
      res.abatementDateTime ?? null,
      res.abatementDateTime ? 'resolved' : 'active',
    ]
  )
}

async function importMedication(client: PoolClient, res: any) {
  const dosageInstruction = res.dosageInstruction?.[0]
  const dose = dosageInstruction?.doseAndRate?.[0]?.doseQuantity
  const timing = dosageInstruction?.timing?.repeat
  let dosage = dose ? `${dose.value ?? ''}${dose.unit ?? ''}` : null
  let frequency: string | null = null
  if (timing) {
    frequency = `${timing.frequency ?? 1}x per ${timing.period ?? 1}${timing.periodUnit ?? 'd'}`
  }
  await client.query(
    `INSERT INTO medications (id, patient_id, code, display, dosage, frequency, start_date, end_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO UPDATE SET
       patient_id=$2, code=$3, display=$4, dosage=$5, frequency=$6, start_date=$7, end_date=$8, status=$9`,
    [
      res.id, fhirId(res.subject?.reference),
      res.medicationCodeableConcept?.coding?.[0]?.code ?? null,
      res.medicationCodeableConcept?.text ?? res.medicationCodeableConcept?.coding?.[0]?.display ?? 'Unknown medication',
      dosage || null, frequency || null, res.authoredOn ?? null, null, res.status ?? 'active',
    ]
  )
}

async function importObservation(client: PoolClient, res: any) {
  const code = res.code?.coding?.[0]?.code ?? ''
  if (!VITAL_CODES[code] && !res.code?.text?.toLowerCase().includes('pressure')) return
  const display = VITAL_CODES[code] ?? res.code?.text ?? res.code?.coding?.[0]?.display ?? 'Unknown'

  if (res.component?.length) {
    for (const comp of res.component) {
      const compCode = comp.code?.coding?.[0]?.code ?? ''
      if (!VITAL_CODES[compCode]) continue
      await client.query(
        `INSERT INTO observations (id, patient_id, code, display, value, value_string, unit, effective_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET
           patient_id=$2, code=$3, display=$4, value=$5, value_string=$6, unit=$7, effective_date=$8`,
        [
          `${res.id}-${compCode}`, fhirId(res.subject?.reference),
          compCode, VITAL_CODES[compCode],
          comp.valueQuantity?.value ?? null, null,
          comp.valueQuantity?.unit ?? null, res.effectiveDateTime ?? null,
        ]
      )
    }
    return
  }

  await client.query(
    `INSERT INTO observations (id, patient_id, code, display, value, value_string, unit, effective_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET
       patient_id=$2, code=$3, display=$4, value=$5, value_string=$6, unit=$7, effective_date=$8`,
    [
      res.id, fhirId(res.subject?.reference), code, display,
      res.valueQuantity?.value ?? null, res.valueString ?? null,
      res.valueQuantity?.unit ?? null, res.effectiveDateTime ?? null,
    ]
  )
}

async function importAllergy(client: PoolClient, res: any) {
  await client.query(
    `INSERT INTO allergies (id, patient_id, substance, status, recorded_date)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (id) DO UPDATE SET patient_id=$2, substance=$3, status=$4, recorded_date=$5`,
    [
      res.id, fhirId(res.patient?.reference),
      res.code?.text ?? res.code?.coding?.[0]?.display ?? 'Unknown substance',
      res.clinicalStatus?.coding?.[0]?.code ?? 'active',
      res.recordedDate ?? null,
    ]
  )
}

async function importEncounter(client: PoolClient, res: any) {
  await client.query(
    `INSERT INTO encounters (id, patient_id, type, start_date, end_date, reason_display)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET patient_id=$2, type=$3, start_date=$4, end_date=$5, reason_display=$6`,
    [
      res.id, fhirId(res.subject?.reference),
      res.type?.[0]?.text ?? res.type?.[0]?.coding?.[0]?.display ?? null,
      res.period?.start ?? null, res.period?.end ?? null,
      res.reasonCode?.[0]?.text ?? res.reasonCode?.[0]?.coding?.[0]?.display ?? null,
    ]
  )
}

// ─── Bundle importer ──────────────────────────────────────────────────────────

async function importBundle(client: PoolClient, filePath: string, counters: Record<string, number>) {
  const bundle = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  if (bundle.resourceType !== 'Bundle') {
    console.warn(`  ⚠  Skipping ${path.basename(filePath)} — not a FHIR Bundle`)
    return
  }

  await client.query('BEGIN')
  try {
    for (const entry of (bundle.entry ?? [])) {
      const res = entry.resource
      if (!res?.resourceType) continue
      switch (res.resourceType) {
        case 'Patient':            await importPatient(client, res);    counters.patients++;    break
        case 'Condition':          await importCondition(client, res);  counters.conditions++;  break
        case 'MedicationRequest':  await importMedication(client, res); counters.medications++; break
        case 'Observation':        await importObservation(client, res);                        break
        case 'AllergyIntolerance': await importAllergy(client, res);    counters.allergies++;   break
        case 'Encounter':          await importEncounter(client, res);  counters.encounters++;  break
      }
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('\n❌  DATABASE_URL is not set.\n')
    process.exit(1)
  }

  if (!fs.existsSync(SYNTHEA_DIR)) {
    console.error(`\n❌  Synthea output directory not found:\n   ${SYNTHEA_DIR}\n`)
    console.error('Run Synthea first:')
    console.error('  java -jar synthea.jar -p 10')
    console.error('  Move-Item -Path output\\fhir -Destination public\\synthea\\ -Force\n')
    process.exit(1)
  }

  const files = fs.readdirSync(SYNTHEA_DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('hospital') && !f.startsWith('practitioner'))

  if (files.length === 0) {
    console.error(`\n❌  No FHIR JSON files found in:\n   ${SYNTHEA_DIR}\n`)
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  const counters = { patients: 0, conditions: 0, medications: 0, allergies: 0, encounters: 0 }

  console.log(`\n📂  Importing ${files.length} FHIR bundle(s) from:\n   ${SYNTHEA_DIR}\n`)

  for (const file of files) {
    process.stdout.write(`   ${file} ... `)
    try {
      await importBundle(client, path.join(SYNTHEA_DIR, file), counters)
      console.log('✓')
    } catch (err) {
      console.log('✗')
      console.error(`   Error: ${(err as Error).message}`)
    }
  }

  const obsResult = await client.query('SELECT COUNT(*) FROM observations')
  const totalResult = await client.query('SELECT COUNT(*) FROM patients')

  console.log(`
✅  Import complete
   Patients:     ${counters.patients}
   Conditions:   ${counters.conditions}
   Medications:  ${counters.medications}
   Allergies:    ${counters.allergies}
   Encounters:   ${counters.encounters}
   Observations: ${obsResult.rows[0].count} (vitals/labs only)
   Total in DB:  ${totalResult.rows[0].count} patients
`)

  client.release()
  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
