'use client'

import { useState, useEffect, useRef } from 'react'
import { VoiceInterface } from '@/components/VoiceInterface'
import { MessageBubble } from '@/components/MessageBubble'
import { ChatMessage } from '@/types/patient'
import { Activity, AlertCircle } from 'lucide-react'

interface PatientHeader {
  id: string
  firstName: string
  lastName: string
  age: number | null
  gender: string | null
}

// ── Ambient AI presence (center glow + breathing circles) ────────────────────
function AmbientPresence({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {/* Outer diffuse glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 480, height: 480,
          background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, rgba(14,165,233,0.02) 50%, transparent 75%)',
          animation: 'breathe 6s ease-in-out infinite',
          filter: 'blur(10px)',
        }}
      />
      {/* Middle ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: 220, height: 220,
          border: `1px solid rgba(14,165,233,${active ? 0.22 : 0.08})`,
          animation: 'breathe 4.5s ease-in-out 0.5s infinite',
          transition: 'border-color 0.8s ease',
        }}
      />
      {/* Inner ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: 120, height: 120,
          border: `1px solid rgba(14,165,233,${active ? 0.40 : 0.15})`,
          boxShadow: active ? '0 0 30px rgba(14,165,233,0.1)' : 'none',
          animation: 'breathe 4s ease-in-out 1s infinite',
          transition: 'border-color 0.8s, box-shadow 0.8s',
        }}
      />
      {/* Core dot */}
      <div
        className="absolute rounded-full"
        style={{
          width: 8, height: 8,
          background: `rgba(14,165,233, ${active ? 0.8 : 0.3})`,
          boxShadow: `0 0 12px 4px rgba(14,165,233, ${active ? 0.3 : 0.08})`,
          transition: 'all 0.8s',
        }}
      />
      <style>{`
        @keyframes breathe {
          0%,100% { transform: scale(1);    opacity: 0.7; }
          50%      { transform: scale(1.04); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Subtle floating particles (pure CSS, no canvas) ───────────────────────────
function FloatingParticles() {
  const dots = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    x: Math.random() * 100,
    y: Math.random() * 100,
    dur: 15 + Math.random() * 20,
    delay: Math.random() * 10,
    warm: Math.random() > 0.85,
  }))

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ filter: 'blur(1.5px)' }}>
      {dots.map(d => (
        <span
          key={d.id}
          className="absolute rounded-full"
          style={{
            width: d.size, height: d.size,
            left: `${d.x}%`, top: `${d.y}%`,
            background: d.warm ? 'rgba(236,72,153,0.3)' : 'rgba(14,165,233,0.4)',
            animation: `floatDot ${d.dur}s ease-in-out ${d.delay}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatDot {
          from { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          to   { transform: translateY(-30px) translateX(15px); opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 select-none">
      <p
        className="text-base font-medium mb-2"
        style={{ color: '#475569' }}
      >
        Ask your digital twin about your health
      </p>
      <p className="text-sm" style={{ color: '#0284c7' }}>
        "What's my risk of heart disease?"
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function VoicePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [patient, setPatient] = useState<PatientHeader | null>(null)
  const [currentResponse, setCurrentResponse] = useState<string>()
  const [dbError, setDbError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Load patient from database on mount ───────────────────────────────────
  // No JSON file. Uses DEFAULT_PATIENT_ID env var or fetches the first
  // patient in the database.
  useEffect(() => {
    const patientId = process.env.NEXT_PUBLIC_DEFAULT_PATIENT_ID ?? ''
    const url = patientId ? `/api/patient?id=${patientId}` : '/api/patient'

    fetch(url)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          // 503 = empty database, 404 = patient not found
          setDbError(data.error ?? 'Failed to load patient')
          return
        }
        setPatient(data)
      })
      .catch(() => setDbError('Could not reach the patient API. Is the server running?'))
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // ── Handle voice transcript → chat API ───────────────────────────────────
  const handleTranscript = async (transcript: string) => {
    if (!patient) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: transcript,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)
    setCurrentResponse(undefined)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send patientId only — the backend loads data from SQLite
        body: JSON.stringify({ message: transcript, patientId: patient.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error ?? 'API request failed')
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, assistantMessage])
      setCurrentResponse(data.response)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Empty database / setup required ──────────────────────────────────────
  if (dbError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="max-w-lg text-center">
          <AlertCircle className="mx-auto mb-6 h-12 w-12 text-amber-400" />
          <h1 className="mb-3 text-xl font-semibold text-white">Database Setup Required</h1>
          <p className="mb-6 text-slate-400">{dbError}</p>
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-left text-sm font-mono text-slate-300">
            <p className="mb-1 text-slate-500"># Download and run Synthea</p>
            <p>java -jar synthea.jar -p 10</p>
            <p className="mt-2 mb-1 text-slate-500"># Move output to expected folder</p>
            <p>New-Item -ItemType Directory -Force -Path public\synthea</p>
            <p>Move-Item -Path output\fhir -Destination public\synthea\ -Force</p>
            <p className="mt-2 mb-1 text-slate-500"># Import into database</p>
            <p>bun run db:import</p>
          </div>
        </div>
      </div>
    )
  }

  // Loading screen
  if (!patient) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#020617' }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 rounded-full"
            style={{
              border: '1.5px solid rgba(0,229,255,0.4)',
              borderTopColor: '#00e5ff',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p className="text-sm" style={{ color: 'rgba(0,229,255,0.5)' }}>
            Loading your twin...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const anyActive = isProcessing

  return (
    <div
      className="flex min-h-screen flex-col relative"
      style={{ background: 'linear-gradient(135deg, #ffffff 0%, #eaf6ff 50%, #f0fbff 100%)', color: '#0f172a' }}
    >
      {/* Subtle background particles */}
      <FloatingParticles />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="relative z-10 flex flex-col items-center py-6 px-6"
        style={{ borderBottom: '1px solid rgba(14,165,233,0.15)' }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1"
          style={{ color: '#0284c7' }}
        >
          Digital Health Twin
        </p>
        <p className="text-sm" style={{ color: '#64748b' }}>
          {patient.firstName} {patient.lastName} {patient.age !== null ? `· ${patient.age} yrs` : ''}
        </p>
      </header>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col">

        {messages.length === 0 ? (
          /* Empty state — fills center with ambient presence */
          <div className="relative flex-1 flex flex-col items-center justify-center">
            <AmbientPresence active={anyActive} />
            <div className="relative z-10">
              <EmptyState />
            </div>
          </div>
        ) : (
          /* Message list */
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-6"
            style={{ scrollbarWidth: 'none' }}
          >
            <div className="mx-auto max-w-2xl space-y-5">
              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} />
              ))}
              {isProcessing && (
                <div className="flex gap-3">
                  <div
                    className="h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-1"
                    style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', color: '#0284c7' }}
                  >
                    AI
                  </div>
                  <div
                    className="rounded-2xl px-5 py-4 flex items-center gap-1.5"
                    style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(14,165,233,0.15)', boxShadow: '0 4px 12px rgba(14,165,233,0.05)' }}
                  >
                    {[0,1,2].map(i => (
                      <span key={i} className="block h-1.5 w-1.5 rounded-full bg-sky-500"
                        style={{ animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <style>{`
              @keyframes dotPulse {
                0%,80%,100% { opacity:.2; transform:scale(.8); }
                40%         { opacity:1;  transform:scale(1); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────────────── */}
      <div
        className="relative z-10 flex justify-center px-6 py-8"
        style={{ borderTop: '1px solid rgba(14,165,233,0.15)' }}
      >
        <VoiceInterface
          onTranscript={handleTranscript}
          isProcessing={isProcessing}
          responseText={currentResponse}
        />
      </div>
    </div>
  )
}
