'use client'

import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronRight,
  Dna,
  HeartPulse,
  MoonStar,
  Salad,
  Waves,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { calculateCVDRisk } from '@/lib/risk/framinghamRisk'
import { DigitalTwinHero } from '@/components/profile/DigitalTwinHero'

type ScenarioId = 'exercise' | 'diet' | 'statin' | 'weight'
type ExpandedCardId = 'biomarkers' | 'cardiovascular' | 'lifestyle' | null

type DashboardMetric = {
  label: string
  patientValue: number | null
  patientUnit: string
  targetValue: number | null
  targetLabel: string
}

type TimelineItem = {
  label: string
  column: number
  row: number
  detail: string
}

type RiskInput = {
  age: number | null
  sex: 'male' | 'female' | null
  systolicBP: number | null
  totalCholesterol: number | null
  hdl: number | null
  smokingStatus: boolean | null
  diabetesStatus: boolean | null
  onBPTreatment: boolean | null
}

export interface ReportDashboardData {
  patientId: string
  displayName: string
  initials: string
  age: number | null
  gender: string | null
  latestEncounterDate: string | null
  readinessScore: number
  cardiovascularRiskFactors: string[]
  activeConditions: string[]
  narrative: string
  vitals: {
    bmi: number | null
    systolic: number | null
    diastolic: number | null
    heartRate: number | null
    weight: number | null
    height: number | null
  }
  labs: {
    ldl: number | null
    hdl: number | null
    triglycerides: number | null
    glucose: number | null
    hba1c: number | null
    totalCholesterol: number | null
  }
  riskInput: RiskInput
  biomarkerMetrics: DashboardMetric[]
  timelineItems: TimelineItem[]
  healthPlanCount: number
}

const scenarios: { id: ScenarioId; label: string; category: string }[] = [
  { id: 'exercise', label: 'Add exercise', category: 'Lifestyle' },
  { id: 'diet', label: 'Improve diet', category: 'Lifestyle' },
  { id: 'statin', label: 'Optimize lipid meds', category: 'Medication' },
  { id: 'weight', label: 'Lower weight load', category: 'Risk factor' },
]

function formatMetric(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  return value.toFixed(digits)
}

function formatDateLabel(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatTimelineDate(value?: string | null) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toISOString().slice(0, 10)
}

function safeBarHeights(patientValue: number | null, targetValue: number | null) {
  if (patientValue === null || targetValue === null) {
    return { patientHeight: null, targetHeight: null }
  }
  const maxValue = Math.max(patientValue, targetValue, 1)
  return {
    patientHeight: Math.max(18, Math.min(100, Math.round((patientValue / maxValue) * 100))),
    targetHeight: Math.max(18, Math.min(100, Math.round((targetValue / maxValue) * 100))),
  }
}

function scenarioAdjustedData(base: ReportDashboardData, selected: Set<ScenarioId>) {
  const next = {
    vitals: { ...base.vitals },
    labs: { ...base.labs },
    narrative: base.narrative,
  }

  if (selected.has('exercise')) {
    next.vitals.heartRate = next.vitals.heartRate !== null ? Math.max(52, next.vitals.heartRate - 5) : null
    next.vitals.systolic = next.vitals.systolic !== null ? Math.max(88, next.vitals.systolic - 4) : null
    next.vitals.diastolic = next.vitals.diastolic !== null ? Math.max(60, next.vitals.diastolic - 2) : null
    next.labs.hdl = next.labs.hdl !== null ? next.labs.hdl + 4 : null
    next.labs.triglycerides = next.labs.triglycerides !== null ? Math.max(70, next.labs.triglycerides * 0.9) : null
  }

  if (selected.has('diet')) {
    next.labs.glucose = next.labs.glucose !== null ? Math.max(65, next.labs.glucose * 0.93) : null
    next.labs.hba1c = next.labs.hba1c !== null ? Math.max(4.8, next.labs.hba1c - 0.2) : null
    next.labs.triglycerides = next.labs.triglycerides !== null ? Math.max(70, next.labs.triglycerides * 0.88) : null
    next.labs.totalCholesterol = next.labs.totalCholesterol !== null ? Math.max(90, next.labs.totalCholesterol * 0.94) : null
  }

  if (selected.has('statin')) {
    next.labs.ldl = next.labs.ldl !== null ? Math.max(20, next.labs.ldl * 0.72) : null
    next.labs.totalCholesterol = next.labs.totalCholesterol !== null ? Math.max(90, next.labs.totalCholesterol * 0.86) : null
  }

  if (selected.has('weight')) {
    next.vitals.bmi = next.vitals.bmi !== null ? Math.max(22, next.vitals.bmi - 1.2) : null
    next.vitals.weight = next.vitals.weight !== null ? Math.max(60, next.vitals.weight - 4.5) : null
    next.vitals.systolic = next.vitals.systolic !== null ? Math.max(88, next.vitals.systolic - 3) : null
    next.labs.hba1c = next.labs.hba1c !== null ? Math.max(4.8, next.labs.hba1c - 0.12) : null
  }

  return next
}

