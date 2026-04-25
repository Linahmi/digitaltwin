// ── Types ─────────────────────────────────────────────────────────────────────

export type Domain = 'cardiovascular' | 'metabolic' | 'lifestyle'

export interface PatientSnapshot {
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
}

export interface CardConfig {
  id: string
  label: string
  icon: string
  accent: string
  getValue(snap: PatientSnapshot): { display: string; status: CardStatus; statusLabel: string }
}

export type CardStatus = 'good' | 'borderline' | 'elevated'

export interface SimOption {
  id: string
  label: string
  riskReduction: number
  note: string
}

export interface TrajectoryPoint {
  year: string
  current: number
  improved?: number
}

export interface DomainDef {
  label: string
  yLabel: string
  cards: CardConfig[]
  sims: SimOption[]
  getBaseRisk(snap: PatientSnapshot): number
}

// ── Domain detection ──────────────────────────────────────────────────────────

const CV_KEYWORDS = [
  'heart', 'cardiovascular', 'blood pressure', 'cholesterol', 'ldl', 'stroke',
  'heart attack', 'cardiac', 'coronary', 'hdl', 'triglyceride', 'statin',
  'systolic', 'diastolic', 'artery', 'vascular', 'myocardial',
]
const METABOLIC_KEYWORDS = [
  'diabetes', 'glucose', 'hba1c', 'prediabetes', 'sugar', 'insulin',
  'metabolism', 'metabolic', 'a1c', 'blood sugar', 'type 2', 'type2',
]
const LIFESTYLE_KEYWORDS = [
  'diet', 'sleep', 'stress', 'smoking', 'lifestyle', 'future', '10 years',
  'exercise', 'alcohol', 'sedentary', 'activity', 'habits', 'weight',
  'predict', 'trajectory', 'long term', 'long-term', 'continue', 'if i keep',
  'over time', 'eventually',
]

export function getHealthDomain(text: string): Domain | null {
  const lower = text.toLowerCase()
  const cv  = CV_KEYWORDS.filter(kw => lower.includes(kw)).length
  const met = METABOLIC_KEYWORDS.filter(kw => lower.includes(kw)).length
  const ls  = LIFESTYLE_KEYWORDS.filter(kw => lower.includes(kw)).length
  const max = Math.max(cv, met, ls)
  if (max === 0) return null
  if (cv === max) return 'cardiovascular'
  if (met === max) return 'metabolic'
  return 'lifestyle'
}

// ── Simulation scenario detection ─────────────────────────────────────────────

const SIM_PATTERNS: { id: string; keywords: string[] }[] = [
  { id: 'lose_weight',  keywords: ['lose weight', 'lose 10', 'weight loss', 'lose kg', 'shed'] },
  { id: 'quit_smoking', keywords: ['quit smoking', 'stop smoking', 'no smoking', 'smoke'] },
  { id: 'lower_ldl',   keywords: ['lower ldl', 'reduce ldl', 'ldl 100', 'statin', 'cholesterol'] },
  { id: 'exercise',    keywords: ['exercise', 'workout', 'physical activity', 'gym', 'running', 'walk'] },
  { id: 'diet',        keywords: ['improve diet', 'better diet', 'mediterranean', 'reduce sugar', 'less sugar', 'eat better'] },
  { id: 'sleep',       keywords: ['sleep', 'rest', 'insomnia'] },
  { id: 'stress',      keywords: ['stress', 'anxiety', 'relax', 'meditate'] },
]

export function getSimulationScenario(text: string): string | null {
  const lower = text.toLowerCase()
  for (const p of SIM_PATTERNS) {
    if (p.keywords.some(kw => lower.includes(kw))) return p.id
  }
  return null
}

// ── Trajectory builder ────────────────────────────────────────────────────────

export function buildTrajectory(baseRisk: number, totalReduction = 0): TrajectoryPoint[] {
  const drift = baseRisk >= 30 ? 1.8 : baseRisk >= 20 ? 1.4 : 1.0
  const improvedDrift = Math.max(drift - totalReduction / 8, -0.5)
  return [0, 2, 4, 6, 8, 10].map(y => ({
    year:    y === 0 ? 'Today' : `${y} yrs`,
    current: Math.min(Math.round(baseRisk + drift * y), 90),
    improved: Math.max(Math.round(baseRisk + improvedDrift * y), 3),
  }))
}

// ── Risk calculators ──────────────────────────────────────────────────────────

