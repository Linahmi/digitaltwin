import sql from './sqlite'

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

async function ensurePatients(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false
  try {
    const rows = await sql`SELECT COUNT(*) as count FROM patients` as any[]
    return Number(rows[0].count) > 0
  } catch {
    return false
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getPatientSummary(patientId: string): Promise<SyntheaPatientSummary | null> {
  if (!(await ensurePatients())) return null
  const rows = await sql`SELECT * FROM patients WHERE id = ${patientId}` as DBPatient[]
  const row = rows[0]
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

export async function getFirstPatient(): Promise<SyntheaPatientSummary | null> {
  if (!(await ensurePatients())) return null
  const rows = await sql`SELECT * FROM patients ORDER BY id LIMIT 1` as DBPatient[]
  const row = rows[0]
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

export async function listPatients(filters?: {
  condition?: string
  minAge?: number
  maxAge?: number
  gender?: string
  limit?: number
}): Promise<SyntheaPatientSummary[]> {
  if (!(await ensurePatients())) return []

  const limit = filters?.limit ?? 100
  const params: unknown[] = []
  let paramIndex = 1
  const whereClauses: string[] = []

  let fromClause = 'FROM patients p'
  if (filters?.condition) {
    fromClause += ' INNER JOIN conditions c ON c.patient_id = p.id'
    whereClauses.push(`c.display ILIKE $${paramIndex++}`)
    params.push(`%${filters.condition}%`)
  }

  if (filters?.gender) {
    whereClauses.push(`p.gender = $${paramIndex++}`)
    params.push(filters.gender.toLowerCase())
  }

  const currentYear = new Date().getFullYear()
  if (filters?.maxAge !== undefined) {
    whereClauses.push(`EXTRACT(YEAR FROM p.birth_date::date)::int >= $${paramIndex++}`)
    params.push(currentYear - filters.maxAge)
  }
  if (filters?.minAge !== undefined) {
    whereClauses.push(`EXTRACT(YEAR FROM p.birth_date::date)::int <= $${paramIndex++}`)
    params.push(currentYear - filters.minAge)
  }

  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''
  const query = `SELECT DISTINCT p.* ${fromClause} ${where} ORDER BY p.last_name, p.first_name LIMIT $${paramIndex}`
  params.push(limit)

  const rows = await sql.query(query, params) as DBPatient[]

  const patientIds = rows.map(r => r.id)
  if (patientIds.length === 0) return []

  const condRows = await sql.query(
    `SELECT patient_id, display FROM conditions WHERE patient_id = ANY($1) AND status = 'active' ORDER BY onset_date DESC`,
    [patientIds]
  ) as { patient_id: string; display: string }[]

  const condsByPatient = new Map<string, string[]>()
  for (const c of condRows) {
    const arr = condsByPatient.get(c.patient_id) ?? []
    arr.push(c.display)
    condsByPatient.set(c.patient_id, arr)
  }

  return rows.map(r => ({
    id:             r.id,
    firstName:      r.first_name,
    lastName:       r.last_name,
    birthDate:      r.birth_date,
    gender:         r.gender,
    age:            calcAge(r.birth_date),
    mainConditions: (condsByPatient.get(r.id) ?? []).slice(0, 3),
  }))
}

import { getClinicalSummary } from './clinicalSummary'

export async function buildSyntheaContext(patientId: string): Promise<string | null> {
  if (!(await ensurePatients())) return null

  let summary
  try {
    summary = await getClinicalSummary(patientId)
  } catch {
    return null
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
  ]

  const trendKeys = Object.keys(summary.trends)
  if (trendKeys.length === 0) {
    lines.push('- No historical trends available')
  } else {
    trendKeys.forEach(k => {
      const t = summary.trends[k]
      lines.push(`- ${k}: ${t.historicalPattern} (${t.trendDirection}). ${t.abnormalValuesCount} abnormal out of ${t.previousValuesCount + 1} total values. Recent abnormalities: ${t.abnormalRecentCount}.`)
    })
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
  )

  return lines.join('\n')
}
