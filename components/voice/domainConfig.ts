// ── Core types ────────────────────────────────────────────────────────────────

export type Domain     = 'cardiovascular' | 'metabolic' | 'lifestyle' | 'medication'
export type CardStatus = 'good' | 'borderline' | 'elevated'

export interface PatientSnapshot {
  age:         number | null
  gender:      string | null
  ldl:         number | null
  hdl:         number | null
  systolicBP:  number | null
  diastolicBP: number | null
  weight:      number | null
  bmi:         number | null
  glucose:     number | null
  hba1c:       number | null
}

export interface SparkPoint  { t: string; v: number }
export interface DetailPoint { year: string; current: number; improved?: number }

export interface CardSimulation {
  id:           string
  label:        string
  riskReduction: number   // overall risk pts
  metricDelta:  number    // this card's own metric improvement
  note:         string
}

export interface CardDef {
  id:          string
  label:       string
  icon:        string
  accent:      string
  caption:     string   // short one-line narration shown in the subtitle strip
  getValue(snap: PatientSnapshot): { display: string; status: CardStatus; statusLabel: string }
  getExplanation(snap: PatientSnapshot): string
  simulations: CardSimulation[]
}

export interface DomainDef {
  label: string
  cards: CardDef[]
}

// ── Domain detection ──────────────────────────────────────────────────────────

const CV_KW   = ['heart','cardiovascular','cholesterol','ldl','blood pressure','stroke','heart attack','hypertension','coronary','artery','systolic','hdl','statin','triglyceride']
const MET_KW  = ['diabetes','glucose','sugar','hba1c','prediabetes','insulin','metabolism','metabolic','a1c','blood sugar','type 2','type2']
const LS_KW   = ['diet','sleep','stress','smoking','exercise','energy','lifestyle','future','10 years','activity','habits','weight','long term','predict','trajectory','continue','if i keep','over time']
const MED_KW  = ['medication','meds','treatment','statin','lisinopril','atorvastatin','medicine','pills','prescription','drug','adherence','dose']

export function getHealthDomain(text: string): Domain | null {
  const lo = text.toLowerCase()
  const cv  = CV_KW.filter(k  => lo.includes(k)).length
  const met = MET_KW.filter(k => lo.includes(k)).length
  const ls  = LS_KW.filter(k  => lo.includes(k)).length
  const med = MED_KW.filter(k => lo.includes(k)).length
  const max = Math.max(cv, met, ls, med)
  if (max === 0) return null
  if (cv  === max) return 'cardiovascular'
  if (met === max) return 'metabolic'
  if (med === max) return 'medication'
  return 'lifestyle'
}

export function getSimulationScenario(text: string): string | null {
  const lo = text.toLowerCase()
  const patterns = [
    { id: 'lose_weight',  kws: ['lose weight','lose 10','weight loss','shed','lose kg'] },
    { id: 'quit_smoking', kws: ['quit smoking','stop smoking','no smoking'] },
    { id: 'lower_ldl',   kws: ['lower ldl','reduce ldl','ldl 100','statin','cholesterol'] },
    { id: 'exercise',    kws: ['exercise','workout','physical activity','gym','running'] },
    { id: 'diet',        kws: ['improve diet','better diet','mediterranean','reduce sugar','less sugar'] },
    { id: 'sleep',       kws: ['sleep','rest','insomnia'] },
    { id: 'stress',      kws: ['stress','anxiety','relax','meditate'] },
  ]
  for (const p of patterns) if (p.kws.some(k => lo.includes(k))) return p.id
  return null
}

// ── Risk calculators ──────────────────────────────────────────────────────────

export function cvBaseRisk(s: PatientSnapshot): number {
  let r = 5
  if (s.age) { if (s.age >= 60) r += 6; else if (s.age >= 50) r += 4; else if (s.age >= 40) r += 2 }
  if (s.gender === 'male') r += 2
  if (s.ldl !== null) { if (s.ldl >= 190) r += 6; else if (s.ldl >= 160) r += 4; else if (s.ldl >= 130) r += 2 }
  if (s.hdl !== null) { if (s.hdl < 35) r += 4; else if (s.hdl < 40) r += 2; else if (s.hdl >= 60) r -= 2 }
  if (s.systolicBP !== null) { if (s.systolicBP >= 160) r += 6; else if (s.systolicBP >= 140) r += 4; else if (s.systolicBP >= 130) r += 2 }
  if (s.bmi !== null) { if (s.bmi >= 35) r += 4; else if (s.bmi >= 30) r += 3; else if (s.bmi >= 25) r += 1 }
  return Math.min(r, 50)
}

