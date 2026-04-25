/**
 * scripts/import-synthea.ts
 *
 * Reads Synthea FHIR Bundle JSON files from SYNTHEA_OUTPUT_DIR
 * (default: ./public/synthea/fhir) and imports them into SQLite.
 *
 * Run: bun run db:import
 *
 * No mock fallback. If the directory is missing or empty, this script
 * exits with a clear error so the developer knows exactly what to do.
 *
 * Supported FHIR resource types:
 *   Patient, Condition, MedicationRequest, Observation,
 *   AllergyIntolerance, Encounter
 */

import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'

// ─── Config ──────────────────────────────────────────────────────────────────

const SYNTHEA_DIR = process.env.SYNTHEA_OUTPUT_DIR
  ? path.resolve(process.env.SYNTHEA_OUTPUT_DIR)
  : path.join(process.cwd(), 'public', 'synthea', 'fhir')

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data', 'synthea.db')

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
  '55284-4': 'Blood Pressure (panel)',  // kept for completeness
}

// ─── DB setup ─────────────────────────────────────────────────────────────────

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Schema — same tables as lib/db/sqlite.ts (reproduced here so the
// script runs standalone without importing the Next.js TS module)
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY, first_name TEXT NOT NULL, last_name TEXT NOT NULL,
    birth_date TEXT, gender TEXT, race TEXT, ethnicity TEXT, marital_status TEXT
  );
  CREATE TABLE IF NOT EXISTS conditions (
    id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, code TEXT, display TEXT NOT NULL,
    onset_date TEXT, abatement_date TEXT, status TEXT DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, code TEXT, display TEXT NOT NULL,
    dosage TEXT, frequency TEXT, start_date TEXT, end_date TEXT, status TEXT DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS observations (
    id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, code TEXT NOT NULL, display TEXT NOT NULL,
    value REAL, value_string TEXT, unit TEXT, effective_date TEXT
  );
  CREATE TABLE IF NOT EXISTS allergies (
    id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, substance TEXT NOT NULL,
    status TEXT DEFAULT 'active', recorded_date TEXT
  );
  CREATE TABLE IF NOT EXISTS encounters (
    id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, type TEXT,
    start_date TEXT, end_date TEXT, reason_display TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_conditions_patient  ON conditions(patient_id);
  CREATE INDEX IF NOT EXISTS idx_conditions_display  ON conditions(display);
  CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
  CREATE INDEX IF NOT EXISTS idx_observations_patient ON observations(patient_id);
  CREATE INDEX IF NOT EXISTS idx_observations_code   ON observations(code);
  CREATE INDEX IF NOT EXISTS idx_allergies_patient   ON allergies(patient_id);
  CREATE INDEX IF NOT EXISTS idx_encounters_patient  ON encounters(patient_id);
  CREATE INDEX IF NOT EXISTS idx_patients_birth_date ON patients(birth_date);
`)

// ─── Prepared statements ──────────────────────────────────────────────────────

const upsertPatient = db.prepare(`
  INSERT OR REPLACE INTO patients (id, first_name, last_name, birth_date, gender, race, ethnicity, marital_status)
  VALUES (@id, @first_name, @last_name, @birth_date, @gender, @race, @ethnicity, @marital_status)
`)

const upsertCondition = db.prepare(`
  INSERT OR REPLACE INTO conditions (id, patient_id, code, display, onset_date, abatement_date, status)
  VALUES (@id, @patient_id, @code, @display, @onset_date, @abatement_date, @status)
`)

const upsertMedication = db.prepare(`
  INSERT OR REPLACE INTO medications (id, patient_id, code, display, dosage, frequency, start_date, end_date, status)
  VALUES (@id, @patient_id, @code, @display, @dosage, @frequency, @start_date, @end_date, @status)
`)

const upsertObservation = db.prepare(`
  INSERT OR REPLACE INTO observations (id, patient_id, code, display, value, value_string, unit, effective_date)
  VALUES (@id, @patient_id, @code, @display, @value, @value_string, @unit, @effective_date)
`)

const upsertAllergy = db.prepare(`
  INSERT OR REPLACE INTO allergies (id, patient_id, substance, status, recorded_date)
  VALUES (@id, @patient_id, @substance, @status, @recorded_date)
`)

const upsertEncounter = db.prepare(`
  INSERT OR REPLACE INTO encounters (id, patient_id, type, start_date, end_date, reason_display)
  VALUES (@id, @patient_id, @type, @start_date, @end_date, @reason_display)
`)

// ─── FHIR helpers ─────────────────────────────────────────────────────────────

function fhirId(reference: string | undefined): string {
  if (!reference) return ''
  // "urn:uuid:abc" or "Patient/abc" → "abc"
  const parts = reference.split('/')
  return parts[parts.length - 1].replace('urn:uuid:', '')
}

function extensionValue(resource: any, url: string): string | undefined {
  return resource.extension?.find((e: any) => e.url === url)?.valueString
    ?? resource.extension?.find((e: any) => e.url === url)?.valueCoding?.display
}

// ─── Resource handlers ────────────────────────────────────────────────────────

function importPatient(res: any) {
  const name = res.name?.[0] ?? {}
  const firstName = name.given?.join(' ') ?? 'Unknown'
  const lastName = name.family ?? 'Unknown'

  upsertPatient.run({
    id:             res.id,
    first_name:     firstName,
    last_name:      lastName,
    birth_date:     res.birthDate ?? null,
    gender:         res.gender ?? null,
    race:           extensionValue(res, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race') ?? null,
    ethnicity:      extensionValue(res, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity') ?? null,
    marital_status: res.maritalStatus?.text ?? null,
  })
}

function importCondition(res: any) {
  upsertCondition.run({
    id:              res.id,
    patient_id:      fhirId(res.subject?.reference),
    code:            res.code?.coding?.[0]?.code ?? null,
    display:         res.code?.text ?? res.code?.coding?.[0]?.display ?? 'Unknown condition',
    onset_date:      res.onsetDateTime ?? res.onsetPeriod?.start ?? null,
    abatement_date:  res.abatementDateTime ?? null,
    status:          res.abatementDateTime ? 'resolved' : 'active',
  })
}

function importMedication(res: any) {
  const dosageInstruction = res.dosageInstruction?.[0]
  const dose = dosageInstruction?.doseAndRate?.[0]?.doseQuantity
  const timing = dosageInstruction?.timing?.repeat

  let dosage = ''
  if (dose) dosage = `${dose.value ?? ''}${dose.unit ?? ''}`

  let frequency = ''
  if (timing) {
    const freq = timing.frequency ?? 1
    const period = timing.period ?? 1
    const periodUnit = timing.periodUnit ?? 'd'
    frequency = `${freq}x per ${period}${periodUnit}`
  }

  upsertMedication.run({
    id:          res.id,
    patient_id:  fhirId(res.subject?.reference),
    code:        res.medicationCodeableConcept?.coding?.[0]?.code ?? null,
    display:     res.medicationCodeableConcept?.text
                 ?? res.medicationCodeableConcept?.coding?.[0]?.display
                 ?? 'Unknown medication',
    dosage:      dosage || null,
    frequency:   frequency || null,
    start_date:  res.authoredOn ?? null,
    end_date:    null,
    status:      res.status ?? 'active',
  })
}

function importObservation(res: any) {
  const code = res.code?.coding?.[0]?.code ?? ''
  // Only import observations we recognise as clinically relevant
  if (!VITAL_CODES[code] && !res.code?.text?.toLowerCase().includes('pressure')) return

  const display = VITAL_CODES[code] ?? res.code?.text ?? res.code?.coding?.[0]?.display ?? 'Unknown'

  // Handle component-based observations (e.g. blood pressure panels)
  if (res.component?.length) {
    for (const comp of res.component) {
      const compCode = comp.code?.coding?.[0]?.code ?? ''
      if (!VITAL_CODES[compCode]) continue
      upsertObservation.run({
        id:             `${res.id}-${compCode}`,
        patient_id:     fhirId(res.subject?.reference),
        code:           compCode,
        display:        VITAL_CODES[compCode],
        value:          comp.valueQuantity?.value ?? null,
        value_string:   null,
        unit:           comp.valueQuantity?.unit ?? null,
        effective_date: res.effectiveDateTime ?? null,
      })
    }
    return
  }

  upsertObservation.run({
    id:             res.id,
    patient_id:     fhirId(res.subject?.reference),
    code:           code,
    display:        display,
    value:          res.valueQuantity?.value ?? null,
    value_string:   res.valueString ?? null,
    unit:           res.valueQuantity?.unit ?? null,
    effective_date: res.effectiveDateTime ?? null,
  })
}

function importAllergy(res: any) {
  upsertAllergy.run({
    id:            res.id,
    patient_id:    fhirId(res.patient?.reference),
    substance:     res.code?.text ?? res.code?.coding?.[0]?.display ?? 'Unknown substance',
    status:        res.clinicalStatus?.coding?.[0]?.code ?? 'active',
    recorded_date: res.recordedDate ?? null,
  })
}

function importEncounter(res: any) {
  upsertEncounter.run({
    id:             res.id,
    patient_id:     fhirId(res.subject?.reference),
    type:           res.type?.[0]?.text ?? res.type?.[0]?.coding?.[0]?.display ?? null,
    start_date:     res.period?.start ?? null,
    end_date:       res.period?.end ?? null,
    reason_display: res.reasonCode?.[0]?.text ?? res.reasonCode?.[0]?.coding?.[0]?.display ?? null,
  })
}

// ─── Main import ──────────────────────────────────────────────────────────────

function importBundle(filePath: string, counters: Record<string, number>) {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const bundle = JSON.parse(raw)

  if (bundle.resourceType !== 'Bundle') {
    console.warn(`  ⚠  Skipping ${path.basename(filePath)} — not a FHIR Bundle`)
    return
  }

  const entries: any[] = bundle.entry ?? []
  const importFn: Record<string, (res: any) => void> = {
    Patient:             (r) => { importPatient(r); counters.patients++ },
    Condition:           (r) => { importCondition(r); counters.conditions++ },
    MedicationRequest:   (r) => { importMedication(r); counters.medications++ },
    Observation:         (r) => { importObservation(r); /* counted selectively */ },
    AllergyIntolerance:  (r) => { importAllergy(r); counters.allergies++ },
    Encounter:           (r) => { importEncounter(r); counters.encounters++ },
  }

  const importBundleTransaction = db.transaction(() => {
    for (const entry of entries) {
      const res = entry.resource
      if (!res?.resourceType) continue
      const fn = importFn[res.resourceType]
      if (fn) fn(res)
    }
  })

  importBundleTransaction()
}

function main() {
  // ── Validate directory ──
  if (!fs.existsSync(SYNTHEA_DIR)) {
    console.error(`\n❌  Synthea output directory not found:\n   ${SYNTHEA_DIR}\n`)
    console.error('Run Synthea first:')
    console.error('  java -jar synthea.jar -p 10')
    console.error('  New-Item -ItemType Directory -Force -Path public\\synthea')
    console.error('  Move-Item -Path output\\fhir -Destination public\\synthea\\ -Force\n')
    process.exit(1)
  }

  const files = fs.readdirSync(SYNTHEA_DIR).filter(f => f.endsWith('.json'))

  if (files.length === 0) {
    console.error(`\n❌  No FHIR JSON files found in:\n   ${SYNTHEA_DIR}\n`)
    console.error('Generate Synthea patients and copy the output/fhir folder there.\n')
    process.exit(1)
  }

  const counters = { patients: 0, conditions: 0, medications: 0, allergies: 0, encounters: 0, observations: 0 }

  console.log(`\n📂  Importing ${files.length} FHIR bundle(s) from:\n   ${SYNTHEA_DIR}\n`)

  for (const file of files) {
    // Skip hospitalInformation and practitionerInformation meta files
    if (file.startsWith('hospital') || file.startsWith('practitioner')) continue
    const fullPath = path.join(SYNTHEA_DIR, file)
    process.stdout.write(`   ${file} ... `)
    try {
      importBundle(fullPath, counters)
      // Count observations separately (they have a filter)
      const obs = db.prepare('SELECT COUNT(*) as c FROM observations').get() as { c: number }
      counters.observations = obs.c
      console.log('✓')
    } catch (err) {
      console.log('✗')
      console.error(`   Error: ${(err as Error).message}`)
    }
  }

  const total = db.prepare('SELECT COUNT(*) as c FROM patients').get() as { c: number }

  const obsBreakdown = db.prepare('SELECT display, COUNT(*) as count FROM observations GROUP BY display ORDER BY count DESC').all() as {display: string, count: number}[];
  const obsLog = obsBreakdown.map(o => `      - ${o.display}: ${o.count}`).join('\n');

  console.log(`
✅  Import complete
   Patients:     ${counters.patients}
   Conditions:   ${counters.conditions}
   Medications:  ${counters.medications}
   Allergies:    ${counters.allergies}
   Encounters:   ${counters.encounters}
   Observations: ${counters.observations} (vitals/labs only)
${obsLog}
   Total in DB:  ${total.c} patients

   Database: ${DB_PATH}
`)

  db.close()
}

main()
