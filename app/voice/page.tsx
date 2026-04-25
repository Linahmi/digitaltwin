'use client'

import { useState, useEffect, useRef } from 'react'
import { VoiceInterface } from '@/components/VoiceInterface'
import { MessageBubble } from '@/components/MessageBubble'
import { GuidedFutureFlow } from '@/components/voice/GuidedFutureFlow'
import { ChatMessage } from '@/types/patient'
import { AlertCircle, UserCircle } from 'lucide-react'
import Link from 'next/link'

interface PatientHeader {
  id: string
  firstName: string
  lastName: string
  age: number | null
  gender: string | null
}

interface PatientBiomarkersRaw {
  patientId: string
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

interface ProjectionState {
  baselineRisk: number
  projectedRisk10y: number
  improvedRisk10y: number
  trajectory: { year: string; current: number; improved?: number }[]
  drivers: string[]
  ldlCurrent: number | null
  bpCurrent: number | null
  weightCurrent: number | null
}

// Keywords that trigger the Future Timeline Panel
const FUTURE_KEYWORDS = [
  'will happen', 'in 10 years', 'in 5 years', 'future', 'if i keep',
  'long term', 'long-term', 'trajectory', 'prediction', 'predict',
  'risk in', 'over time', 'eventually', '10 year', '5 year',
  'next decade', 'diet', 'lifestyle', 'keep eating', 'continue',
]

function isFutureQuestion(text: string): boolean {
  const lower = text.toLowerCase()
  return FUTURE_KEYWORDS.some(kw => lower.includes(kw))
}

// ── Client-side risk computation (mirrors lib/risk/computeProjection.ts) ──────
// Duplicated here so it runs on the client without server imports.

function computeBaselineRisk(bm: PatientBiomarkersRaw): number {
  let score = 5
  if (bm.age) {
    if (bm.age >= 60) score += 6
    else if (bm.age >= 50) score += 4
    else if (bm.age >= 40) score += 2
  }
  if (bm.gender === 'male') score += 2
  if (bm.ldl !== null) {
    if (bm.ldl >= 190) score += 6
    else if (bm.ldl >= 160) score += 4
    else if (bm.ldl >= 130) score += 2
  }
  if (bm.hdl !== null) {
    if (bm.hdl < 35) score += 4
    else if (bm.hdl < 40) score += 2
    else if (bm.hdl >= 60) score -= 2
  }
  if (bm.systolicBP !== null) {
    if (bm.systolicBP >= 160) score += 6
    else if (bm.systolicBP >= 140) score += 4
    else if (bm.systolicBP >= 130) score += 2
  }
  if (bm.bmi !== null) {
    if (bm.bmi >= 35) score += 4
    else if (bm.bmi >= 30) score += 3
    else if (bm.bmi >= 25) score += 1
  }
  if (bm.glucose !== null) {
    if (bm.glucose >= 126) score += 4
    else if (bm.glucose >= 100) score += 2
  }
  if (bm.hba1c !== null) {
    if (bm.hba1c >= 6.5) score += 4
    else if (bm.hba1c >= 5.7) score += 2
  }
  return Math.min(Math.round(score), 50)
}

function buildProjection(bm: PatientBiomarkersRaw): ProjectionState {
  const baseline = computeBaselineRisk(bm)

  // drift rates
  let drift = 0.5
  if (bm.ldl !== null && bm.ldl >= 160) drift += 0.6
  if (bm.systolicBP !== null && bm.systolicBP >= 140) drift += 0.5
  if (bm.bmi !== null && bm.bmi >= 30) drift += 0.4
  if (bm.glucose !== null && bm.glucose >= 100) drift += 0.3

  let improvedDrift = 0.1
  if (bm.ldl !== null && bm.ldl >= 160) improvedDrift -= 0.2
  if (bm.systolicBP !== null && bm.systolicBP >= 140) improvedDrift -= 0.1
  improvedDrift = Math.max(improvedDrift, -0.3)

  const years = [0, 2, 4, 6, 8, 10]
  const trajectory = years.map(y => ({
    year: y === 0 ? 'Today' : `${y} yrs`,
    current: Math.min(Math.round(baseline + drift * y), 75),
    improved: Math.max(Math.round(baseline + improvedDrift * y), 5),
  }))

  const projectedRisk10y = trajectory[5].current
  const improvedRisk10y = trajectory[5].improved!

  const drivers: string[] = []
  if (bm.ldl !== null && bm.ldl >= 130) drivers.push(`LDL ${Math.round(bm.ldl)} mg/dL`)
  if (bm.systolicBP !== null && bm.systolicBP >= 130) drivers.push(`BP ${Math.round(bm.systolicBP)}/${bm.diastolicBP ? Math.round(bm.diastolicBP) : '?'} mmHg`)
  if (bm.bmi !== null && bm.bmi >= 25) drivers.push(`BMI ${bm.bmi.toFixed(1)}`)
  if (bm.glucose !== null && bm.glucose >= 100) drivers.push(`Glucose ${Math.round(bm.glucose)} mg/dL`)

  return { trajectory, baselineRisk: baseline, projectedRisk10y, improvedRisk10y, drivers, ldlCurrent: bm.ldl, bpCurrent: bm.systolicBP, weightCurrent: bm.weight }
}

// ── Ambient AI presence ────────────────────────────────────────────────────────
function AmbientPresence({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="absolute rounded-full" style={{ width: 480, height: 480, background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, rgba(14,165,233,0.02) 50%, transparent 75%)', animation: 'breathe 6s ease-in-out infinite', filter: 'blur(10px)' }} />
      <div className="absolute rounded-full" style={{ width: 220, height: 220, border: `1px solid rgba(14,165,233,${active ? 0.22 : 0.08})`, animation: 'breathe 4.5s ease-in-out 0.5s infinite', transition: 'border-color 0.8s ease' }} />
      <div className="absolute rounded-full" style={{ width: 120, height: 120, border: `1px solid rgba(14,165,233,${active ? 0.40 : 0.15})`, boxShadow: active ? '0 0 30px rgba(14,165,233,0.1)' : 'none', animation: 'breathe 4s ease-in-out 1s infinite', transition: 'border-color 0.8s, box-shadow 0.8s' }} />
      <div className="absolute rounded-full" style={{ width: 8, height: 8, background: `rgba(14,165,233, ${active ? 0.8 : 0.3})`, boxShadow: `0 0 12px 4px rgba(14,165,233, ${active ? 0.3 : 0.08})`, transition: 'all 0.8s' }} />
      <style>{`
        @keyframes breathe {
          0%,100% { transform: scale(1); opacity: 0.7; }
          50%      { transform: scale(1.04); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function FloatingParticles() {
  const dots = Array.from({ length: 25 }, (_, i) => ({
    id: i, size: 2 + Math.random() * 4, x: Math.random() * 100, y: Math.random() * 100,
    dur: 15 + Math.random() * 20, delay: Math.random() * 10, warm: Math.random() > 0.85,
  }))
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ filter: 'blur(1.5px)' }}>
      {dots.map(d => (
        <span key={d.id} className="absolute rounded-full" style={{ width: d.size, height: d.size, left: `${d.x}%`, top: `${d.y}%`, background: d.warm ? 'rgba(236,72,153,0.3)' : 'rgba(14,165,233,0.4)', animation: `floatDot ${d.dur}s ease-in-out ${d.delay}s infinite alternate` }} />
      ))}
      <style>{`@keyframes floatDot { from { transform: translateY(0) translateX(0); opacity: 0.3; } to { transform: translateY(-30px) translateX(15px); opacity: 0.7; } }`}</style>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 select-none">
      <p className="text-base font-medium mb-2" style={{ color: '#475569' }}>Ask your digital twin about your health</p>
      <p className="text-sm" style={{ color: '#0284c7' }}>"What will happen in 10 years if I keep this diet?"</p>
    </div>
  )
}

// ── Extended message type ──────────────────────────────────────────────────────
interface ExtendedMessage extends ChatMessage {
  showTimeline?: boolean
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function VoicePage() {
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [patient, setPatient] = useState<PatientHeader | null>(null)
  const [currentResponse, setCurrentResponse] = useState<string>()
  const [dbError, setDbError] = useState<string | null>(null)
  const [projection, setProjection] = useState<ProjectionState | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load patient + biomarkers
  useEffect(() => {
    const patientId = process.env.NEXT_PUBLIC_DEFAULT_PATIENT_ID ?? ''
    const url = patientId ? `/api/patient?id=${patientId}` : '/api/patient'

    fetch(url)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) { setDbError(data.error ?? 'Failed to load patient'); return }
        setPatient(data)

        // Fetch biomarkers and compute projection
        const bioUrl = patientId ? `/api/biomarkers?id=${patientId}` : '/api/biomarkers'
        const bioRes = await fetch(bioUrl)
        if (bioRes.ok) {
          const bm: PatientBiomarkersRaw = await bioRes.json()
          setProjection(buildProjection(bm))
        }
      })
      .catch(() => setDbError('Could not reach the patient API. Is the server running?'))
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleTranscript = async (transcript: string) => {
    if (!patient) return
    const triggered = isFutureQuestion(transcript)

    const userMessage: ExtendedMessage = { role: 'user', content: transcript, timestamp: Date.now() }
    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)
    setCurrentResponse(undefined)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: transcript, patientId: patient.id }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'API request failed')

      const assistantMessage: ExtendedMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
        showTimeline: triggered,
      }
      setMessages(prev => [...prev, assistantMessage])
      setCurrentResponse(data.response)
    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: Date.now() }])
    } finally {
      setIsProcessing(false)
    }
  }

  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="max-w-lg text-center">
          <AlertCircle className="mx-auto mb-6 h-12 w-12 text-amber-400" />
          <h1 className="mb-3 text-xl font-semibold text-white">Database Setup Required</h1>
          <p className="mb-6 text-slate-400">{dbError}</p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-left text-sm font-mono text-slate-300">
            <p className="mb-1 text-slate-500"># Import into database</p>
            <p>bun run db:import</p>
          </div>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#020617' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full" style={{ border: '1.5px solid rgba(0,229,255,0.4)', borderTopColor: '#00e5ff', animation: 'spin 1s linear infinite' }} />
          <p className="text-sm" style={{ color: 'rgba(0,229,255,0.5)' }}>Loading your twin...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col relative" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #eaf6ff 50%, #f0fbff 100%)', color: '#0f172a' }}>
      <FloatingParticles />

      <header className="relative z-10 flex flex-col items-center py-6 px-6" style={{ borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
        <div className="absolute right-6 top-6">
          <Link href="/profile" className="flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1.5 transition-all hover:bg-sky-50" style={{ color: '#0284c7', border: '1px solid rgba(14,165,233,0.2)' }}>
            <UserCircle className="h-4 w-4" />
            View Profile
          </Link>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{ color: '#0284c7' }}>Digital Health Twin</p>
        <p className="text-sm" style={{ color: '#64748b' }}>
          {patient.firstName} {patient.lastName} {patient.age !== null ? `· ${patient.age} yrs` : ''}
        </p>
      </header>

      <div className="relative z-10 flex-1 flex flex-col">
        {messages.length === 0 ? (
          <div className="relative flex-1 flex flex-col items-center justify-center">
            <AmbientPresence active={isProcessing} />
            <div className="relative z-10"><EmptyState /></div>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6" style={{ scrollbarWidth: 'none' }}>
            <div className="mx-auto max-w-2xl space-y-5">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  <MessageBubble message={msg} />
                  {msg.role === 'assistant' && msg.showTimeline && projection && (
                    <GuidedFutureFlow
                      baselineRisk={projection.baselineRisk}
                      projectedRisk10y={projection.projectedRisk10y}
                      improvedRisk10y={projection.improvedRisk10y}
                      trajectory={projection.trajectory}
                      drivers={projection.drivers}
                      ldlCurrent={(projection as ProjectionState).ldlCurrent ?? null}
                      bpCurrent={(projection as ProjectionState).bpCurrent ?? null}
                      weightCurrent={(projection as ProjectionState).weightCurrent ?? null}
                    />
                  )}
                </div>
              ))}
              {isProcessing && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-1" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#0284c7' }}>AI</div>
                  <div className="rounded-2xl px-5 py-4 flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,165,233,0.15)', boxShadow: '0 4px 12px rgba(14,165,233,0.05)' }}>
                    {[0,1,2].map(i => <span key={i} className="block h-1.5 w-1.5 rounded-full bg-sky-500" style={{ animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
            </div>
            <style>{`
              @keyframes dotPulse { 0%,80%,100% { opacity:.2; transform:scale(.8); } 40% { opacity:1; transform:scale(1); } }
              @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
          </div>
        )}
      </div>

      <div className="relative z-10 flex justify-center px-6 py-8" style={{ borderTop: '1px solid rgba(14,165,233,0.15)' }}>
        <VoiceInterface onTranscript={handleTranscript} isProcessing={isProcessing} responseText={currentResponse} />
      </div>
    </div>
  )
}