function buildLifestyleActions(data: ReportDashboardData, selected: Set<ScenarioId>) {
  const actions = []
  const bmi = data.vitals.bmi
  const hba1c = data.labs.hba1c
  const hasStress = data.activeConditions.some((condition) => condition.toLowerCase().includes('stress'))
  const hasIHD = data.activeConditions.some((condition) => condition.toLowerCase().includes('ischemic heart disease'))

  if (bmi !== null && bmi >= 30) {
    actions.push({
      icon: HeartPulse,
      title: 'Increase low-intensity aerobic volume',
      impact: `BMI is ${formatMetric(bmi, 1)} kg/m², steady aerobic work supports weight and pressure control.`,
    })
  }

  if (hba1c !== null && hba1c >= 5.7) {
    actions.push({
      icon: Salad,
      title: 'Tighten carbohydrate quality and timing',
      impact: `HbA1c is ${formatMetric(hba1c, 2)}%, glycemic improvement remains a meaningful lever.`,
    })
  }

  if (hasStress || hasIHD) {
    actions.push({
      icon: MoonStar,
      title: 'Reduce stress load and protect recovery',
      impact: `${hasIHD ? 'Ischemic heart disease' : 'Active stress findings'} increase the value of sleep and pacing.`,
    })
  }

  if (selected.size > 0) {
    actions.unshift({
      icon: Waves,
      title: 'Simulated scenario applied',
      impact: `${selected.size} scenario adjustment${selected.size > 1 ? 's' : ''} reflected in metrics and risk.`,
    })
  }

  return actions.slice(0, 3)
}

function buildBiomarkerMetrics(data: ReportDashboardData) {
  return data.biomarkerMetrics.map((metric) => ({
    ...metric,
    patientValue:
      metric.label === 'LDL'
        ? data.labs.ldl
        : metric.label === 'HDL'
          ? data.labs.hdl
          : metric.label === 'Triglycerides'
            ? data.labs.triglycerides
            : data.labs.hba1c,
    ...safeBarHeights(
      metric.label === 'LDL'
        ? data.labs.ldl
        : metric.label === 'HDL'
          ? data.labs.hdl
          : metric.label === 'Triglycerides'
            ? data.labs.triglycerides
            : data.labs.hba1c,
      metric.targetValue
    ),
  }))
}

const scenarioApiMap: Record<ScenarioId, string> = {
  exercise: 'exercise',
  diet: 'improve_diet',
  statin: 'optimize_lipids',
  weight: 'lose_weight',
}

// Set to true to re-enable live Gemini image generation.
const ENABLE_GEMINI_BODY_SIMULATION = false

const scenarioImageMap: Record<string, string> = {
  exercise: '/body-simulations/exercise.png',
  improve_diet: '/body-simulations/improve_diet.png',
  optimize_lipids: '/body-simulations/optimize_lipids.jpg',
  lose_weight: '/body-simulations/10kg.jpg',
}

