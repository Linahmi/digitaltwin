import { getClinicalSummary } from '@/lib/db/clinicalSummary'
import type { ReportDashboardData } from '@/components/profile/ReportDashboardClient'
import { findChadwickPatientSummary } from '@/lib/report/getChadwickPatient'
import { buildPatientDisplayName } from '@/lib/report/patientDisplayName'

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

export function getChadwickDashboardData(): ReportDashboardData | null {
  const patient = findChadwickPatientSummary()
  if (!patient) return null

  const summary = getClinicalSummary(patient.id)
  const { firstName, lastName, displayName } = buildPatientDisplayName(
    summary.demographics.firstName,
    summary.demographics.lastName
  )
  const initials = `${firstName[0] ?? 'P'}${lastName[0] ?? 'T'}`

  const latestEncounterDate =
    summary.encounters[0]?.start_date ??
    summary.latestLabs.glucose?.date ??
    summary.latestVitals.systolic_bp?.date ??
    null

  return {
    patientId: patient.id,
    displayName,
    initials,
    age: summary.demographics.age ?? null,
    gender: summary.demographics.gender ?? null,
    latestEncounterDate,
    readinessScore: clamp(100 - summary.missingData.length * 6, 48, 96),
    cardiovascularRiskFactors: summary.cardiovascularRiskFactors,
    activeConditions: summary.activeConditions.map((condition) => condition.display),
    narrative:
      'Primary longitudinal signal centers on cardiometabolic stability with residual obesity and HbA1c elevation, while LDL and blood pressure are currently well controlled in the latest imported record.',
    vitals: {
      bmi: summary.latestVitals.bmi?.value ?? null,
      systolic: summary.latestVitals.systolic_bp?.value ?? null,
      diastolic: summary.latestVitals.diastolic_bp?.value ?? null,
      heartRate: summary.latestVitals.heart_rate?.value ?? null,
      weight: summary.latestVitals.weight?.value ?? null,
      height: summary.latestVitals.height?.value ?? null,
    },
    labs: {
      ldl: summary.latestLabs.ldl?.value ?? null,
      hdl: summary.latestLabs.hdl?.value ?? null,
      triglycerides: summary.latestLabs.triglycerides?.value ?? null,
      glucose: summary.latestLabs.glucose?.value ?? null,
      hba1c: summary.latestLabs.hba1c?.value ?? null,
      totalCholesterol: summary.latestLabs.total_cholesterol?.value ?? null,
    },
    riskInput: {
      age: summary.demographics.age ?? null,
      sex:
        summary.demographics.gender === 'male' || summary.demographics.gender === 'female'
          ? summary.demographics.gender
          : null,
      systolicBP: summary.latestVitals.systolic_bp?.value ?? null,
      totalCholesterol: summary.latestLabs.total_cholesterol?.value ?? null,
      hdl: summary.latestLabs.hdl?.value ?? null,
      smokingStatus: null,
      diabetesStatus:
        summary.activeConditions.some((condition) => /diabet/i.test(condition.display)) ||
        (summary.latestLabs.hba1c?.value ?? 0) >= 5.7 ||
        summary.currentMedications.some((medication) => medication.display.toLowerCase().includes('metformin')),
      onBPTreatment: summary.currentMedications.some((medication) =>
        /hydrochlorothiazide|metoprolol|lisinopril|amlodipine|losartan/i.test(medication.display)
      ),
    },
    biomarkerMetrics: [
      { label: 'LDL', patientValue: summary.latestLabs.ldl?.value ?? null, patientUnit: 'mg/dL', targetValue: 100, targetLabel: 'Target <100' },
      { label: 'HDL', patientValue: summary.latestLabs.hdl?.value ?? null, patientUnit: 'mg/dL', targetValue: 40, targetLabel: 'Target >=40' },
      { label: 'Triglycerides', patientValue: summary.latestLabs.triglycerides?.value ?? null, patientUnit: 'mg/dL', targetValue: 150, targetLabel: 'Target <150' },
      { label: 'HbA1c', patientValue: summary.latestLabs.hba1c?.value ?? null, patientUnit: '%', targetValue: 5.7, targetLabel: 'Target <5.7' },
    ],
    timelineItems: [
      ...summary.currentMedications.slice(0, 3).map((medication, index) => ({
        label: medication.display.replace(/\s+\d.*$/, '').slice(0, 24) || 'Medication',
        column: index,
        row: 0,
        detail: 'Medication',
      })),
      ...summary.encounters.slice(0, 3).map((encounter, index) => ({
        label: (encounter.reason_display ?? encounter.type ?? 'Encounter').slice(0, 24),
        column: index + 2,
        row: 1,
        detail: encounter.start_date,
      })),
    ].slice(0, 6),
    healthPlanCount: summary.currentMedications.length + summary.encounters.length,
  }
}