function cvBaseRisk(s: PatientSnapshot): number {
  let r = 5
  if (s.age) {
    if (s.age >= 60) r += 6; else if (s.age >= 50) r += 4; else if (s.age >= 40) r += 2
  }
  if (s.gender === 'male') r += 2
  if (s.ldl !== null) {
    if (s.ldl >= 190) r += 6; else if (s.ldl >= 160) r += 4; else if (s.ldl >= 130) r += 2
  }
  if (s.hdl !== null) {
    if (s.hdl < 35) r += 4; else if (s.hdl < 40) r += 2; else if (s.hdl >= 60) r -= 2
  }
  if (s.systolicBP !== null) {
    if (s.systolicBP >= 160) r += 6; else if (s.systolicBP >= 140) r += 4; else if (s.systolicBP >= 130) r += 2
  }
  if (s.bmi !== null) {
    if (s.bmi >= 35) r += 4; else if (s.bmi >= 30) r += 3; else if (s.bmi >= 25) r += 1
  }
  return Math.min(r, 50)
}

function metabolicBaseRisk(s: PatientSnapshot): number {
  let r = 5
  if (s.glucose !== null) {
    if (s.glucose >= 126) r += 20; else if (s.glucose >= 100) r += 10
  }
  if (s.hba1c !== null) {
    if (s.hba1c >= 6.5) r += 20; else if (s.hba1c >= 5.7) r += 10
  }
  if (s.bmi !== null) {
    if (s.bmi >= 30) r += 8; else if (s.bmi >= 25) r += 4
  }
  if (s.age && s.age >= 45) r += 5
  return Math.min(r, 70)
}

function lifestyleBaseRisk(s: PatientSnapshot): number {
  return Math.round((cvBaseRisk(s) + metabolicBaseRisk(s)) / 2)
}

// ── Card configs ──────────────────────────────────────────────────────────────

const CARD_CV_RISK: CardConfig = {
  id: 'cvRisk', label: 'Cardiovascular Risk', icon: '❤️', accent: '#ef4444',
  getValue(s) {
    const v = cvBaseRisk(s)
    return { display: `${v}%`, status: v >= 20 ? 'elevated' : v >= 10 ? 'borderline' : 'good', statusLabel: v >= 20 ? 'Elevated' : v >= 10 ? 'Moderate' : 'Low' }
  },
}

const CARD_LDL: CardConfig = {
  id: 'ldl', label: 'LDL Cholesterol', icon: '🧬', accent: '#f59e0b',
  getValue(s) {
    if (s.ldl === null) return { display: '—', status: 'good', statusLabel: 'No data' }
    const v = Math.round(s.ldl)
    return { display: `${v} mg/dL`, status: v >= 160 ? 'elevated' : v >= 130 ? 'borderline' : 'good', statusLabel: v >= 160 ? 'Elevated' : v >= 130 ? 'Borderline' : 'Optimal' }
  },
}

const CARD_BP: CardConfig = {
  id: 'bp', label: 'Blood Pressure', icon: '💉', accent: '#8b5cf6',
  getValue(s) {
    if (s.systolicBP === null) return { display: '—', status: 'good', statusLabel: 'No data' }
    const sys = Math.round(s.systolicBP)
    const dia = s.diastolicBP !== null ? Math.round(s.diastolicBP) : '?'
    return { display: `${sys}/${dia}`, status: sys >= 140 ? 'elevated' : sys >= 130 ? 'borderline' : 'good', statusLabel: sys >= 140 ? 'Hypertension' : sys >= 130 ? 'Elevated' : 'Normal' }
  },
}

const CARD_BMI: CardConfig = {
  id: 'bmi', label: 'Weight / BMI', icon: '⚖️', accent: '#06b6d4',
  getValue(s) {
    if (s.bmi === null && s.weight === null) return { display: '—', status: 'good', statusLabel: 'No data' }
    const bmiVal = s.bmi ?? 25
    const display = s.bmi !== null ? `BMI ${s.bmi.toFixed(1)}` : `${Math.round(s.weight!)} kg`
    return { display, status: bmiVal >= 30 ? 'elevated' : bmiVal >= 25 ? 'borderline' : 'good', statusLabel: bmiVal >= 30 ? 'Obese' : bmiVal >= 25 ? 'Overweight' : 'Normal' }
  },
}

