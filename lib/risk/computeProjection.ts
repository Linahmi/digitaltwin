/**
 * lib/risk/computeProjection.ts
 *
 * Hackathon-grade cardiovascular risk projection from available biomarkers.
 * NOT clinical-grade. Illustrative only.
 *
 * Returns timeline data and a natural language summary string for the AI to use.
 */

export interface PatientBiomarkers {
  age: number | null
  gender: string | null
  ldl: number | null
  hdl: number | null
  systolicBP: number | null
  diastolicBP: number | null
  weight: number | null
  bmi: number | null
  glucose: number | null
  hba1c: number | null
  cardiovascularRiskFactors: string[]
}

export interface TrajectoryPoint {
  year: string
  current: number
  improved?: number
}

export interface ProjectionResult {
  baselineRisk: number       // % today
  projectedRisk10y: number   // % in 10 years (current trajectory)
  improvedRisk10y: number    // % in 10 years (improved lifestyle)
  trajectory: TrajectoryPoint[]
  summaryText: string        // for AI system prompt injection
  drivers: string[]          // top contributing factors
}

/**
 * Simple Framingham-inspired score (not validated, illustrative).
 * Each risk factor contributes 2–6 points. Sum capped at 50%.
 */
function computeBaselineRisk(bm: PatientBiomarkers): number {
  let score = 5 // baseline %

  // Age
  if (bm.age) {
    if (bm.age >= 60) score += 6
    else if (bm.age >= 50) score += 4
    else if (bm.age >= 40) score += 2
  }

  // Gender (males have higher baseline CV risk in Framingham)
  if (bm.gender === 'male') score += 2

  // LDL
  if (bm.ldl !== null) {
    if (bm.ldl >= 190) score += 6
    else if (bm.ldl >= 160) score += 4
    else if (bm.ldl >= 130) score += 2
  }

  // HDL (protective — decreases risk)
  if (bm.hdl !== null) {
    if (bm.hdl < 35) score += 4
    else if (bm.hdl < 40) score += 2
    else if (bm.hdl >= 60) score -= 2
  }

  // Blood Pressure
  if (bm.systolicBP !== null) {
    if (bm.systolicBP >= 160) score += 6
    else if (bm.systolicBP >= 140) score += 4
    else if (bm.systolicBP >= 130) score += 2
  }

  // BMI
  if (bm.bmi !== null) {
    if (bm.bmi >= 35) score += 4
    else if (bm.bmi >= 30) score += 3
    else if (bm.bmi >= 25) score += 1
  }

  // Glucose / pre-diabetes
  if (bm.glucose !== null) {
    if (bm.glucose >= 126) score += 4
    else if (bm.glucose >= 100) score += 2
  }

  // HbA1c
  if (bm.hba1c !== null) {
    if (bm.hba1c >= 6.5) score += 4
    else if (bm.hba1c >= 5.7) score += 2
  }

  return Math.min(Math.round(score), 50)
}

/** Annual risk escalation rate based on uncontrolled factors */
function annualDriftRate(bm: PatientBiomarkers): number {
  let rate = 0.5 // % per year baseline drift
  if (bm.ldl !== null && bm.ldl >= 160) rate += 0.6
  if (bm.systolicBP !== null && bm.systolicBP >= 140) rate += 0.5
  if (bm.bmi !== null && bm.bmi >= 30) rate += 0.4
  if (bm.glucose !== null && bm.glucose >= 100) rate += 0.3
  return rate
}

/** How much the improved scenario reduces annual drift */
function improvedAnnualDrift(bm: PatientBiomarkers): number {
  // Improved: assume significant lifestyle/medication interventions
  let rate = 0.1 // minimal baseline drift
  if (bm.ldl !== null && bm.ldl >= 160) rate -= 0.2   // statins reduce effectively
  if (bm.systolicBP !== null && bm.systolicBP >= 140) rate -= 0.1
  return Math.max(rate, -0.3) // can potentially decrease risk year on year
}

export function computeProjection(bm: PatientBiomarkers): ProjectionResult {
  const baseline = computeBaselineRisk(bm)
  const drift = annualDriftRate(bm)
  const improvedDrift = improvedAnnualDrift(bm)

  const years = [0, 2, 4, 6, 8, 10]
  const trajectory: TrajectoryPoint[] = years.map(y => {
    const label = y === 0 ? 'Today' : `${y} yrs`
    const current = Math.min(Math.round(baseline + drift * y), 75)
    const improved = Math.max(Math.round(baseline + improvedDrift * y), 5)
    return y === 0
      ? { year: label, current, improved }
      : { year: label, current, improved }
  })

  const projected10y = trajectory[5].current
  const improved10y = trajectory[5].improved!

  // Identify key drivers
  const drivers: string[] = []
  if (bm.ldl !== null && bm.ldl >= 130) drivers.push(`LDL ${Math.round(bm.ldl)} mg/dL`)
  if (bm.systolicBP !== null && bm.systolicBP >= 130) drivers.push(`BP ${Math.round(bm.systolicBP)}/${bm.diastolicBP ? Math.round(bm.diastolicBP) : '?'} mmHg`)
  if (bm.bmi !== null && bm.bmi >= 25) drivers.push(`BMI ${bm.bmi.toFixed(1)}`)
  if (bm.glucose !== null && bm.glucose >= 100) drivers.push(`Glucose ${Math.round(bm.glucose)} mg/dL`)

  const summaryText = buildSummaryText(bm, baseline, projected10y, improved10y, drivers)

  return {
    baselineRisk: baseline,
    projectedRisk10y: projected10y,
    improvedRisk10y: improved10y,
    trajectory,
    summaryText,
    drivers,
  }
}

function buildSummaryText(
  bm: PatientBiomarkers,
  baseline: number,
  projected: number,
  improved: number,
  drivers: string[]
): string {
  const ldlStr = bm.ldl !== null ? `LDL of ${Math.round(bm.ldl)} mg/dL` : null
  const bpStr = bm.systolicBP !== null ? `blood pressure of ${Math.round(bm.systolicBP)}/${bm.diastolicBP ? Math.round(bm.diastolicBP) : '?'} mmHg` : null
  const weightStr = bm.weight !== null ? `weight of ${bm.weight.toFixed(0)} kg` : null
  const bmiStr = bm.bmi !== null ? `BMI of ${bm.bmi.toFixed(1)}` : null

  const parts = [ldlStr, bpStr, weightStr ?? bmiStr].filter(Boolean)
  const factorString = parts.length > 0 ? `Based on your ${parts.join(', ')}, ` : ''

  return `${factorString}your estimated cardiovascular risk is around ${baseline}% today. If current trends continue, this may rise to approximately ${projected}% in 10 years. With targeted lifestyle and medication improvements, this could be reduced to around ${improved}% — a difference of ${projected - improved} percentage points. Projection is illustrative and based on available patient data.`
}
