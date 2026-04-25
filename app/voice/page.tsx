'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { AlertCircle } from 'lucide-react'

interface PatientHeader {
  id: string
  firstName: string
  lastName: string
  age: number | null
  gender: string | null
}

const SUGGESTIONS = [
  'What are my heart risks?',
  'Tell me about my medications',
  'My latest results',
  "How's my blood pressure?",
]

export default function VoicePage() {
  const [patient, setPatient]       = useState<PatientHeader | null>(null)
  const [dbError, setDbError]       = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking]   = useState(false)
  const [statusText, setStatusText]   = useState('Talk to me')
  const recognitionRef = useRef<any>(null)

  // Keep a stable ref to the latest handleTranscript so recognition doesn't need to re-init
  const handleTranscriptRef = useRef<(text: string) => void>(() => {})

  // ── Load patient ────────────────────────────────────────────────────────────
  useEffect(() => {
    const patientId = process.env.NEXT_PUBLIC_DEFAULT_PATIENT_ID ?? ''
    const url = patientId ? `/api/patient?id=${patientId}` : '/api/patient'
    fetch(url)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) { setDbError(data.error ?? 'Failed to load patient'); return }
        setPatient(data)
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
      handleTranscriptRef.current(e.results[0][0].transcript)
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

  // ── Chat API call ───────────────────────────────────────────────────────────
  const handleTranscript = useCallback(async (transcript: string) => {
    if (!patient) return
    setIsProcessing(true)
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: transcript, patientId: patient.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'API request failed')
      await speak(data.response)
    } catch (err) {
      console.error('Chat error:', err)
      await speak("I'm sorry, I couldn't process that. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }, [patient, speak])

  // Keep ref in sync
  handleTranscriptRef.current = handleTranscript

  const toggleMic = () => {
    const r = recognitionRef.current
    if (!r) { alert('Speech recognition not supported. Try Chrome.'); return }
    if (isListening) { r.stop(); setIsListening(false) }
    else             { r.start(); setIsListening(true)  }
  }

  const handleSuggestion = (text: string) => {
    setStatusText(`"${text}"`)
    handleTranscript(text)
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

          {/* ── Mic button ──────────────────────────────────────────────────── */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '2rem' }}>
            <button
              onClick={toggleMic}
              disabled={!canInteract}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
              style={{
                width: 140, height: 140,
                borderRadius: '50%',
                background: isActive
                  ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255,255,255,0.5)',
                boxShadow: isActive
                  ? '0 20px 60px rgba(139,92,246,0.3), 0 10px 30px rgba(6,182,212,0.2), inset 0 1px 0 rgba(255,255,255,0.5)'
                  : '0 20px 60px rgba(139,92,246,0.15), 0 10px 30px rgba(6,182,212,0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
                cursor: !canInteract ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 2,
                animation: isActive ? 'heartbeat 1.5s ease-in-out infinite' : 'gentlePulse 3s ease-in-out infinite',
                transition: 'background 0.6s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease',
                opacity: !canInteract && !isListening ? 0.75 : 1,
              }}
            >
              <svg
                width="48" height="48" viewBox="0 0 24 24"
                fill="none"
                stroke={isActive ? 'white' : '#8b5cf6'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>

            {/* Breathing glow when active */}
            {isActive && (
              <div
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 140, height: 140, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                  zIndex: 1, filter: 'blur(30px)',
                  animation: 'breathingGlow 2s ease-in-out infinite',
                }}
              />
            )}
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

          {/* Waveform — shown while listening */}
          <div
            style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              gap: 6, height: 70, marginBottom: '2rem',
              visibility: isListening ? 'visible' : 'hidden',
            }}
          >
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 5,
                  background: 'linear-gradient(180deg, #8b5cf6, #06b6d4)',
                  borderRadius: 8,
                  boxShadow: '0 0 10px rgba(139,92,246,0.3)',
                  animation: 'organicWave 1.5s ease-in-out infinite',
                  animationDelay: `${[0,0.1,0.2,0.3,0.4,0.5,0.4,0.3,0.2,0.1][i]}s`,
                }}
              />
            ))}
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
        @keyframes gentlePulse {
          0%, 100% { transform: scale(1);    }
          50%       { transform: scale(1.03); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1);    }
          10%       { transform: scale(1.1);  }
          20%       { transform: scale(1);    }
          30%       { transform: scale(1.08); }
          40%       { transform: scale(1);    }
        }
        @keyframes breathingGlow {
          0%, 100% { opacity: 0.2; transform: translate(-50%, -50%) scale(1);   }
          50%       { opacity: 0.4; transform: translate(-50%, -50%) scale(1.3); }
        }
        @keyframes organicWave {
          0%, 100% { height: 25px; opacity: 0.6; }
          50%       { height: 70px; opacity: 1;   }
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