export function ReportDashboardClient({ data }: { data: ReportDashboardData }) {
  const [selectedScenarios, setSelectedScenarios] = useState<Set<ScenarioId>>(new Set())
  const [expandedCardId, setExpandedCardId] = useState<ExpandedCardId>(null)
  const [bodyScenario, setBodyScenario] = useState<ScenarioId | null>(null)
  const [isGeneratingBody, setIsGeneratingBody] = useState(false)
  const [generatedBodyUrl, setGeneratedBodyUrl] = useState<string | null>(null)
  const [bodySimError, setBodySimError] = useState<string | null>(null)

  const simulated = useMemo(() => scenarioAdjustedData(data, selectedScenarios), [data, selectedScenarios])

  const risk = useMemo(
    () =>
      calculateCVDRisk({
        ...data.riskInput,
        systolicBP: simulated.vitals.systolic,
        totalCholesterol: simulated.labs.totalCholesterol,
        hdl: simulated.labs.hdl,
      }),
    [data.riskInput, simulated]
  )

  const achievedGoals = [
    simulated.vitals.systolic !== null && simulated.vitals.systolic < 120 && (simulated.vitals.diastolic ?? 0) < 80,
    simulated.vitals.bmi !== null && simulated.vitals.bmi < 30,
    simulated.labs.ldl !== null && simulated.labs.ldl < 100,
    simulated.labs.triglycerides !== null && simulated.labs.triglycerides < 150,
    simulated.labs.hba1c !== null && simulated.labs.hba1c < 5.7,
  ].filter(Boolean).length

  const progressTone =
    achievedGoals >= 4
      ? 'bg-emerald-100 text-emerald-700'
      : achievedGoals >= 2
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700'

  const bodyGlowChest = Math.max(48, Math.min(91, Math.round(100 - (risk.riskPercent ?? 25))))
  const bodyGlowAbdomen = Math.max(
    18,
    Math.min(
      78,
      Math.round((((simulated.labs.triglycerides ?? 180) / 200) * 30) + (((simulated.vitals.bmi ?? 27) / 35) * 40))
    )
  )

  const chartMetrics = buildBiomarkerMetrics({ ...data, ...simulated })
  const actions = buildLifestyleActions({ ...data, ...simulated }, selectedScenarios)
  const timelineColumns = useMemo(
    () =>
      Array.from({ length: 6 }, (_, columnIndex) => {
        const columnItems = data.timelineItems.filter((item) => item.column === columnIndex)
        return {
          id: columnIndex,
          label: columnItems[0]?.detail ?? null,
          items: columnItems,
        }
      }),
    [data.timelineItems]
  )

  const triggerBodySimulation = async (scenarioId: ScenarioId) => {
    setBodyScenario(scenarioId)
    setIsGeneratingBody(true)
    setBodySimError(null)
    setGeneratedBodyUrl(null)
    try {
      const res = await fetch('/api/body-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: scenarioApiMap[scenarioId],
          patient: {
            age: data.age,
            sex: data.gender,
            bmi: data.vitals.bmi,
            weight: data.vitals.weight,
            biomarkers: [
              `LDL ${data.labs.ldl ?? 'N/A'} mg/dL`,
              `HDL ${data.labs.hdl ?? 'N/A'} mg/dL`,
              `Triglycerides ${data.labs.triglycerides ?? 'N/A'} mg/dL`,
              `HbA1c ${data.labs.hba1c ?? 'N/A'}%`,
              `Glucose ${data.labs.glucose ?? 'N/A'} mg/dL`,
            ].join(', '),
          },
        }),
      })

      let result: { image?: string; error?: unknown }
      try {
        result = await res.json()
      } catch {
        setBodySimError('Body simulation unavailable')
        return
      }

      if (!res.ok || result.error) {
        console.error('[body-simulation] API error:', result.error)
        setBodySimError('Body simulation unavailable')
        return
      }

      if (!result.image) {
        setBodySimError('Body simulation returned no image')
        return
      }

      setGeneratedBodyUrl(result.image)
    } catch (err) {
      console.error('[body-simulation]', err)
      setBodySimError('Body simulation unavailable')
    } finally {
      setIsGeneratingBody(false)
    }
  }

  const toggleScenario = (scenarioId: ScenarioId) => {
    const isActive = selectedScenarios.has(scenarioId)
    setSelectedScenarios((prev) => {
      const next = new Set(prev)
      if (next.has(scenarioId)) next.delete(scenarioId)
      else next.add(scenarioId)
      return next
    })
    if (isActive) {
      if (bodyScenario === scenarioId) {
        setBodyScenario(null)
        setGeneratedBodyUrl(null)
        setBodySimError(null)
      }
    } else {
      const apiKey = scenarioApiMap[scenarioId]
      setBodyScenario(scenarioId)
      setGeneratedBodyUrl(scenarioImageMap[apiKey] ?? null)
      if (ENABLE_GEMINI_BODY_SIMULATION) {
        triggerBodySimulation(scenarioId)
      }
    }
  }

  const closeExpandedCard = () => setExpandedCardId(null)

  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#fbfdff_0%,#f3f7fb_100%)] text-slate-900">
      <main className="mx-auto flex h-full max-w-[1500px] flex-col px-[14px] py-[14px]">
        {/* ── HEADER ── */}
        <header className="mb-6 flex items-center justify-between">
          <Link 
            href="/voice" 
            className="group flex items-center gap-2 text-[13px] font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Voice</span>
          </Link>
          
          <div className="flex items-center gap-3 rounded-full border border-white/75 bg-white/66 px-3 py-2 shadow-[0_8px_20px_rgba(15,23,42,0.04)] backdrop-blur-[14px]">
            <div className="relative h-8 w-8 overflow-hidden rounded-xl border border-sky-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(239,246,255,0.92))] shadow-[0_8px_20px_rgba(59,130,246,0.08)]">
              <Image
                src="/dualis-logo.png"
                alt="Dualis"
                width={160}
                height={160}
                priority
                className="h-full w-full scale-[2.2] object-cover object-top"
                style={{ transformOrigin: 'center 22%' }}
              />
            </div>
            <span className="text-[11px] font-semibold tracking-[0.22em] text-slate-600">DUALIS</span>
          </div>
        </header>

        <section className="flex flex-1 min-h-0 flex-col gap-3 xl:grid xl:grid-cols-[240px_minmax(600px,1fr)_260px] xl:grid-rows-[minmax(0,1fr)_150px] xl:gap-3">

          {/* ── LEFT PANEL ── */}
          <div className="space-y-2.5 xl:min-h-0 xl:overflow-y-auto xl:pr-0.5">

            <section className="group relative space-y-1.5 rounded-[20px] border border-white/80 bg-[rgba(255,255,255,0.72)] p-[11px] shadow-[0_8px_20px_rgba(15,23,42,0.035)] backdrop-blur-[18px]">
              <div className="flex items-center justify-between">
                <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Pulmonary function</div>
                {!data.activeConditions.some((c) => /respiratory|pneumonia|hypoxemia|cough/i.test(c)) && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-400">No data</span>
                )}
              </div>
              <div className={`transition-opacity duration-300 ${!data.activeConditions.some((c) => /respiratory|pneumonia|hypoxemia|cough/i.test(c)) ? 'opacity-65' : ''}`}>
                <div className="text-[10px] text-slate-500">Latest respiratory observation</div>
                <div className={`text-[22px] font-semibold leading-none tracking-tight ${!data.activeConditions.some((c) => /respiratory|pneumonia|hypoxemia|cough/i.test(c)) ? 'text-slate-400' : 'text-slate-950'}`}>
                  {data.activeConditions.find((c) => /respiratory|pneumonia|hypoxemia|cough/i.test(c)) ? 'Active' : 'No data recorded'}
                </div>
                <p className={`mt-1 text-[10px] leading-[1.42] ${!data.activeConditions.some((c) => /respiratory|pneumonia|hypoxemia|cough/i.test(c)) ? 'text-slate-400' : 'text-slate-600'}`}>
                  {data.activeConditions.find((c) => /respiratory|pneumonia|hypoxemia|cough/i.test(c)) ??
                    'No pulmonary function tests available in the current record.'}
                </p>
              </div>
            </section>

            <section className="group relative space-y-1.5 rounded-[20px] border border-white/80 bg-[rgba(255,255,255,0.72)] p-[11px] shadow-[0_8px_20px_rgba(15,23,42,0.035)] backdrop-blur-[18px]">
              <div className="flex items-center justify-between">
                <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Genetic</div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold text-slate-400">No data</span>
                  <Dna className="h-3.5 w-3.5 text-slate-300" />
                </div>
              </div>
              <div className="opacity-65 transition-opacity duration-300">
                <div className="text-[10px] text-slate-500">Variant (SNP)</div>
                <div className="text-[12px] font-semibold text-slate-400">No data recorded</div>
                <p className="text-[10px] leading-[1.42] text-slate-400">
                  No genomic data available for this patient.
                </p>
              </div>
            </section>

            <section className="space-y-1.5 rounded-[20px] border border-white/80 bg-[rgba(255,255,255,0.72)] p-[11px] shadow-[0_8px_20px_rgba(15,23,42,0.035)] backdrop-blur-[18px]">
              <div className="flex items-center justify-between">
                <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Patient profile</div>
                <div className="text-[9px] text-slate-400">{formatDateLabel(data.latestEncounterDate)}</div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/88 text-[12px] font-semibold text-sky-700 shadow-[0_6px_18px_rgba(0,0,0,0.04)]">
                  {data.initials}
                </div>
                <div>
                  <h1 className="text-[14px] font-semibold leading-[1.08] tracking-tight text-slate-950">{data.displayName}</h1>
                  <p className="text-[10px] text-slate-500">
                    {data.age ?? 'N/A'} yr · {data.gender ?? 'N/A'}
                  </p>
                  <Link 
                    href="/consent"
                    className="mt-1.5 flex items-center gap-1.5 rounded-full bg-slate-900 px-2.5 py-1 text-[9px] font-bold text-white transition hover-lift button-pulse hover:bg-slate-800"
                  >
                    Share Data
                  </Link>
                </div>
              </div>
              <p className="line-clamp-3 text-[10px] leading-[1.4] text-slate-600">{data.narrative}</p>
            </section>
          </div>

          {/* ── CENTER: ANATOMICAL BODY ── */}
          <div className="relative z-10 flex h-full min-h-0 items-center justify-center">
            <DigitalTwinHero
              chestGlow={bodyGlowChest}
              abdomenGlow={bodyGlowAbdomen}
              bloodPressure={`${formatMetric(simulated.vitals.systolic)}/${formatMetric(simulated.vitals.diastolic)}`}
              heartRate={formatMetric(simulated.vitals.heartRate)}
              ldl={formatMetric(simulated.labs.ldl, 1)}
              triglycerides={formatMetric(simulated.labs.triglycerides, 1)}
              simulatedImageUrl={generatedBodyUrl}
              isGenerating={ENABLE_GEMINI_BODY_SIMULATION && isGeneratingBody}
            />
            {bodySimError && (
              <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-rose-50/90 px-3 py-1 text-[10px] text-rose-500 shadow-sm backdrop-blur-sm">
                {bodySimError}
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="space-y-2.5 xl:min-h-0 xl:overflow-y-auto xl:pl-0.5">

            <section className="space-y-3 rounded-[20px] border border-white/80 bg-[rgba(255,255,255,0.72)] p-[15px] shadow-[0_8px_20px_rgba(15,23,42,0.035)] backdrop-blur-[18px]">
              <div className="flex items-center justify-between">
                <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Treatment adherence</div>
                <div className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider opacity-60 ${progressTone}`}>
                  {achievedGoals}/5 goals
                </div>
              </div>

              <div className="flex flex-col items-center">
                <div className="relative h-[85px] w-[160px]">
                  {/* Progress Gauge SVG */}
                  <svg viewBox="0 0 100 55" className="h-full w-full overflow-visible">
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="#f1f5f9"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 10 50 A 40 40 0 0 1 90 50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={125.6}
                      strokeDashoffset={125.6 * (1 - (achievedGoals / 5))}
                      className={`transition-all duration-1000 ease-out ${
                        achievedGoals >= 4 ? 'text-emerald-500' : achievedGoals >= 2 ? 'text-amber-500' : 'text-rose-500'
                      }`}
                    />
                  </svg>

                  {/* Centered Content */}
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-1">
                    <div className="text-[24px] font-bold leading-none tracking-tight text-slate-950">
                      {achievedGoals}<span className="text-slate-300">/5</span>
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${
                      achievedGoals >= 4 ? 'text-emerald-600' : achievedGoals >= 2 ? 'text-amber-600' : 'text-rose-600'
                    }`}>
                      {achievedGoals >= 4 ? 'Good progress' : achievedGoals >= 2 ? 'Fair progress' : 'Needs focus'}
                    </div>
                  </div>
                </div>

                {/* Subtext */}
                <div className="mt-3 flex w-full flex-col items-center border-t border-slate-100/50 pt-3">
                  <div className="text-[10px] font-medium text-slate-500">{Math.round((achievedGoals / 5) * 100)}% complete</div>
                  {achievedGoals < 5 && (
                    <div className="mt-0.5 text-[9px] text-slate-400">
                      +{achievedGoals < 2 ? 2 - achievedGoals : achievedGoals < 4 ? 4 - achievedGoals : 1} goal{achievedGoals < 4 ? 's' : ''} to reach {achievedGoals < 2 ? 'Fair' : 'Good'}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-1.5 rounded-[20px] border border-white/80 bg-[rgba(255,255,255,0.72)] p-[11px] shadow-[0_8px_20px_rgba(15,23,42,0.035)] backdrop-blur-[18px]">
              <div className="flex items-center justify-between">
                <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Simulate scenario</div>
                <div className="text-[9px] text-slate-400">{selectedScenarios.size} active</div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scenarios.map((scenario) => {
                  const active = selectedScenarios.has(scenario.id)
                  return (
                    <button
                      key={scenario.id}
                      onClick={() => toggleScenario(scenario.id)}
                      className={`rounded-full px-2 py-1 text-[10px] font-medium transition ${
                        active
                          ? 'bg-[#14316f] text-white shadow-[0_8px_20px_rgba(20,49,111,0.16)]'
                          : 'bg-white text-slate-600 shadow-[0_8px_20px_rgba(0,0,0,0.05)]'
                      }`}
                    >
                      {scenario.label}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-1.5 rounded-[20px] border border-white/80 bg-[rgba(255,255,255,0.72)] p-[11px] shadow-[0_8px_20px_rgba(15,23,42,0.035)] backdrop-blur-[18px]">
              <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Timeline inputs</div>
              <div className="overflow-x-auto pb-1">
                <div
                  className="grid min-w-[480px] gap-3"
                  style={{ gridTemplateColumns: 'repeat(6, minmax(64px, 80px))' }}
                >
                  {timelineColumns.map((column) => (
                    <div key={column.id} className="flex flex-col items-center">
                      <div
                        className="mb-2 w-full max-w-[72px] truncate text-center text-[9px] font-medium leading-[1.35] text-slate-400"
                        title={column.label ?? undefined}
                      >
                        {formatTimelineDate(column.label)}
                      </div>
                      <div className="relative flex min-h-[120px] w-full flex-col items-center">
                        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-sky-100" />
                        <div className="relative z-[1] flex w-full flex-col items-center gap-2 pt-1">
                          {column.items.length > 0 ? (
                            column.items
                              .sort((a, b) => a.row - b.row)
                              .map((task, index) => (
                                <div
                                  key={`${task.label}-${index}`}
                                  className="flex min-h-[26px] w-full max-w-[140px] items-center justify-center overflow-hidden rounded-full bg-white/88 px-2.5 py-1 text-center text-[9px] font-medium leading-[1.3] text-slate-700 shadow-[0_6px_16px_rgba(0,0,0,0.04)]"
                                  title={task.label}
                                >
                                  <span className="truncate">{task.label}</span>
                                </div>
                              ))
                          ) : (
                            <div className="pt-6 text-center text-[10px] text-slate-400">N/A</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* ── BOTTOM ROW ── */}
          <section className="grid gap-3 xl:col-span-3 xl:grid-cols-3 xl:overflow-hidden">

            <article
              role="button"
              tabIndex={0}
              onClick={() => setExpandedCardId('biomarkers')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedCardId('biomarkers') } }}
              className="h-full cursor-pointer overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,rgba(42,78,130,0.88),rgba(50,90,145,0.82))] px-4 py-3 text-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] backdrop-blur-[12px] transition hover:bg-[linear-gradient(180deg,rgba(47,84,138,0.9),rgba(55,96,151,0.84))]"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold tracking-tight text-blue-50">Health Biomarker Comparison</h3>
                <span className="text-[9px] uppercase tracking-[0.18em] text-blue-100/70">Expand</span>
              </div>
              <div className="h-[86px] rounded-[14px] bg-white/6 p-2.5">
                <div className="grid h-full grid-cols-4 items-end gap-2">
                  {chartMetrics.map((metric) => (
                    <div key={metric.label} className="flex h-full flex-col justify-between">
                      <div className="text-center text-[9px] font-semibold text-blue-50">
                        {metric.patientValue !== null ? `${formatMetric(metric.patientValue, metric.label === 'HbA1c' ? 2 : 1)}` : 'N/A'}
                      </div>
                      <div className="flex flex-1 items-end justify-center gap-1 py-1.5">
                        <div className="flex h-full w-5 items-end rounded-t-[10px] bg-white/10 p-[2px]">
                          <div
                            className="w-full rounded-t-[8px] bg-gradient-to-t from-sky-500 to-cyan-300"
                            style={{ height: metric.patientHeight !== null ? `${metric.patientHeight}%` : '18%' }}
                          />
                        </div>
                        <div className="flex h-full w-5 items-end rounded-t-[10px] border border-blue-200/20 bg-[repeating-linear-gradient(45deg,rgba(148,163,184,0.16),rgba(148,163,184,0.16)_6px,rgba(191,219,254,0.05)_6px,rgba(191,219,254,0.05)_12px)] p-[2px]">
                          <div
                            className="w-full rounded-t-[8px] bg-white/28"
                            style={{ height: metric.targetHeight !== null ? `${metric.targetHeight}%` : '18%' }}
                          />
                        </div>
                      </div>
                      <div className="text-center text-[9px] leading-[1.3] text-blue-100/80">{metric.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article
              role="button"
              tabIndex={0}
              onClick={() => setExpandedCardId('cardiovascular')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedCardId('cardiovascular') } }}
              className="relative h-full cursor-pointer overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,rgba(42,78,130,0.88),rgba(50,90,145,0.82))] px-4 py-3 text-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] backdrop-blur-[12px] transition hover:bg-[linear-gradient(180deg,rgba(47,84,138,0.9),rgba(55,96,151,0.84))]"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold tracking-tight text-blue-50">Cardiovascular Risk</h3>
                <HeartPulse className="h-3.5 w-3.5 text-blue-200" />
              </div>
              <div className="text-[22px] font-semibold leading-none tracking-tight">
                {risk.riskPercent !== null ? `${risk.riskPercent}%` : 'N/A'}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#34d399_0%,#facc15_50%,#fb7185_100%)]"
                  style={{ width: `${Math.max(6, Math.min(100, risk.riskPercent ?? 0))}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(data.cardiovascularRiskFactors.length ? data.cardiovascularRiskFactors : ['N/A']).slice(0, 2).map((item) => (
                  <span key={item} className="rounded-full border border-white/12 bg-white/10 px-2 py-0.5 text-[9px] text-blue-50">
                    {item}
                  </span>
                ))}
              </div>
              <div className="absolute bottom-2.5 right-3 text-[9px] uppercase tracking-[0.18em] text-blue-100/70">
                Expand
              </div>
            </article>

            <article
              role="button"
              tabIndex={0}
              onClick={() => setExpandedCardId('lifestyle')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedCardId('lifestyle') } }}
              className="h-full cursor-pointer overflow-hidden rounded-[20px] bg-[linear-gradient(180deg,rgba(42,78,130,0.88),rgba(50,90,145,0.82))] px-4 py-3 text-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] backdrop-blur-[12px] transition hover:bg-[linear-gradient(180deg,rgba(47,84,138,0.9),rgba(55,96,151,0.84))]"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-[13px] font-semibold tracking-tight text-blue-50">Lifestyle actions</h3>
                <Waves className="h-3.5 w-3.5 text-blue-200" />
              </div>
              <div className="space-y-1.5">
                {actions.length > 0 ? (
                  actions.slice(0, 2).map((action) => {
                    const Icon = action.icon
                    return (
                      <div key={action.title} className="flex items-center gap-2 rounded-[12px] bg-white/8 px-2.5 py-1.5">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="text-[10px] font-medium leading-[1.3] text-white">{action.title}</div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-[12px] bg-white/8 p-2 text-[10px] text-blue-100/76">N/A</div>
                )}
              </div>
            </article>
          </section>
        </section>
      </main>

      {/* ── EXPANDED CARD MODAL ── */}
      {expandedCardId && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/22 px-4 py-6 backdrop-blur-[8px]"
          onClick={closeExpandedCard}
        >
          <div
            className="w-full max-w-3xl rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.82)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-[24px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Expanded view</div>
                <h3 className="mt-1 text-[18px] font-semibold tracking-tight text-slate-950">
                  {expandedCardId === 'biomarkers'
                    ? 'Health Biomarker Comparison'
                    : expandedCardId === 'cardiovascular'
                      ? 'Cardiovascular System Report'
                      : 'Lifestyle actions'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeExpandedCard}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-[0_6px_18px_rgba(15,23,42,0.08)]"
                aria-label="Close expanded card"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {expandedCardId === 'biomarkers' && (
              <div className="rounded-[20px] bg-[linear-gradient(180deg,rgba(42,78,130,0.9),rgba(50,90,145,0.84))] p-4 text-white">
                <div className="grid h-[220px] grid-cols-4 items-end gap-4">
                  {chartMetrics.map((metric) => (
                    <div key={metric.label} className="flex h-full flex-col justify-between">
                      <div className="text-center text-[11px] font-semibold text-blue-50">
                        {metric.patientValue !== null ? `${formatMetric(metric.patientValue, metric.label === 'HbA1c' ? 2 : 1)} ${metric.patientUnit}` : 'N/A'}
                      </div>
                      <div className="flex flex-1 items-end justify-center gap-2 py-3">
                        <div className="flex h-full w-8 items-end rounded-t-[14px] bg-white/10 p-[3px]">
                          <div
                            className="w-full rounded-t-[11px] bg-gradient-to-t from-sky-500 to-cyan-300"
                            style={{ height: metric.patientHeight !== null ? `${metric.patientHeight}%` : '18%' }}
                          />
                        </div>
                        <div className="flex h-full w-8 items-end rounded-t-[14px] border border-blue-200/20 bg-[repeating-linear-gradient(45deg,rgba(148,163,184,0.16),rgba(148,163,184,0.16)_7px,rgba(191,219,254,0.05)_7px,rgba(191,219,254,0.05)_14px)] p-[3px]">
                          <div
                            className="w-full rounded-t-[11px] bg-white/28"
                            style={{ height: metric.targetHeight !== null ? `${metric.targetHeight}%` : '18%' }}
                          />
                        </div>
                      </div>
                      <div className="text-center text-[11px] leading-[1.35] text-blue-100/80">{metric.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {expandedCardId === 'cardiovascular' && (
              <div className="rounded-[20px] bg-[linear-gradient(180deg,rgba(42,78,130,0.9),rgba(50,90,145,0.84))] p-4 text-white">
                <div className="text-[38px] font-semibold leading-none tracking-tight">
                  {risk.riskPercent !== null ? `${risk.riskPercent}%` : 'N/A'}
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#34d399_0%,#facc15_50%,#fb7185_100%)]"
                    style={{ width: `${Math.max(6, Math.min(100, risk.riskPercent ?? 0))}%` }}
                  />
                </div>
                <p className="mt-4 text-[13px] leading-[1.45] text-blue-100/86">
                  {risk.riskPercent !== null
                    ? `Risk estimate uses ${data.age ?? 'unknown age'}, BP ${formatMetric(simulated.vitals.systolic)}/${formatMetric(simulated.vitals.diastolic)} mmHg, LDL ${formatMetric(simulated.labs.ldl, 1)}, glucose ${formatMetric(simulated.labs.glucose, 1)}, and diabetes evidence from Chadwick's record.`
                    : 'Not available because required cardiovascular inputs are incomplete.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(data.cardiovascularRiskFactors.length ? data.cardiovascularRiskFactors : ['N/A']).slice(0, 4).map((item) => (
                    <span key={item} className="rounded-full border border-white/12 bg-white/10 px-2.5 py-1 text-[11px] text-blue-50">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-5">
                  <Link
                    href="/timeline"
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-white/12 px-4 text-[13px] font-medium text-white transition hover:bg-white/18"
                  >
                    View Timeline
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}

            {expandedCardId === 'lifestyle' && (
              <div className="space-y-3 rounded-[20px] bg-[linear-gradient(180deg,rgba(42,78,130,0.9),rgba(50,90,145,0.84))] p-4 text-white">
                {actions.length > 0 ? (
                  actions.map((action) => {
                    const Icon = action.icon
                    return (
                      <div key={action.title} className="rounded-[18px] bg-white/8 p-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="text-[14px] font-medium leading-[1.35] text-white">{action.title}</div>
                            <div className="mt-1 text-[12px] leading-[1.42] text-blue-100/76">{action.impact}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-[18px] bg-white/8 p-3 text-[13px] text-blue-100/76">N/A</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
