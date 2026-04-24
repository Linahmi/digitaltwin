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

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  timestamp: number
}

export interface Citation {
  pmid: string
  title: string
  authors: string
  journal: string
  year: string
}
