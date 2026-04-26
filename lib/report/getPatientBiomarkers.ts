/**
 * lib/report/getPatientBiomarkers.ts
 *
 * Provides a normalized set of current biomarkers for health calculations.
 */

import { getClinicalSummary } from '@/lib/db/clinicalSummary'

export interface PatientBiomarkers {
  ldl: number | null
  hdl: number | null
  triglycerides: number | null
  hba1c: number | null
  glucose: number | null
  systolicBP: number | null
  diastolicBP: number | null
  heartRate: number | null
  bmi: number | null
  weight: number | null
}

/**
 * Safely returns normalized biomarker values from Synthea/patient data source.
 * Returns null for missing values.
 */
export async function getPatientBiomarkers(patientId?: string): Promise<PatientBiomarkers> {
  if (!patientId) {
    return {
      ldl: null, hdl: null, triglycerides: null, hba1c: null, glucose: null,
      systolicBP: null, diastolicBP: null, heartRate: null, bmi: null, weight: null
    }
  }

  try {
    const summary = getClinicalSummary(patientId)
    
    return {
      ldl: summary.latestLabs.ldl?.value ?? null,
      hdl: summary.latestLabs.hdl?.value ?? null,
      triglycerides: summary.latestLabs.triglycerides?.value ?? null,
      hba1c: summary.latestLabs.hba1c?.value ?? null,
      glucose: summary.latestLabs.glucose?.value ?? null,
      systolicBP: summary.latestVitals.systolic_bp?.value ?? null,
      diastolicBP: summary.latestVitals.diastolic_bp?.value ?? null,
      heartRate: summary.latestVitals.heart_rate?.value ?? null,
      bmi: summary.latestVitals.bmi?.value ?? null,
      weight: summary.latestVitals.weight?.value ?? null,
    }
  } catch (error) {
    console.error(`Error fetching biomarkers for patient ${patientId}:`, error)
    return {
      ldl: null, hdl: null, triglycerides: null, hba1c: null, glucose: null,
      systolicBP: null, diastolicBP: null, heartRate: null, bmi: null, weight: null
    }
  }
}
