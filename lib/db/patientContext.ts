/**
 * lib/db/patientContext.ts
 *
 * Server-only module. Queries SQLite for a patient's full record and
 * builds the context string sent to Claude.
 *
 * Migration to PostgreSQL: swap the `db` import for a pg/postgres client
 *   and update placeholder syntax (? → $1).
 *
 * Migration to a FHIR server: replace the SQL queries with FHIR REST
 *   calls to /Patient/<id>, /Condition?patient=<id>, etc.
 */

import db from './sqlite'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SyntheaPatientSummary {
  id: string
  firstName: string
  lastName: string
  birthDate: string | null
  gender: string | null
  age: number | null
}

interface DBPatient {
  id: string
  first_name: string
  last_name: string
  birth_date: string | null
  gender: string | null
  race: string | null
  ethnicity: string | null
  marital_status: string | null
}

interface DBCondition {
  display: string
  onset_date: string | null
  status: string
}

interface DBMedication {
  display: string
  dosage: string | null
  frequency: string | null
  status: string
}

interface DBObservation {
  display: string
  value: number | null
  value_string: string | null
  unit: string | null
  effective_date: string | null
}

interface DBAllergy {
  substance: string
}

// ─── Age helper ─────────────────────────────────────────────────────────────

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns lightweight patient info (for page headers, patient lists).
 * Returns null if patientId is not found.
 * Throws if the database is empty.
 */
export function getPatientSummary(patientId: string): SyntheaPatientSummary | null {
  const count = (db.prepare('SELECT COUNT(*) as c FROM patients').get() as { c: number }).c
  if (count === 0) {
    throw new Error('No Synthea patients found. Please run the import script: bun run db:import')
  }

  const row = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) as DBPatient | undefined
  if (!row) return null

  return {
    id:        row.id,
    firstName: row.first_name,
    lastName:  row.last_name,
    birthDate: row.birth_date,
    gender:    row.gender,
    age:       calcAge(row.birth_date),
  }
}

/**
 * Returns the id and name of the first patient in the database.
 * Used when DEFAULT_PATIENT_ID is not set.
 */
export function getFirstPatient(): SyntheaPatientSummary | null {
  const count = (db.prepare('SELECT COUNT(*) as c FROM patients').get() as { c: number }).c
  if (count === 0) {
    throw new Error('No Synthea patients found. Please run the import script: bun run db:import')
  }
  const row = db.prepare('SELECT * FROM patients ORDER BY rowid LIMIT 1').get() as DBPatient | undefined
  if (!row) return null
  return {
    id:        row.id,
    firstName: row.first_name,
    lastName:  row.last_name,
    birthDate: row.birth_date,
    gender:    row.gender,
    age:       calcAge(row.birth_date),
  }
}

/**
 * Returns a list of patient summaries, with optional filtering.
 * Filters: condition (display LIKE), minAge, maxAge, gender.
 */
export function listPatients(filters?: {
  condition?: string
  minAge?: number
  maxAge?: number
  gender?: string
  limit?: number
}): SyntheaPatientSummary[] {
  const count = (db.prepare('SELECT COUNT(*) as c FROM patients').get() as { c: number }).c
  if (count === 0) {
    throw new Error('No Synthea patients found. Please run the import script: bun run db:import')
  }

  const limit = filters?.limit ?? 100
  const params: any[] = []
  const whereClauses: string[] = []

  // Condition filter: join with conditions table
  let fromClause = 'FROM patients p'
  if (filters?.condition) {
    fromClause += ' INNER JOIN conditions c ON c.patient_id = p.id'
    whereClauses.push("c.display LIKE ?")
    params.push(`%${filters.condition}%`)
  }

  // Gender filter
  if (filters?.gender) {
    whereClauses.push("p.gender = ?")
    params.push(filters.gender.toLowerCase())
  }

  // Age filters (derived from birth_date in SQLite)
  const currentYear = new Date().getFullYear()
  if (filters?.maxAge !== undefined) {
    // minBirthYear
    whereClauses.push("CAST(strftime('%Y', p.birth_date) AS INTEGER) >= ?")
    params.push(currentYear - filters.maxAge)
  }
  if (filters?.minAge !== undefined) {
    // maxBirthYear
    whereClauses.push("CAST(strftime('%Y', p.birth_date) AS INTEGER) <= ?")
    params.push(currentYear - filters.minAge)
  }

  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''
  const sql = `SELECT DISTINCT p.* ${fromClause} ${where} ORDER BY p.last_name, p.first_name LIMIT ?`
  params.push(limit)

  const rows = db.prepare(sql).all(...params) as DBPatient[]
  return rows.map(r => {
    const conditions = db.prepare(
        "SELECT display FROM conditions WHERE patient_id = ? AND status = 'active' ORDER BY onset_date DESC LIMIT 3"
    ).all(r.id) as { display: string }[];
      
    return {
      id:        r.id,
      firstName: r.first_name,
      lastName:  r.last_name,
      birthDate: r.birth_date,
      gender:    r.gender,
      age:       calcAge(r.birth_date),
      mainConditions: conditions.map(c => c.display)
    };
  })
}