export function metBaseRisk(s: PatientSnapshot): number {
  let r = 5
  if (s.glucose !== null) { if (s.glucose >= 126) r += 20; else if (s.glucose >= 100) r += 10 }
  if (s.hba1c  !== null) { if (s.hba1c  >= 6.5) r += 20; else if (s.hba1c  >= 5.7) r += 10 }
  if (s.bmi    !== null) { if (s.bmi    >= 30)   r += 8;  else if (s.bmi    >= 25)  r += 4 }
  if (s.age && s.age >= 45) r += 5
  return Math.min(r, 70)
}

function overallRisk(s: PatientSnapshot): number {
  return Math.round((cvBaseRisk(s) + metBaseRisk(s)) / 2)
}

// ── Sparkline builder ─────────────────────────────────────────────────────────
// Returns 6 data points showing projected trend over 10 years without intervention.

export function buildSparkline(cardId: string, snap: PatientSnapshot): SparkPoint[] {
  const yrs = [0, 2, 4, 6, 8, 10]
  const pts = (base: number, drift: number, min = 0, max = 200) =>
    yrs.map(y => ({ t: y === 0 ? 'Now' : `+${y}y`, v: Math.min(Math.max(Math.round(base + drift * y), min), max) }))
  switch (cardId) {
    case 'cvRisk':      { const r = cvBaseRisk(snap);  return pts(r, r >= 25 ? 1.8 : 1.2, 0, 90) }
    case 'diabetesRisk':{ const r = metBaseRisk(snap); return pts(r, r >= 30 ? 2.0 : 1.5, 0, 90) }
    case 'overallRisk': { const r = overallRisk(snap); return pts(r, r >= 25 ? 1.6 : 1.1, 0, 90) }
    case 'ldl':         return pts(snap.ldl  ?? 130,  2.5,   40, 280)
    case 'bp':          return pts(snap.systolicBP ?? 125, 1.0, 80, 180)
    case 'bmi':         return yrs.map(y => ({ t: y === 0 ? 'Now' : `+${y}y`, v: Math.min(+(((snap.bmi ?? 26) + y * 0.22)).toFixed(1), 45) }))
    case 'glucose':     return pts(snap.glucose ?? 95, 2.0, 60, 220)
    case 'hba1c':       return yrs.map(y => ({ t: y === 0 ? 'Now' : `+${y}y`, v: Math.min(+((snap.hba1c ?? 5.5) + y * 0.13).toFixed(1), 12) }))
    case 'sleepStress': return pts(62, -2.5, 20, 100)   // score declining without intervention
    case 'activityDiet':return pts(55, -1.8, 20, 100)
    case 'adherence':   return pts(78, -2.0, 30, 100)
    case 'benefit':     return pts(18, 0.8,  0, 60)     // expected benefit accumulates
    case 'monitoring':  return pts(22, 0.3,  0, 100)
    case 'biomarkers':  return pts(snap.ldl ?? 130, 2.0, 40, 280)
    default:            return pts(20, 1.0, 0, 100)
  }
}

// ── Detail chart builder ──────────────────────────────────────────────────────
// Returns same trend + improved line when simulations are applied.

export function buildDetailChart(
  cardId: string,
  snap: PatientSnapshot,
  appliedSims: Set<string>,
  cardSims: CardSimulation[],
): DetailPoint[] {
  const spark = buildSparkline(cardId, snap)
  const totalDelta = Array.from(appliedSims)
    .reduce((sum, id) => sum + (cardSims.find(s => s.id === id)?.metricDelta ?? 0), 0)
  if (totalDelta === 0) {
    return spark.map(p => ({ year: p.t, current: p.v }))
  }
  const base    = spark[0].v
  const target  = Math.max(base - totalDelta, 3)
  const curDrift = (spark[5].v - spark[0].v) / 5
  const impDrift = Math.max(curDrift * 0.25, -0.5)
  return spark.map((p, i) => ({
    year:    p.t,
    current: p.v,
    improved: Math.max(Math.round(target + impDrift * i), 3),
  }))
}

