'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AlertCircle, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { AdaptiveInsightFlow } from '@/components/voice/AdaptiveInsightFlow'
import { DigitalTwinEye } from '@/components/voice/DigitalTwinEye'
import {
  getHealthDomain,
  PatientSnapshot,
  DEFAULT_SNAPSHOT,
  Domain,
} from '@/components/voice/domainConfig'

interface Message {
  role: 'user' | 'assistant'
  text: string
  domain?: Domain
  showAdaptiveFlow?: boolean
}

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

const SUGGESTIONS = [
  'What are my heart risks?',
  'Tell me about my medications',
  'My latest results',
  "How's my blood pressure?",
]

export default function VoicePage() {
  const [patient, setPatient]         = useState<PatientHeader | null>(null)
  const [dbError, setDbError]         = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking]   = useState(false)
  const [statusText, setStatusText]   = useState('Talk to me')
  const [projection, setProjection]   = useState<ProjectionState | null>(null)
  const [snapshot, setSnapshot]       = useState<PatientSnapshot | null>(null)
  const [messages, setMessages]       = useState<Message[]>([])
  const recognitionRef = useRef<any>(null)

  // Stable ref so speech recognition always calls the latest handleUserMessage
  const handleUserMessageRef = useRef<(text: string) => void>(() => {})

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
          setSnapshot({
            age: bm.age, gender: bm.gender,
            ldl: bm.ldl, hdl: bm.hdl,
            systolicBP: bm.systolicBP, diastolicBP: bm.diastolicBP,
            weight: bm.weight, bmi: bm.bmi,
            glucose: bm.glucose, hba1c: bm.hba1c,
          })
        }
      })
      .catch(() => setDbError('Could not reach the patient API. Is the server running?'))
  }, [])

  // ── Init speech recognition once ───────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const recog = new SR()
    recog.continuous     = false
    recog.interimResults = false
    recog.lang           = 'en-US'
    recog.onresult = (e: any) => {
      setIsListening(false)
      handleUserMessageRef.current(e.results[0][0].transcript)
    }
    recog.onerror = () => { setIsListening(false); setStatusText('Talk to me') }
    recog.onend   = () => setIsListening(false)
    recognitionRef.current = recog
  }, [])

  // ── Status text driven by state ─────────────────────────────────────────────
  useEffect(() => {
    if (isListening)  { setStatusText("I'm here"); return }
    if (isProcessing) { setStatusText('Thinking together...'); return }
    if (isSpeaking)   { setStatusText('Sharing with you...'); return }
    setStatusText('Talk to me')
  }, [isListening, isProcessing, isSpeaking])

  // ── Voice helpers ────────────────────────────────────────────────────────────
  const getBestVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices()
    if (!voices.length) return null
    for (const name of ['Google US English', 'Microsoft Zira', 'Samantha', 'Alex']) {
      const match = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'))
      if (match) return match
    }
    return voices.find(v => v.lang === 'en-US') ?? voices.find(v => v.lang.startsWith('en')) ?? null
  }

  const speak = useCallback(async (text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    await new Promise<void>(resolve => {
      if (window.speechSynthesis.getVoices().length > 0) { resolve(); return }
      window.speechSynthesis.onvoiceschanged = () => resolve()
      setTimeout(resolve, 2000)
    })
    const utterance       = new SpeechSynthesisUtterance(text)
    utterance.lang        = 'en-US'
    utterance.rate        = 1.0
    utterance.pitch       = 1.0
    utterance.volume      = 1.0
    const voice = getBestVoice()
    if (voice) utterance.voice = voice
    utterance.onstart = () => setIsSpeaking(true)
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(keepAlive); return }
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    }, 10_000)
    utterance.onend  = () => { clearInterval(keepAlive); setIsSpeaking(false) }
    utterance.onerror = () => { clearInterval(keepAlive); setIsSpeaking(false) }
    window.speechSynthesis.speak(utterance)
  }, [])

  // ── Shared message handler — called by both voice and suggestion chips ──────
  const handleUserMessage = useCallback(async (text: string) => {
    if (!patient) return
    // Detect health domain; fall back to 'lifestyle' for generic future questions
    const domain = getHealthDomain(text) ?? (isFutureQuestion(text) ? 'lifestyle' : null)
    const showAdaptiveFlow = domain !== null
    setMessages(prev => [...prev, { role: 'user', text }])
    setIsProcessing(true)
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, patientId: patient.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'API request failed')
      setMessages(prev => [...prev, {
        role: 'assistant', text: data.response,
        domain: domain ?? undefined,
        showAdaptiveFlow,
      }])
      await speak(data.response)
    } catch (err) {
      console.error('Chat error:', err)
      const errMsg = "I'm sorry, I couldn't process that. Please try again."
      setMessages(prev => [...prev, { role: 'assistant', text: errMsg }])
      await speak(errMsg)
    } finally {
      setIsProcessing(false)
    }
  }, [patient, speak])

  // Keep ref in sync so speech recognition always calls the latest version
  handleUserMessageRef.current = handleUserMessage

  const toggleMic = () => {
    const r = recognitionRef.current
    if (!r) { alert('Speech recognition not supported. Try Chrome.'); return }
    if (isListening) { r.stop(); setIsListening(false) }
    else             { r.start(); setIsListening(true)  }
  }

  const handleSuggestion = (text: string) => {
    setStatusText(`"${text}"`)
    handleUserMessage(text)
  }

  const isActive   = isListening || isProcessing || isSpeaking
  const canInteract = !isProcessing && !isSpeaking

  // ── Error state ─────────────────────────────────────────────────────────────
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

  // ── Loading state ───────────────────────────────────────────────────────────
  if (!patient) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #fefefe 0%, #f0f9ff 40%, #e0f2fe 100%)' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 rounded-full"
            style={{
              border: '1.5px solid rgba(139,92,246,0.4)',
              borderTopColor: '#8b5cf6',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p className="text-sm" style={{ color: '#64748b' }}>Loading your twin...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, #fefefe 0%, #f0f9ff 40%, #e0f2fe 100%)',
        animation: 'gentleGradient 60s ease-in-out infinite',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#1a1a1a',
      }}
    >
      {/* ── Pink/violet/cyan accent bar ──────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 z-50"
        style={{ height: 3, background: 'linear-gradient(90deg, #f472b6, #8b5cf6, #06b6d4)' }}
      />

      {/* ── Wireframe face + human shadow ────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center" style={{ zIndex: 0 }}>
        {/* Human shadow silhouette */}
        <div
          style={{
            position: 'absolute',
            width: 700, height: 700,
            background: 'radial-gradient(ellipse 45% 55% at 50% 45%, rgba(139,92,246,0.08) 0%, rgba(6,182,212,0.06) 30%, rgba(244,114,182,0.04) 60%, transparent 100%)',
            borderRadius: '45% 45% 50% 50% / 55% 55% 45% 45%',
            filter: 'blur(40px)',
            animation: 'humanPulse 8s ease-in-out infinite',
          }}
        />
        {/* Warm glow aura */}
        <div
          style={{
            position: 'absolute',
            width: 800, height: 800,
            background: 'radial-gradient(circle, rgba(244,114,182,0.15) 0%, transparent 70%)',
            animation: 'auraPulse 4s ease-in-out infinite',
          }}
        />
        {/* Wireframe face image (breathing) */}
        <div
          style={{
            position: 'absolute',
            width: 700, height: 700,
            opacity: 0.12,
            animation: 'faceBreathe 6s ease-in-out infinite',
          }}
        >
          <img
            src="/wireframe-face-bg.png"
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain',
              filter: 'brightness(1.4) contrast(0.8) hue-rotate(10deg)',
              mixBlendMode: 'multiply',
            }}
          />
        </div>
      </div>

      {/* ── Content layer ────────────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6"
        style={{ paddingTop: '7rem', paddingBottom: '5rem' }}
      >

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
          <div
            style={{
              fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.15em',
              textTransform: 'uppercase', marginBottom: '0.75rem',
              background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}
          >
            Your Health Twin
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 400 }}>
            {patient.firstName} {patient.lastName}{patient.age !== null ? ` · ${patient.age} yrs` : ''}
          </div>
        </div>

        {/* ── View Profile link ───────────────────────────────────────────────── */}
        <Link
          href="/profile"
          className="absolute top-12 right-6 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:bg-sky-50"
          style={{ color: '#0284c7', border: '1px solid rgba(14,165,233,0.2)' }}
        >
          <UserCircle className="h-4 w-4" />
          View Profile
        </Link>

        {/* ── Voice interface ─────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center" style={{ maxWidth: 700 }}>

          {/* Greeting */}
          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontWeight: 300,
              color: '#1a1a1a',
              marginBottom: '1.25rem',
              lineHeight: 1.3,
              letterSpacing: '-0.02em',
            }}
          >
            What's on your mind about{' '}
            <strong
              style={{
                fontWeight: 600,
                background: 'linear-gradient(120deg, #06b6d4, #8b5cf6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}
            >
              your health?
            </strong>
          </h1>

          <p style={{ fontSize: '1.125rem', color: '#64748b', marginBottom: '3.5rem', lineHeight: 1.7, fontWeight: 400 }}>
            I'm here to understand your health journey with you
          </p>

          {/* ── Digital Twin Eye ────────────────────────────────────────────── */}
          <div style={{ marginBottom: '1.5rem' }}>
            <DigitalTwinEye
              isListening={isListening}
              canInteract={canInteract}
              onClick={toggleMic}
              size={260}
            />
          </div>

          {/* Status text */}
          <div
            style={{
              fontSize: '0.9375rem',
              ...(isActive
                ? {
                    background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }
                : { color: '#64748b' }),
              fontWeight: 500,
              minHeight: '1.5rem',
              marginBottom: '1.5rem',
              transition: 'all 0.4s ease',
            }}
          >
            {statusText}
          </div>

          {/* Suggestion chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center', maxWidth: 750 }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s}
                onClick={() => canInteract && handleSuggestion(s)}
                disabled={!canInteract}
                style={{
                  padding: '1rem 1.75rem',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
                  backdropFilter: 'blur(10px)',
                  border: 'none',
                  borderRadius: 24,
                  fontSize: '0.875rem',
                  color: '#1a1a1a',
                  cursor: !canInteract ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 24px rgba(139,92,246,0.08), 0 2px 8px rgba(6,182,212,0.05)',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  animation: `float 4s ease-in-out ${i * 0.5}s infinite`,
                  opacity: !canInteract ? 0.6 : 1,
                  transition: 'opacity 0.3s ease',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Message history + adaptive insight panels */}
          {messages.length > 0 && (
            <div style={{ marginTop: '2.5rem', width: '100%', maxWidth: 750, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'user' ? (
                    <div style={{
                      alignSelf: 'flex-end',
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))',
                      border: '1px solid rgba(139,92,246,0.2)',
                      borderRadius: 16,
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      color: '#334155',
                      lineHeight: 1.6,
                      textAlign: 'right',
                    }}>
                      {msg.text}
                    </div>
                  ) : (
                    <div>
                      {msg.showAdaptiveFlow && msg.domain ? (
                        // Guided response: no text bubble — narration strip is inside the dashboard
                        <AdaptiveInsightFlow
                          domain={msg.domain}
                          snapshot={snapshot}
                          isActivelySpeaking={isSpeaking && i === messages.length - 1}
                          fullText={msg.text}
                        />
                      ) : (
                        // Normal response: plain text bubble
                        <div style={{
                          background: 'rgba(255,255,255,0.7)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(14,165,233,0.15)',
                          borderRadius: 16,
                          padding: '0.75rem 1rem',
                          fontSize: '0.875rem',
                          color: '#334155',
                          lineHeight: 1.6,
                        }}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
            <span
              style={{
                width: 10, height: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #f472b6, #8b5cf6)',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'heartbeatDot 2s ease-in-out infinite',
                boxShadow: '0 0 15px rgba(244,114,182,0.4)',
              }}
            />
            Your Health Twin is listening
          </div>
        </div>
      </div>

      {/* ── Keyframes ──────────────────────────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

        @keyframes gentleGradient {
          0%, 100% { background: linear-gradient(135deg, #fefefe 0%, #f0f9ff 40%, #e0f2fe 100%); }
          50%       { background: linear-gradient(135deg, #fefefe 0%, #fdf4ff 40%, #f3e8ff 100%); }
        }
        @keyframes faceBreathe {
          0%, 100% { transform: scale(1);    opacity: 0.12; }
          50%       { transform: scale(1.02); opacity: 0.15; }
        }
        @keyframes humanPulse {
          0%, 100% { opacity: 0.4; transform: scale(1);    }
          50%       { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes auraPulse {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.6; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        @keyframes heartbeatDot {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          10%       { transform: scale(1.3); opacity: 0.8; }
          20%       { transform: scale(1);   opacity: 1;   }
          30%       { transform: scale(1.2); opacity: 0.9; }
          40%       { transform: scale(1);   opacity: 1;   }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