const CARD_GLUCOSE: CardConfig = {
  id: 'glucose', label: 'Fasting Glucose', icon: '🍬', accent: '#f59e0b',
  getValue(s) {
    if (s.glucose === null) return { display: '—', status: 'good', statusLabel: 'No data' }
    const v = Math.round(s.glucose)
    return { display: `${v} mg/dL`, status: v >= 126 ? 'elevated' : v >= 100 ? 'borderline' : 'good', statusLabel: v >= 126 ? 'Diabetic range' : v >= 100 ? 'Prediabetes' : 'Normal' }
  },
}

const CARD_HBA1C: CardConfig = {
  id: 'hba1c', label: 'HbA1c', icon: '🔬', accent: '#ef4444',
  getValue(s) {
    if (s.hba1c === null) return { display: '—', status: 'good', statusLabel: 'No data' }
    const v = s.hba1c.toFixed(1)
    return { display: `${v}%`, status: s.hba1c >= 6.5 ? 'elevated' : s.hba1c >= 5.7 ? 'borderline' : 'good', statusLabel: s.hba1c >= 6.5 ? 'Diabetic' : s.hba1c >= 5.7 ? 'Prediabetes' : 'Normal' }
  },
}

const CARD_ACTIVITY: CardConfig = {
  id: 'activity', label: 'Lifestyle Activity', icon: '🏃', accent: '#10b981',
  getValue(_s) {
    return { display: 'Low', status: 'elevated', statusLabel: 'Sedentary pattern' }
  },
}

const CARD_OVERALL: CardConfig = {
  id: 'overallRisk', label: 'Overall Risk', icon: '📊', accent: '#ef4444',
  getValue(s) {
    const v = lifestyleBaseRisk(s)
    return { display: `${v}%`, status: v >= 25 ? 'elevated' : v >= 15 ? 'borderline' : 'good', statusLabel: v >= 25 ? 'Elevated' : v >= 15 ? 'Moderate' : 'Low' }
  },
}

// ── Domain registry ───────────────────────────────────────────────────────────

export const DOMAINS: Record<Domain, DomainDef> = {
  cardiovascular: {
    label: 'Cardiovascular Health',
    yLabel: 'CV Risk %',
    cards: [CARD_CV_RISK, CARD_LDL, CARD_BP, CARD_BMI],
    sims: [
      { id: 'lose_weight', label: 'Lose 10 kg',        riskReduction: 5, note: '−5% CVD risk' },
      { id: 'lower_ldl',  label: 'Lower LDL to 100',  riskReduction: 7, note: '−7% CVD risk' },
      { id: 'exercise',   label: 'Exercise 3×/week',   riskReduction: 5, note: '−5% CVD risk' },
      { id: 'sodium',     label: 'Reduce sodium',      riskReduction: 3, note: '−3% CVD risk' },
    ],
    getBaseRisk: cvBaseRisk,
  },
  metabolic: {
    label: 'Metabolic Health',
    yLabel: 'Metabolic Risk %',
    cards: [CARD_GLUCOSE, CARD_HBA1C, CARD_BMI, CARD_ACTIVITY],
    sims: [
      { id: 'reduce_sugar', label: 'Reduce sugar',      riskReduction: 6, note: '−6% diabetes risk' },
      { id: 'lose_weight',  label: 'Lose 10 kg',        riskReduction: 8, note: '−8% diabetes risk' },
      { id: 'exercise',     label: 'Exercise 3×/week',  riskReduction: 7, note: '−7% diabetes risk' },
      { id: 'diet',         label: 'Improve diet',      riskReduction: 5, note: '−5% diabetes risk' },
    ],
    getBaseRisk: metabolicBaseRisk,
  },
  lifestyle: {
    label: 'Lifestyle & General Health',
    yLabel: 'Overall Risk %',
    cards: [CARD_BMI, CARD_BP, CARD_GLUCOSE, CARD_OVERALL],
    sims: [
      { id: 'quit_smoking', label: 'Quit smoking',    riskReduction: 8, note: '−8% overall risk' },
      { id: 'sleep',        label: 'Improve sleep',   riskReduction: 4, note: '−4% overall risk' },
      { id: 'stress',       label: 'Reduce stress',   riskReduction: 3, note: '−3% overall risk' },
      { id: 'diet',         label: 'Improve diet',    riskReduction: 5, note: '−5% overall risk' },
    ],
    getBaseRisk: lifestyleBaseRisk,
  },
}

// Fallback snapshot used when patient data isn't loaded yet
export const DEFAULT_SNAPSHOT: PatientSnapshot = {
  age: 52, gender: 'male',
  ldl: 158, hdl: 42,
  systolicBP: 138, diastolicBP: 85,
  weight: 88, bmi: 27.5,
  glucose: 102, hba1c: 5.9,
}
