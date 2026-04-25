/**
 * lib/risk/framinghamRisk.ts
 *
 * Implements the 2008 D'Agostino General Cardiovascular Risk Profile
 * for use in primary care. Estimates 10-year risk of CVD.
 *
 * Reference: D’Agostino et al. Circulation. 2008;117:743-753.
 */

export interface FraminghamInput {
  age: number | null;
  sex: 'male' | 'female' | null;
  systolicBP: number | null;
  totalCholesterol: number | null;
  hdl: number | null;
  smokingStatus: boolean | null; // true if current smoker
  diabetesStatus: boolean | null;
  onBPTreatment: boolean | null;
}

export interface FraminghamResult {
  riskPercent: number | null;
  riskCategory: 'low' | 'moderate' | 'high' | null;
  missingInputs: string[];
  assumptions: string[];
}

/**
 * Calculates 10-year CVD risk using the Framingham Risk Score.
 * This is an educational tool, not a clinical diagnosis.
 */
export function calculateCVDRisk(input: FraminghamInput): FraminghamResult {
  const missingInputs: string[] = [];
  const assumptions: string[] = [];

  // 1. Validate required fields
  if (input.age === null) missingInputs.push('age');
  if (!input.sex) missingInputs.push('sex');
  if (input.systolicBP === null) missingInputs.push('systolic BP');
  if (input.totalCholesterol === null) missingInputs.push('total cholesterol');
  if (input.hdl === null) missingInputs.push('HDL cholesterol');
  if (input.diabetesStatus === null) missingInputs.push('diabetes status');
  
  let smoking = input.smokingStatus;
  if (smoking === null) {
    assumptions.push('Assumed non-smoker due to missing smoking status data.');
    smoking = false; // Fallback per user instruction
  }

  let bpTreated = input.onBPTreatment;
  if (bpTreated === null) {
    assumptions.push('Assumed not on blood pressure medication due to missing data.');
    bpTreated = false;
  }

  if (missingInputs.length > 0) {
    return {
      riskPercent: null,
      riskCategory: null,
      missingInputs,
      assumptions
    };
  }

  // 2. Safely cast non-nulls now that validation passed
  const age = input.age as number;
  const sysBP = input.systolicBP as number;
  const chol = input.totalCholesterol as number;
  const hdl = input.hdl as number;
  const isDiabetic = input.diabetesStatus ? 1 : 0;
  const isSmoker = smoking ? 1 : 0;

  // Protect against log(<=0) or completely out of bound values that would break the math
  if (age < 30 || age > 74) {
    assumptions.push('Age is outside the optimal Framingham validation range (30-74). Result is extrapolated.');
  }

  const lnAge = Math.log(Math.max(age, 1));
  const lnChol = Math.log(Math.max(chol, 1));
  const lnHdl = Math.log(Math.max(hdl, 1));
  const lnSysBP = Math.log(Math.max(sysBP, 1));

  let risk = 0;

  // 3. Apply Framingham coefficients (D'Agostino 2008)
  if (input.sex === 'female') {
    // Female coefficients
    let sum = 2.32888 * lnAge + 1.20904 * lnChol - 0.70833 * lnHdl;
    if (bpTreated) {
      sum += 2.82263 * lnSysBP;
    } else {
      sum += 2.76157 * lnSysBP;
    }
    sum += 0.52873 * isSmoker;
    sum += 0.69154 * isDiabetic;

    const mean = 26.1931;
    const baselineSurvival = 0.9533;
    risk = 1 - Math.pow(baselineSurvival, Math.exp(sum - mean));
  } else {
    // Male coefficients
    let sum = 3.06117 * lnAge + 1.12370 * lnChol - 0.93263 * lnHdl;
    if (bpTreated) {
      sum += 1.99881 * lnSysBP;
    } else {
      sum += 1.93303 * lnSysBP;
    }
    sum += 0.65451 * isSmoker;
    sum += 0.57367 * isDiabetic;

    const mean = 23.9802;
    const baselineSurvival = 0.88936;
    risk = 1 - Math.pow(baselineSurvival, Math.exp(sum - mean));
  }

  // Convert to percentage
  let riskPercent = risk * 100;
  // Cap at 99% and floor at 0.1% for realistic display
  riskPercent = Math.max(0.1, Math.min(99.9, riskPercent));
  
  // Round to 1 decimal place
  riskPercent = Math.round(riskPercent * 10) / 10;

  let riskCategory: 'low' | 'moderate' | 'high' = 'low';
  if (riskPercent >= 20) {
    riskCategory = 'high';
  } else if (riskPercent >= 10) {
    riskCategory = 'moderate';
  }

  return {
    riskPercent,
    riskCategory,
    missingInputs,
    assumptions
  };
}