// ── Card definitions ──────────────────────────────────────────────────────────

function bmiDisplay(s: PatientSnapshot) {
  if (s.bmi === null && s.weight === null) return { display: '—', status: 'good' as CardStatus, statusLabel: 'No data' }
  const b = s.bmi ?? 25
  return {
    display:     s.bmi !== null ? `BMI ${s.bmi.toFixed(1)}` : `${Math.round(s.weight!)} kg`,
    status:      (b >= 30 ? 'elevated' : b >= 25 ? 'borderline' : 'good') as CardStatus,
    statusLabel: b >= 30 ? 'Obese' : b >= 25 ? 'Overweight' : 'Normal',
  }
}

// cardiovascular cards
const C_RISK: CardDef = {
  id: 'cvRisk', label: 'Cardiovascular Risk', icon: '❤️', accent: '#8b5cf6',
  caption: 'Your cardiovascular risk is elevated based on current biomarkers.',
  getValue(s) {
    const v = cvBaseRisk(s)
    return { display: `${v}%`, status: v >= 20 ? 'elevated' : v >= 10 ? 'borderline' : 'good', statusLabel: v >= 20 ? 'Elevated' : v >= 10 ? 'Moderate' : 'Low' }
  },
  getExplanation(s) {
    const v = cvBaseRisk(s)
    return `Your estimated 10-year cardiovascular risk is ${v}%. ${v >= 20 ? 'This is in the high-risk range — lifestyle changes and medical review are recommended.' : v >= 10 ? 'This is a moderate risk. Monitoring key biomarkers and making incremental improvements can meaningfully reduce this.' : 'This is a low risk. Maintaining your current lifestyle will help keep it that way.'}`
  },
  simulations: [
    { id: 'lifestyle', label: 'Improve lifestyle',  riskReduction: 8,  metricDelta: 8,  note: '−8% CVD risk' },
    { id: 'lose10',    label: 'Lose 10 kg',          riskReduction: 5,  metricDelta: 5,  note: '−5% CVD risk' },
    { id: 'smoking',   label: 'Quit smoking',         riskReduction: 10, metricDelta: 10, note: '−10% CVD risk' },
  ],
}
const C_LDL: CardDef = {
  id: 'ldl', label: 'LDL Cholesterol', icon: '🧬', accent: '#f59e0b',
  caption: 'LDL cholesterol is the primary driver of your cardiovascular risk.',
  getValue(s) {
    if (s.ldl === null) return { display: '—', status: 'good', statusLabel: 'No data' }
    const v = Math.round(s.ldl)
    return { display: `${v} mg/dL`, status: v >= 160 ? 'elevated' : v >= 130 ? 'borderline' : 'good', statusLabel: v >= 160 ? 'High' : v >= 130 ? 'Borderline' : 'Optimal' }
  },
  getExplanation(s) {
    const v = s.ldl !== null ? Math.round(s.ldl) : null
    if (!v) return 'LDL data is not available. Consider requesting a lipid panel at your next visit.'
    return `Your LDL is ${v} mg/dL. ${v >= 160 ? 'This is elevated. Each 39 mg/dL reduction in LDL cuts cardiovascular risk by roughly 22%.' : v >= 130 ? 'This is borderline-high. Diet changes and, if needed, medication can bring it to optimal levels.' : 'This is optimal. Maintaining a heart-healthy diet helps keep LDL in this range.'}`
  },
  simulations: [
    { id: 'lowerLdl',  label: 'Lower LDL to 100',   riskReduction: 7, metricDelta: 58, note: '−58 mg/dL' },
    { id: 'diet',      label: 'Improve diet',         riskReduction: 4, metricDelta: 20, note: '−20 mg/dL' },
    { id: 'statins',   label: 'Medication adherence', riskReduction: 6, metricDelta: 40, note: '−40 mg/dL' },
  ],
}
const C_BP: CardDef = {
  id: 'bp', label: 'Blood Pressure', icon: '💉', accent: '#06b6d4',
  caption: 'Blood pressure adds significant cardiovascular strain over time.',
  getValue(s) {
    if (s.systolicBP === null) return { display: '—', status: 'good', statusLabel: 'No data' }
    const sys = Math.round(s.systolicBP), dia = s.diastolicBP !== null ? Math.round(s.diastolicBP) : '?'
    return { display: `${sys}/${dia}`, status: sys >= 140 ? 'elevated' : sys >= 130 ? 'borderline' : 'good', statusLabel: sys >= 140 ? 'Hypertension' : sys >= 130 ? 'Elevated' : 'Normal' }
  },
  getExplanation(s) {
    const sys = s.systolicBP !== null ? Math.round(s.systolicBP) : null
    if (!sys) return 'Blood pressure data is not available. Regular monitoring is recommended.'
    return `Your systolic blood pressure is ${sys} mmHg. ${sys >= 140 ? 'Stage 2 hypertension significantly increases stroke and heart disease risk. Sodium reduction and exercise can lower it meaningfully.' : sys >= 130 ? 'Stage 1 hypertension. Lifestyle modifications like low-sodium diet and regular exercise can reduce it.' : 'Normal range. Regular monitoring helps catch any changes early.'}`
  },
  simulations: [
    { id: 'sodium',   label: 'Reduce sodium',   riskReduction: 3, metricDelta: 6,  note: '−6 mmHg' },
    { id: 'exercise', label: 'Exercise 3×/week', riskReduction: 5, metricDelta: 8,  note: '−8 mmHg' },
    { id: 'sleep',    label: 'Improve sleep',    riskReduction: 3, metricDelta: 5,  note: '−5 mmHg' },
  ],
}
const C_BMI: CardDef = {
  id: 'bmi', label: 'Weight / BMI', icon: '⚖️', accent: '#10b981',
  caption: 'Weight is a key modifiable factor in your health risk.',
  getValue: bmiDisplay,
  getExplanation(s) {
    const b = s.bmi
    if (!b) return 'Weight/BMI data not available. Tracking weight trends over time is a valuable health signal.'
    return `Your BMI is ${b.toFixed(1)}. ${b >= 30 ? 'Obesity is one of the strongest modifiable risk factors for cardiovascular disease and diabetes. Even a 5–10% weight reduction significantly improves outcomes.' : b >= 25 ? 'You are in the overweight range. Weight reduction through diet and exercise can improve blood pressure, LDL, and glucose.' : 'Your BMI is in the healthy range. Maintaining this through regular activity and a balanced diet is key.'}`
  },
  simulations: [
    { id: 'lose5',     label: 'Lose 5 kg',         riskReduction: 3, metricDelta: 1.5, note: '−1.5 BMI pts' },
    { id: 'lose10',    label: 'Lose 10 kg',         riskReduction: 5, metricDelta: 3.0, note: '−3 BMI pts' },
    { id: 'activity',  label: 'Increase activity',  riskReduction: 4, metricDelta: 2.0, note: '−2 BMI pts' },
  ],
}

