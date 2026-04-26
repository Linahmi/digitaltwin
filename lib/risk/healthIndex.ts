/**
 * lib/risk/healthIndex.ts
 * 
 * Logic for calculating "System Integrity" scores (0-100)
 * based on clinical biomarkers. This provides a human-readable 
 * representation of "health status" for different body systems.
 */

export interface SystemIntegrity {
  head: number;      // Neurovascular
  chest: number;     // Cardiac
  metabolic: number; // Abdominal
}

/**
 * Calculates integrity for the neurovascular system (Head)
 * Primary drivers: Blood Pressure
 */
export function calculateHeadIntegrity(sbp: number | null, dbp: number | null): number {
  if (sbp === null || dbp === null) return 85; // Baseline if missing

  // Ideal: 115/75
  const sbpScore = Math.max(0, 100 - Math.abs(sbp - 115) * 1.5);
  const dbpScore = Math.max(0, 100 - Math.abs(dbp - 75) * 2.0);

  // Severe penalty for hypertensive crisis
  if (sbp > 180 || dbp > 120) return 15;

  return Math.round((sbpScore * 0.6) + (dbpScore * 0.4));
}

/**
 * Calculates integrity for the cardiac system (Chest)
 * Primary drivers: Heart Rate, Lipid Profile (LDL/HDL)
 */
export function calculateChestIntegrity(
  heartRate: number | null, 
  ldl: number | null, 
  hdl: number | null
): number {
  let score = 100;

  // Heart Rate Penalty (Ideal: 60-75)
  if (heartRate) {
    if (heartRate < 50 || heartRate > 100) score -= 30;
    else if (heartRate > 85 || heartRate < 55) score -= 15;
  } else {
    score -= 10; // Penalty for missing data
  }

  // Lipid Penalty (LDL Ideal: <100)
  if (ldl) {
    if (ldl > 190) score -= 40;
    else if (ldl > 160) score -= 25;
    else if (ldl > 130) score -= 10;
  }

  // HDL Bonus/Penalty (Ideal: >60)
  if (hdl) {
    if (hdl < 40) score -= 15;
    if (hdl > 60) score += 5;
  }

  return Math.max(5, Math.min(100, Math.round(score)));
}

/**
 * Calculates integrity for the metabolic system (Abdomen)
 * Primary drivers: Glucose, HbA1c, BMI
 */
export function calculateMetabolicIntegrity(
  glucose: number | null, 
  hba1c: number | null, 
  bmi: number | null
): number {
  let score = 100;

  // Glucose (Ideal: 70-99)
  if (glucose) {
    if (glucose > 200) score -= 50;
    else if (glucose > 126) score -= 30;
    else if (glucose > 100) score -= 10;
  }

  // HbA1c (Ideal: <5.7)
  if (hba1c) {
    if (hba1c > 8.0) score -= 60;
    else if (hba1c > 6.5) score -= 40;
    else if (hba1c > 5.7) score -= 15;
  }

  // BMI (Ideal: 18.5 - 25)
  if (bmi) {
    if (bmi > 35) score -= 30;
    else if (bmi > 30) score -= 20;
    else if (bmi > 25) score -= 10;
    else if (bmi < 18.5) score -= 10;
  }

  return Math.max(5, Math.min(100, Math.round(score)));
}
