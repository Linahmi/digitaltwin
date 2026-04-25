import { getFraminghamInputs } from './riskInputs';
import { calculateCVDRisk, FraminghamInput } from './framinghamRisk';
import { getClinicalSummary } from '../db/clinicalSummary';

export interface SimulationScenario {
  weightChangeKg?: number;
  exerciseHoursPerWeek?: number;
  systolicBPChange?: number;
  ldlChange?: number;
  hdlChange?: number;
  smokingQuit?: boolean;
}

export function simulateCVDRisk(patientId: string, scenario: SimulationScenario) {
  const assumptions: string[] = [];
  
  // 1. Get baseline inputs and clinical summary for height/weight
  const baselineInputs = getFraminghamInputs(patientId);
  const baselineRiskResult = calculateCVDRisk(baselineInputs);
  
  const summary = getClinicalSummary(patientId);
  const baselineWeight = summary.latestVitals?.weight?.value ?? null;
  const baselineHeight = summary.latestVitals?.height?.value ?? null; // usually in cm
  const baselineBMI = summary.latestVitals?.bmi?.value ?? null;

  // Track original display vitals
  const originalVitals = {
    systolicBP: baselineInputs.systolicBP,
    totalCholesterol: baselineInputs.totalCholesterol,
    hdl: baselineInputs.hdl,
    weight: baselineWeight,
    bmi: baselineBMI,
    smokingStatus: baselineInputs.smokingStatus
  };

  // 2. Clone inputs for simulation
  const simInputs: FraminghamInput = { ...baselineInputs };
  const simVitals = { ...originalVitals };

  // 3. Apply scenario deltas and record assumptions

  // --- Weight Change ---
  if (scenario.weightChangeKg && baselineWeight) {
    const newWeight = Math.max(baselineWeight + scenario.weightChangeKg, 1);
    simVitals.weight = newWeight;
    
    if (baselineHeight) {
      // Calculate new BMI: weight (kg) / (height (m))^2
      const heightM = baselineHeight / 100;
      const newBMI = newWeight / (heightM * heightM);
      simVitals.bmi = Math.max(newBMI, 12); // Hard floor
      assumptions.push(`Weight changed by ${scenario.weightChangeKg} kg, updating BMI to ${simVitals.bmi.toFixed(1)}.`);
    }

    // Weight loss usually lowers systolic BP (~1 mmHg per kg lost)
    if (scenario.weightChangeKg < 0 && simInputs.systolicBP !== null) {
      const bpReduction = Math.abs(scenario.weightChangeKg) * 1.0;
      // Cap reduction to avoid impossible simulated values
      const newBP = Math.max(simInputs.systolicBP - bpReduction, 85);
      simInputs.systolicBP = newBP;
      simVitals.systolicBP = newBP;
      assumptions.push(`Weight loss of ${Math.abs(scenario.weightChangeKg)} kg estimated to reduce systolic BP by ~${bpReduction.toFixed(1)} mmHg.`);
    }
  }

  // --- Exercise ---
  if (scenario.exerciseHoursPerWeek) {
    const hrs = scenario.exerciseHoursPerWeek;
    
    // Exercise increases HDL (~1 mg/dL per hour per week)
    if (simInputs.hdl !== null) {
      const hdlIncrease = hrs * 1.0;
      simInputs.hdl = simInputs.hdl + hdlIncrease;
      simVitals.hdl = simInputs.hdl;
      assumptions.push(`Added ${hrs} hrs/week exercise estimated to raise HDL by ~${hdlIncrease.toFixed(1)} mg/dL.`);
    }

    // Exercise lowers BP (~2 mmHg per hour per week)
    if (simInputs.systolicBP !== null) {
      const bpReduction = hrs * 2.0;
      const newBP = Math.max(simInputs.systolicBP - bpReduction, 85);
      simInputs.systolicBP = newBP;
      simVitals.systolicBP = newBP;
      assumptions.push(`Added ${hrs} hrs/week exercise estimated to reduce systolic BP by ~${bpReduction.toFixed(1)} mmHg.`);
    }
  }

  // --- Direct BP Change ---
  if (scenario.systolicBPChange && simInputs.systolicBP !== null) {
    const newBP = Math.max(simInputs.systolicBP + scenario.systolicBPChange, 85);
    simInputs.systolicBP = newBP;
    simVitals.systolicBP = newBP;
    assumptions.push(`Direct scenario applied: Systolic BP changed by ${scenario.systolicBPChange} mmHg.`);
  }

  // --- Direct Lipid Changes ---
  if (scenario.hdlChange && simInputs.hdl !== null) {
    const newHDL = Math.max(simInputs.hdl + scenario.hdlChange, 20);
    simInputs.hdl = newHDL;
    simVitals.hdl = newHDL;
    assumptions.push(`Direct scenario applied: HDL changed by ${scenario.hdlChange} mg/dL.`);
  }

  if (scenario.ldlChange && simInputs.totalCholesterol !== null) {
    // Total Cholesterol = HDL + LDL + (Triglycerides/5)
    // A drop in LDL corresponds 1:1 with a drop in Total Cholesterol
    const newTotal = Math.max(simInputs.totalCholesterol + scenario.ldlChange, 80);
    simInputs.totalCholesterol = newTotal;
    simVitals.totalCholesterol = newTotal;
    assumptions.push(`Direct scenario applied: LDL changed by ${scenario.ldlChange} mg/dL, causing equal change in Total Cholesterol.`);
  }

  // --- Smoking Cessation ---
  if (scenario.smokingQuit === true && simInputs.smokingStatus === true) {
    simInputs.smokingStatus = false;
    simVitals.smokingStatus = false;
    assumptions.push('Scenario applied: Patient quits smoking. (Note: CVD risk reduction from quitting occurs gradually over several years).');
  }

  // 4. Calculate simulated risk
  const simulatedRiskResult = calculateCVDRisk(simInputs);

  // Combine assumptions from both calculations
  const allAssumptions = Array.from(new Set([
    ...baselineRiskResult.assumptions,
    ...assumptions,
    ...(simulatedRiskResult.assumptions.filter(a => !baselineRiskResult.assumptions.includes(a)))
  ]));

  let deltaRisk: number | null = null;
  if (baselineRiskResult.riskPercent !== null && simulatedRiskResult.riskPercent !== null) {
    deltaRisk = simulatedRiskResult.riskPercent - baselineRiskResult.riskPercent;
    // Format to 1 decimal place safely
    deltaRisk = Math.round(deltaRisk * 10) / 10;
  }

  return {
    patientId,
    currentRisk: baselineRiskResult.riskPercent,
    simulatedRisk: simulatedRiskResult.riskPercent,
    deltaRisk,
    originalVitals,
    simulatedVitals: simVitals,
    assumptions: allAssumptions,
    missingData: baselineRiskResult.missingInputs,
    disclaimer: "This simulation uses generalized epidemiological assumptions (Framingham 2008) and is for educational illustration only. It does not replace clinical judgment or account for individual genetic/medical nuances."
  };
}