// metabolic cards
const M_DRISK: CardDef = {
  id: 'diabetesRisk', label: 'Diabetes Risk', icon: '📊', accent: '#8b5cf6',
  caption: 'Your metabolic profile shows elevated diabetes risk.',
  getValue(s) {
    const v = metBaseRisk(s)
    return { display: `${v}%`, status: v >= 30 ? 'elevated' : v >= 15 ? 'borderline' : 'good', statusLabel: v >= 30 ? 'High risk' : v >= 15 ? 'Moderate' : 'Low' }
  },
  getExplanation(s) {
    const v = metBaseRisk(s)
    return `Your estimated diabetes risk score is ${v}%. ${v >= 30 ? 'This indicates high risk for developing type 2 diabetes. Proactive intervention — diet, exercise, and regular HbA1c monitoring — is strongly advised.' : v >= 15 ? 'You have moderate risk factors. Lifestyle adjustments now can prevent progression to prediabetes.' : 'Your metabolic risk is low. Continue monitoring glucose and maintaining a healthy weight.'}`
  },
  simulations: [
    { id: 'lifestyle', label: 'Improve lifestyle',  riskReduction: 8,  metricDelta: 8,  note: '−8% risk' },
    { id: 'lose10',    label: 'Lose 10 kg',          riskReduction: 9,  metricDelta: 9,  note: '−9% risk' },
    { id: 'exercise',  label: 'Exercise program',    riskReduction: 7,  metricDelta: 7,  note: '−7% risk' },
  ],
}
const M_GLUCOSE: CardDef = {
  id: 'glucose', label: 'Fasting Glucose', icon: '🍬', accent: '#f59e0b',
  caption: 'Fasting glucose is trending toward prediabetes range.',
  getValue(s) {
    if (s.glucose === null) return { display: '—', status: 'good', statusLabel: 'No data' }
    const v = Math.round(s.glucose)
    return { display: `${v} mg/dL`, status: v >= 126 ? 'elevated' : v >= 100 ? 'borderline' : 'good', statusLabel: v >= 126 ? 'Diabetic' : v >= 100 ? 'Prediabetes' : 'Normal' }
  },
  getExplanation(s) {
    const v = s.glucose !== null ? Math.round(s.glucose) : null
    if (!v) return 'Fasting glucose data is not available. A fasting glucose test at your next checkup is recommended.'
    return `Your fasting glucose is ${v} mg/dL. ${v >= 126 ? 'This is in the diabetic range. Medical review and dietary intervention are important.' : v >= 100 ? 'Prediabetes range. Reducing refined carbohydrates and increasing exercise can normalize glucose levels.' : 'Normal. Maintaining a low-sugar diet protects your metabolic health long-term.'}`
  },
  simulations: [
    { id: 'sugar',    label: 'Reduce sugar intake',  riskReduction: 5, metricDelta: 12, note: '−12 mg/dL' },
    { id: 'diet',     label: 'Improve diet',          riskReduction: 4, metricDelta: 10, note: '−10 mg/dL' },
    { id: 'exercise', label: 'Exercise 3×/week',      riskReduction: 5, metricDelta: 15, note: '−15 mg/dL' },
  ],
}
const M_HBA1C: CardDef = {
  id: 'hba1c', label: 'HbA1c', icon: '🔬', accent: '#ef4444',
  caption: 'HbA1c reflects your 3-month average blood sugar.',
  getValue(s) {
    if (s.hba1c === null) return { display: '—', status: 'good', statusLabel: 'No data' }
    const v = s.hba1c.toFixed(1)
    return { display: `${v}%`, status: s.hba1c >= 6.5 ? 'elevated' : s.hba1c >= 5.7 ? 'borderline' : 'good', statusLabel: s.hba1c >= 6.5 ? 'Diabetic' : s.hba1c >= 5.7 ? 'Prediabetes' : 'Normal' }
  },
  getExplanation(s) {
    if (!s.hba1c) return 'HbA1c data is not available. This 3-month average blood sugar marker is a key diabetes diagnostic.'
    const v = s.hba1c.toFixed(1)
    return `Your HbA1c is ${v}%. ${s.hba1c >= 6.5 ? 'This confirms diabetes. Consistent medication adherence and diet change can bring it toward the 6.5% target.' : s.hba1c >= 5.7 ? 'Prediabetes range. A 0.5% reduction through diet and exercise substantially lowers your 5-year diabetes risk.' : 'Normal range. This reflects good average glucose control over the past 3 months.'}`
  },
  simulations: [
    { id: 'diet',    label: 'Improve diet',    riskReduction: 4, metricDelta: 0.5, note: '−0.5%' },
    { id: 'exercise',label: 'Exercise program', riskReduction: 5, metricDelta: 0.6, note: '−0.6%' },
    { id: 'medReview',label: 'Medication review',riskReduction: 6, metricDelta: 0.8, note: '−0.8%' },
  ],
}

