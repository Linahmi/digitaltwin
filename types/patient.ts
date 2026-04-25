// types/patient.ts
// Patient-related TypeScript interfaces.
// ChatMessage and Citation are used by the voice UI and remain unchanged.
// SyntheaPatientSummary is the shape returned by /api/patient.
// The legacy Patient/PatientVitals interfaces are kept for reference only
// (they are no longer used in production code paths).

export interface SyntheaPatientSummary {
  id: string
  firstName: string
  lastName: string
  birthDate: string | null
  gender: string | null
  age: number | null
  mainConditions?: string[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  timestamp: number
}

export interface Citation {
  pmid: string
  title: string
  authors: string[]
  journal: string
  year: string
  url?: string
  abstract?: string
  publicationTypes?: string[]
  evidenceType?: string
  relevanceScore?: number
}

// ── Legacy types (kept for reference, not used in active code) ─────────────
// These matched the shape of public/patients/patient-001.json.
// All production code now reads from the SQLite database via
// lib/db/patientContext.ts and uses SyntheaPatientSummary.

export interface PatientVitals {
  age: number
  sex: 'male' | 'female'
  height_cm: number
  weight_kg: number
  bmi: number
  systolic_bp: number
  diastolic_bp: number
  heart_rate: number
  ldl_cholesterol?: number
  hdl_cholesterol?: number
  triglycerides?: number
  glucose_fasting?: number
}

export interface MedicalCondition {
  name: string
  onset_date: string
  status: 'active' | 'resolved'
}

export interface Medication {
  name: string
  dosage: string
  frequency: string
  start_date: string
}

/** @deprecated Use SyntheaPatientSummary + SQLite query instead */
export interface Patient {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  vitals: PatientVitals
  conditions: MedicalCondition[]
  medications: Medication[]
  allergies: string[]
  smoking_status: 'never' | 'former' | 'current'
  alcohol_use: 'none' | 'occasional' | 'moderate' | 'heavy'
}
