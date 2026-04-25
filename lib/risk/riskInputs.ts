import { getClinicalSummary } from '../db/clinicalSummary';
import { FraminghamInput } from './framinghamRisk';

// Common antihypertensive medication keywords in Synthea
const BP_MEDS = [
  'lisinopril',
  'amlodipine',
  'metoprolol',
  'hydrochlorothiazide',
  'losartan',
  'valsartan',
  'atenolol',
  'carvedilol',
  'nifedipine',
  'diltiazem'
];

/**
 * Extracts required Framingham inputs from the normalized clinical summary.
 * Maps raw FHIR database metrics to the standardized input format.
 */
export function getFraminghamInputs(patientId: string): FraminghamInput {
  const summary = getClinicalSummary(patientId);

  // Demographics
  const age = typeof summary.demographics.age === 'number' ? summary.demographics.age : null;
  
  let sex: 'male' | 'female' | null = null;
  if (summary.demographics.gender === 'male' || summary.demographics.gender === 'female') {
    sex = summary.demographics.gender;
  }

  // Vitals & Labs
  const systolicBP = summary.latestVitals?.systolic_bp?.value ?? null;
  const totalCholesterol = summary.latestLabs?.total_cholesterol?.value ?? null;
  const hdl = summary.latestLabs?.hdl?.value ?? null;

  // Diabetes Status
  // True if explicitly diagnosed OR if recent labs show diabetic range (HbA1c >= 6.5 or fasting glucose >= 126)
  let diabetesStatus = false;
  if (summary.activeConditions.some(c => c.display.toLowerCase().includes('diabetes'))) {
    diabetesStatus = true;
  } else if (summary.latestLabs?.hba1c?.value >= 6.5) {
    diabetesStatus = true;
  } else if (summary.latestLabs?.glucose?.value >= 126) {
    diabetesStatus = true;
  }

  // BP Treatment Status
  // True if patient has an active prescription for common BP medications
  const onBPTreatment = summary.currentMedications.some(med => 
    BP_MEDS.some(bpMed => med.display.toLowerCase().includes(bpMed))
  );

  // Smoking Status
  // Synthea often omits structured smoking status or puts it in observations we don't map by default.
  // We check conditions just in case, but it will typically fall back to null.
  let smokingStatus: boolean | null = null;
  if (summary.activeConditions.some(c => c.display.toLowerCase().includes('smoker') || c.display.toLowerCase().includes('smoking'))) {
    smokingStatus = true;
  }

  return {
    age,
    sex,
    systolicBP,
    totalCholesterol,
    hdl,
    smokingStatus,
    diabetesStatus,
    onBPTreatment
  };
}