import { getClinicalSummary } from './clinicalSummary'

/**
 * Builds the full patient context string for Claude.
 * Returns null if the patient is not found.
 * Throws if the database is empty.
 */
export function buildSyntheaContext(patientId: string): string | null {
  const count = (db.prepare('SELECT COUNT(*) as c FROM patients').get() as { c: number }).c
  if (count === 0) {
    throw new Error('No Synthea patients found. Please run the import script: bun run db:import')
  }

  let summary;
  try {
    summary = getClinicalSummary(patientId);
  } catch (e) {
    return null;
  }

  const lines: string[] = [
    `Patient: ${summary.demographics.firstName} ${summary.demographics.lastName}`,
    `Age: ${summary.demographics.age ?? 'Unknown'} | Gender: ${summary.demographics.gender ?? 'Unknown'}`,
    '',
    '== Vital Signs (Latest) ==',
    `Blood Pressure:    ${summary.latestVitals.systolic_bp?.value ?? 'N/A'}/${summary.latestVitals.diastolic_bp?.value ?? 'N/A'} mmHg`,
    `Heart Rate:        ${summary.latestVitals.heart_rate?.value ?? 'N/A'} bpm`,
    `BMI:               ${summary.latestVitals.bmi?.value ?? 'N/A'} kg/m²`,
    `Body Weight:       ${summary.latestVitals.weight?.value ?? 'N/A'} kg`,
    `Body Height:       ${summary.latestVitals.height?.value ?? 'N/A'} cm`,
    '',
    '== Laboratory Results (Latest) ==',
    `Total Cholesterol: ${summary.latestLabs.total_cholesterol?.value ?? 'N/A'} mg/dL`,
    `LDL Cholesterol:   ${summary.latestLabs.ldl?.value ?? 'N/A'} mg/dL`,
    `HDL Cholesterol:   ${summary.latestLabs.hdl?.value ?? 'N/A'} mg/dL`,
    `Triglycerides:     ${summary.latestLabs.triglycerides?.value ?? 'N/A'} mg/dL`,
    `Fasting Glucose:   ${summary.latestLabs.glucose?.value ?? 'N/A'} mg/dL`,
    `HbA1c:             ${summary.latestLabs.hba1c?.value ?? 'N/A'} %`,
    '',
    '== Clinical Trends ==',
  ];

  const trendKeys = Object.keys(summary.trends);
  if (trendKeys.length === 0) {
    lines.push('- No historical trends available');
  } else {
    trendKeys.forEach(k => {
      const t = summary.trends[k];
      lines.push(`- ${k}: ${t.historicalPattern} (${t.trendDirection}). ${t.abnormalValuesCount} abnormal out of ${t.previousValuesCount + 1} total values. Recent abnormalities: ${t.abnormalRecentCount}.`);
    });
  }

  lines.push(
    '',
    '== Active Conditions ==',
    summary.activeConditions.length
      ? summary.activeConditions.map((c: any) => `- ${c.display}${c.onset_date ? ` (since ${c.onset_date.slice(0, 10)})` : ''}`).join('\n')
      : '- None recorded',
    '',
    '== Current Medications ==',
    summary.currentMedications.length
      ? summary.currentMedications.map((m: any) => `- ${m.display}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? `, ${m.frequency}` : ''}`).join('\n')
      : '- None recorded',
    '',
    '== Allergies ==',
    summary.allergies.length ? summary.allergies.map((a: any) => `- ${a.substance}`).join('\n') : '- None recorded',
    '',
    '== Cardiovascular Risk Factors ==',
    summary.cardiovascularRiskFactors.length ? summary.cardiovascularRiskFactors.map((r: string) => `- ${r}`).join('\n') : '- None identified',
    '',
    '== Metabolic Risk Factors ==',
    summary.metabolicRiskFactors.length ? summary.metabolicRiskFactors.map((r: string) => `- ${r}`).join('\n') : '- None identified',
    '',
    '== Missing Data ==',
    summary.missingData.length ? summary.missingData.map((d: string) => `- ${d}`).join('\n') : '- None identified',
    '',
    '== Data Quality Notes ==',
    summary.dataQualityNotes.map((n: string) => `- ${n}`).join('\n')
  );

  return lines.join('\n');
}