// lifestyle cards
const L_OVERALL: CardDef = {
  id: 'overallRisk', label: 'Overall Health Score', icon: '📈', accent: '#8b5cf6',
  caption: 'Your blended health risk combines multiple lifestyle factors.',
  getValue(s) {
    const v = overallRisk(s)
    return { display: `${v}%`, status: v >= 25 ? 'elevated' : v >= 15 ? 'borderline' : 'good', statusLabel: v >= 25 ? 'Needs attention' : v >= 15 ? 'Moderate' : 'Good' }
  },
  getExplanation(s) {
    const v = overallRisk(s)
    return `Your blended health risk score is ${v}%. This combines cardiovascular and metabolic risk factors. ${v >= 25 ? 'Broad lifestyle improvements — diet, sleep, activity, stress — each contribute to lowering this.' : v >= 15 ? 'Moderate risk. Incremental improvements across sleep, diet, and activity can meaningfully reduce this over 5–10 years.' : 'Healthy range. Sustaining your current habits protects your long-term health trajectory.'}`
  },
  simulations: [
    { id: 'lifestyle', label: 'Comprehensive change', riskReduction: 10, metricDelta: 10, note: '−10% risk' },
    { id: 'lose10',    label: 'Lose 10 kg',            riskReduction: 6,  metricDelta: 6,  note: '−6% risk' },
    { id: 'smoking',   label: 'Quit smoking',           riskReduction: 9,  metricDelta: 9,  note: '−9% risk' },
  ],
}
const L_SLEEP: CardDef = {
  id: 'sleepStress', label: 'Sleep & Stress', icon: '😴', accent: '#6366f1',
  caption: 'Sleep and stress are significantly affecting your health.',
  getValue(_s) {
    return { display: '62 / 100', status: 'borderline', statusLabel: 'Below optimal' }
  },
  getExplanation(_s) {
    return 'Chronic sleep deprivation (< 7 hours) raises cortisol, increases blood pressure, and elevates cardiovascular risk by up to 45%. Stress management techniques — mindfulness, structured sleep schedules, and reduced screen time — can improve this score significantly within weeks.'
  },
  simulations: [
    { id: 'sleepHygiene', label: 'Improve sleep hygiene', riskReduction: 4, metricDelta: 18, note: '+18 pts' },
    { id: 'mindfulness',  label: 'Stress management',     riskReduction: 3, metricDelta: 12, note: '+12 pts' },
    { id: 'screen',       label: 'Reduce screen time',    riskReduction: 2, metricDelta: 8,  note: '+8 pts' },
  ],
}
const L_ACTIVITY: CardDef = {
  id: 'activityDiet', label: 'Activity & Diet', icon: '🏃', accent: '#10b981',
  caption: 'Activity and diet patterns shape your 10-year trajectory.',
  getValue(_s) {
    return { display: '55 / 100', status: 'elevated', statusLabel: 'Low activity' }
  },
  getExplanation(_s) {
    return 'Current activity and dietary patterns score below recommended levels. 150 minutes of moderate aerobic exercise per week reduces all-cause mortality risk by 30–35%. A Mediterranean diet additionally reduces cardiovascular events by ~30%.'
  },
  simulations: [
    { id: 'exercise',    label: 'Exercise 3×/week',   riskReduction: 6, metricDelta: 20, note: '+20 pts' },
    { id: 'medDiet',     label: 'Mediterranean diet',  riskReduction: 5, metricDelta: 15, note: '+15 pts' },
    { id: 'reduceAlcoh', label: 'Reduce alcohol',      riskReduction: 3, metricDelta: 8,  note: '+8 pts' },
  ],
}

// medication cards
const MED_ADH: CardDef = {
  id: 'adherence', label: 'Medication Adherence', icon: '💊', accent: '#0284c7',
  caption: 'Medication adherence is critical to achieving full benefit.',
  getValue(_s) {
    return { display: '~75%', status: 'borderline', statusLabel: 'Suboptimal' }
  },
  getExplanation(_s) {
    return 'Adherence of ~75% is the estimated average for long-term cardiovascular medications. Patients who take their medications consistently have 45% fewer hospitalizations. Pill organizers, daily reminders, and app support can bring adherence above 90%.'
  },
  simulations: [
    { id: 'reminders', label: 'Set daily reminders',  riskReduction: 5, metricDelta: 15, note: '+15%' },
    { id: 'organizer', label: 'Use pill organizer',   riskReduction: 3, metricDelta: 10, note: '+10%' },
    { id: 'app',       label: 'Medication app',       riskReduction: 4, metricDelta: 12, note: '+12%' },
  ],
}
const MED_BEN: CardDef = {
  id: 'benefit', label: 'Expected Benefit', icon: '📉', accent: '#10b981',
  caption: 'Consistent therapy unlocks meaningful biomarker improvement.',
  getValue(s) {
    const ldl = s.ldl ?? 140
    const reduction = Math.round(ldl * 0.35)
    return { display: `−${reduction} mg/dL`, status: 'good', statusLabel: 'Est. LDL benefit' }
  },
  getExplanation(s) {
    const ldl = s.ldl ?? 140
    const reduction = Math.round(ldl * 0.35)
    return `With consistent statin therapy, an estimated LDL reduction of ${reduction} mg/dL is expected (approximately 35% reduction from baseline). This translates to a ~22% reduction in cardiovascular risk per 39 mg/dL LDL lowering, compounded over time with consistent adherence.`
  },
  simulations: [
    { id: 'consistent', label: 'Take consistently',    riskReduction: 7, metricDelta: 5, note: '+5% benefit' },
    { id: 'combined',   label: 'Combined with lifestyle', riskReduction: 10, metricDelta: 8, note: '+8% benefit' },
  ],
}
const MED_SIDE: CardDef = {
  id: 'monitoring', label: 'Monitoring Plan', icon: '🔍', accent: '#f59e0b',
  caption: 'Regular monitoring optimizes your treatment and safety.',
  getValue(_s) {
    return { display: 'Routine', status: 'good', statusLabel: 'Low side-effect risk' }
  },
  getExplanation(_s) {
    return 'Statin-related muscle pain (myopathy) affects ~5% of users and is dose-dependent. Liver enzyme elevation is rare (< 1%). Annual monitoring of lipid panel, liver function, and creatine kinase is recommended. Any unexplained muscle pain should be reported promptly.'
  },
  simulations: [
    { id: 'labCheck',    label: 'Regular lab checks',    riskReduction: 2, metricDelta: 5, note: 'Early detection' },
    { id: 'doctorVisit', label: 'Annual doctor review',  riskReduction: 3, metricDelta: 7, note: 'Dose optimise' },
  ],
}
const MED_BIO: CardDef = {
  id: 'biomarkers', label: 'Related Biomarkers', icon: '📊', accent: '#8b5cf6',
  caption: 'These biomarkers indicate how your treatment is performing.',
  getValue(s) {
    if (s.ldl === null) return { display: '—', status: 'good', statusLabel: 'No data' }
    const v = Math.round(s.ldl)
    return { display: `LDL ${v}`, status: v >= 130 ? 'elevated' : 'good', statusLabel: v >= 130 ? 'Target: <100' : 'At target' }
  },
  getExplanation(s) {
    const ldl = s.ldl !== null ? Math.round(s.ldl) : null
    const bp  = s.systolicBP !== null ? Math.round(s.systolicBP) : null
    const parts = []
    if (ldl) parts.push(`LDL ${ldl} mg/dL`)
    if (bp)  parts.push(`BP ${bp}/${s.diastolicBP ?? '?'} mmHg`)
    return `Key biomarkers to monitor with current therapy: ${parts.join(', ') || 'lipid panel and blood pressure'}. These should be checked 6–12 weeks after starting or adjusting medications, then annually once stable.`
  },
  simulations: [
    { id: 'monitorLdl', label: 'Monitor LDL monthly',  riskReduction: 2, metricDelta: 10, note: 'Tracking' },
    { id: 'monitorBp',  label: 'Track BP weekly',       riskReduction: 2, metricDelta: 5,  note: 'Tracking' },
  ],
}

// ── Domain registry ───────────────────────────────────────────────────────────

export const DOMAINS: Record<Domain, DomainDef> = {
  cardiovascular: { label: 'Cardiovascular Health',        cards: [C_RISK,    C_LDL,     C_BP,     C_BMI]    },
  metabolic:      { label: 'Metabolic Health',             cards: [M_DRISK,   M_GLUCOSE, M_HBA1C,  C_BMI]    },
  lifestyle:      { label: 'Lifestyle & General Health',   cards: [L_OVERALL, C_BMI,     L_SLEEP,  L_ACTIVITY] },
  medication:     { label: 'Medication & Treatment',       cards: [MED_ADH,   MED_BEN,   MED_SIDE, MED_BIO]  },
}

export const DEFAULT_SNAPSHOT: PatientSnapshot = {
  age: 52, gender: 'male',
  ldl: 158, hdl: 42,
  systolicBP: 138, diastolicBP: 85,
  weight: 88, bmi: 27.5,
  glucose: 102, hba1c: 5.9,
}
