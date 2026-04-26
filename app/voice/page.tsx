'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { TopNav } from '@/components/TopNav'
import type { Citation } from '@/types/patient'
import { getHealthDomain } from '@/components/voice/domainConfig'
import type { PatientSnapshot, Domain } from '@/components/voice/domainConfig'

const AdaptiveInsightFlow = dynamic(
  () => import('@/components/voice/AdaptiveInsightFlow').then(mod => mod.AdaptiveInsightFlow),
  { ssr: false },
)

const DigitalTwinEye = dynamic(
  () => import('@/components/voice/DigitalTwinEye').then(mod => mod.DigitalTwinEye),
  { ssr: false },
)

// ── Orb layout constants ──────────────────────────────────────────────────────
const ORB_SIZE   = 240
const ORB_MINI   = 0.55           // scale when retracted
const CORNER_PAD = 20             // px from right / top edge
const CORNER_TOP = 66             // clears fixed header

// ── Icons ─────────────────────────────────────────────────────────────────────

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="mx-auto mb-6 h-12 w-12 text-amber-400">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7.5v5" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className="h-3.5 w-3.5">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9.25" opacity="0.35" />
    </svg>
  )
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#fff' : '#475569'} strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2.5" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#8b5cf6" aria-hidden="true">
      <path d="M6 4.5l14 7.5-14 7.5V4.5z" />
    </svg>
  )
}

function RedoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
  domain?: Domain
  showAdaptiveFlow?: boolean
  citations?: Citation[]
  evidence?: {
    topics: string[]
    query: string
    evidenceStatus: 'ok' | 'stale-cache' | 'unavailable'
    cacheHit: boolean
    retrievedAt: string | null
  }
}

interface PatientHeader {
  id: string
  firstName: string
  lastName: string
  displayName?: string
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

// ── Intent detection ──────────────────────────────────────────────────────────

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

const DOMAIN_SUGGESTIONS: Partial<Record<Domain, string[]>> = {
  cardiovascular: [
    'How can we reduce my cardiac risk?',
    'Which numbers matter most right now?',
    'What should we monitor next?',
  ],
  metabolic: [
    'Which biomarker is most concerning?',
    'What trend changed the most?',
    'How often should we recheck labs?',
  ],
  lifestyle: [
    'What lifestyle change helps the most?',
    'What happens if I stay on this path?',
    'What is the fastest risk reduction step?',
  ],
  medication: [
    'What side effects should we watch for?',
    'How are my medications helping?',
    'What labs should we follow with treatment?',
  ],
}

function getFollowUpSuggestions(msg?: Message): string[] {
  if (!msg?.domain) return SUGGESTIONS
  return DOMAIN_SUGGESTIONS[msg.domain] ?? SUGGESTIONS
}

const VOICE_PATIENT_PRESET = 'chadwick'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VoicePage() {
  const [patient,       setPatient]       = useState<PatientHeader | null>(null)
  const [loadError,     setLoadError]     = useState<string | null>(null)
  const [isChatHidden,  setIsChatHidden]  = useState(false)
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false)
  const [isListening,   setIsListening]   = useState(false)
  const [isStartingListening, setIsStartingListening] = useState(false)
  const [isProcessing,  setIsProcessing]  = useState(false)
  const [voiceState,    setVoiceState]    = useState<'idle' | 'speaking' | 'paused'>('idle')
  const [statusText,    setStatusText]    = useState('Talk to me')
  const [snapshot,      setSnapshot]      = useState<PatientSnapshot | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [visibleSuggestions, setVisibleSuggestions] = useState<string[]>([])
  const [suggestionsMessageId, setSuggestionsMessageId] = useState<number | null>(null)
  const [viewW,         setViewW]         = useState(0)
  const [viewH,         setViewH]         = useState(0)

  const recognitionRef     = useRef<any>(null)
  const handleUserMsgRef   = useRef<(text: string) => void>(() => {})
  const contentScrollRef   = useRef<HTMLDivElement>(null)
  const keepAliveRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastSpokenTextRef  = useRef<string>('')
  const userCancelledRef   = useRef(false)
  const nextMessageIdRef   = useRef(1)
  const speechWatchdogRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  // Viewport
  useEffect(() => {
    const update = () => { setViewW(window.innerWidth); setViewH(window.innerHeight) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Patient + biomarkers
  useEffect(() => {
    let mounted = true
    const controller = new AbortController()
    
    // Timeout fallback: 5 seconds
    const timeoutId = setTimeout(() => {
      if (mounted && !patient) {
        console.error('[VoicePage] Loading timeout: 5s limit reached')
        controller.abort()
        setLoadError('Connection timed out. We couldn\'t reach your twin data in time.')
      }
    }, 5000)

    const patientUrl = `/api/patient?preset=${VOICE_PATIENT_PRESET}`
    fetch(patientUrl, { signal: controller.signal })
      .then(async res => {
        if (!mounted) return
        const data = await res.json()
        
        if (!res.ok) { 
          console.error('[VoicePage] Patient API error:', data.error)
          setLoadError(data.error ?? 'Failed to load patient profile.')
          clearTimeout(timeoutId)
          return 
        }
        
        setPatient(data)
        
        const bioUrl = `/api/biomarkers?id=${data.id}&preset=${VOICE_PATIENT_PRESET}`
        const bioRes = await fetch(bioUrl, { signal: controller.signal })
        if (bioRes.ok) {
          const bm: PatientBiomarkersRaw = await bioRes.json()
          setSnapshot({
            age: bm.age, gender: bm.gender,
            ldl: bm.ldl, hdl: bm.hdl,
            systolicBP: bm.systolicBP, diastolicBP: bm.diastolicBP,
            weight: bm.weight, bmi: bm.bmi,
            glucose: bm.glucose, hba1c: bm.hba1c,
          })
        }
        clearTimeout(timeoutId)
      })
      .catch((err) => {
        if (!mounted) return
        if (err.name === 'AbortError') return
        console.error('[VoicePage] Fetch failure:', err)
        setLoadError('Network error: Could not reach the medical database.')
        clearTimeout(timeoutId)
      })

    return () => { 
      mounted = false
      controller.abort()
      clearTimeout(timeoutId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const recog = new SR()
    recog.continuous = false
    recog.interimResults = false
    recog.lang = 'en-US'
    recog.onresult = (e: any) => {
      setIsStartingListening(false)
      setIsListening(false)
      handleUserMsgRef.current(e.results[0][0].transcript)
    }
    recog.onerror  = () => { setIsStartingListening(false); setIsListening(false); setStatusText('Talk to me') }
    recog.onend    = () => { setIsStartingListening(false); setIsListening(false) }
    recognitionRef.current = recog
  }, [])

  // Status text
  useEffect(() => {
    if (isListening)               { setStatusText("I'm here"); return }
    if (isStartingListening)       { setStatusText('Opening mic...'); return }
    if (isProcessing)              { setStatusText('Thinking together...'); return }
    if (voiceState === 'speaking') { setStatusText('Stop'); return }
    if (voiceState === 'paused')   { setStatusText('Resume'); return }
    setStatusText('Talk to me')
  }, [isListening, isProcessing, isStartingListening, voiceState])

  // Auto-scroll active content to bottom on new messages
  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = contentScrollRef.current.scrollHeight
    }
  }, [messages.length])

  useEffect(() => {
    if (voiceState !== 'idle' || isProcessing) return
    const latestAssistant = messages.filter(m => m.role === 'assistant').at(-1)
    if (!latestAssistant || suggestionsMessageId === latestAssistant.id) return
    setVisibleSuggestions(getFollowUpSuggestions(latestAssistant))
    setSuggestionsMessageId(latestAssistant.id)
  }, [isProcessing, messages, suggestionsMessageId, voiceState])

  useEffect(() => {
    return () => {
      if (speechWatchdogRef.current) {
        clearInterval(speechWatchdogRef.current)
        speechWatchdogRef.current = null
      }
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current)
        keepAliveRef.current = null
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

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

  const finishSpeechPlayback = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
    if (speechWatchdogRef.current) {
      clearInterval(speechWatchdogRef.current)
      speechWatchdogRef.current = null
    }
    setVoiceState('idle')
    userCancelledRef.current = false
  }, [])

  const cancelSpeechPlayback = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    finishSpeechPlayback()
  }, [finishSpeechPlayback])

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (recognition) {
      try { recognition.stop() } catch {}
    }
    setIsListening(false)
    setIsStartingListening(false)
  }, [])

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition) {
      alert('Speech recognition not supported. Try Chrome.')
      return
    }

    stopListening()
    if (voiceState !== 'idle') {
      userCancelledRef.current = true
      cancelSpeechPlayback()
    }

    setIsStartingListening(true)
    try {
      recognition.start()
      setIsListening(true)
    } catch {
      setIsListening(false)
    } finally {
      setIsStartingListening(false)
    }
  }, [cancelSpeechPlayback, stopListening, voiceState])

  const speakResponse = useCallback(async (text: string) => {
    if (!('speechSynthesis' in window)) return

    finishSpeechPlayback()
    window.speechSynthesis.cancel()
    lastSpokenTextRef.current = text
    userCancelledRef.current = false

    await new Promise<void>(resolve => {
      if (window.speechSynthesis.getVoices().length > 0) { resolve(); return }
      window.speechSynthesis.onvoiceschanged = () => resolve()
      setTimeout(resolve, 2000)
    })

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0
    const voice = getBestVoice()
    if (voice) utterance.voice = voice

    utterance.onstart = () => setVoiceState('speaking')
    keepAliveRef.current = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null }
        return
      }
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    }, 10_000)

    utterance.onend = () => finishSpeechPlayback()
    utterance.onerror = () => finishSpeechPlayback()

    speechWatchdogRef.current = setInterval(() => {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        finishSpeechPlayback()
      }
    }, 500)

    window.speechSynthesis.speak(utterance)
  }, [finishSpeechPlayback])

  const handleUserMessage = useCallback(async (text: string) => {
    if (!patient) return
    const domain = getHealthDomain(text) ?? (isFutureQuestion(text) ? 'lifestyle' : null)
    const showAdaptiveFlow = domain !== null
    setVisibleSuggestions([])
    setMessages(prev => [...prev, { id: nextMessageIdRef.current++, role: 'user', text }])
    setIsProcessing(true)
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, patientId: patient.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'API request failed')
      setMessages(prev => [...prev, {
        id: nextMessageIdRef.current++,
        role: 'assistant', text: data.response,
        domain: domain ?? undefined, showAdaptiveFlow,
        citations: data.citations ?? [], evidence: data.evidence,
      }])
      await speakResponse(data.response)
    } catch {
      const errMsg = "I'm sorry, I couldn't process that. Please try again."
      setMessages(prev => [...prev, { id: nextMessageIdRef.current++, role: 'assistant', text: errMsg }])
      await speakResponse(errMsg)
    } finally {
      setIsProcessing(false)
    }
  }, [patient, speakResponse])

  handleUserMsgRef.current = handleUserMessage

  const toggleMic = () => {
    if (isProcessing) return
    if (isListening) {
      stopListening()
      return
    }
    startListening()
  }

  const handleSuggestion = (text: string) => {
    setVisibleSuggestions([])
    setStatusText(`"${text}"`)
    handleUserMessage(text)
  }

  const handleVoicePillClick = () => {
    if (isProcessing) return
    if (voiceState === 'speaking' || voiceState === 'paused') {
      startListening()
      return
    }
    toggleMic()
  }

  const handleContinueSpeech = () => {
    userCancelledRef.current = false
    // A known fix for resume() not firing: pause and resume immediately
    window.speechSynthesis.resume()
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    }

    // Restart the keep-alive interval
    if (!keepAliveRef.current) {
      keepAliveRef.current = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null }
          return
        }
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }, 10_000)
    }

    setVoiceState('speaking')
  }

  const handleRedoSpeech = () => {
    if (lastSpokenTextRef.current) speakResponse(lastSpokenTextRef.current)
  }

  const handleReset = useCallback(() => {
    userCancelledRef.current = true
    stopListening()
    if (speechWatchdogRef.current) { clearInterval(speechWatchdogRef.current); speechWatchdogRef.current = null }
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    setMessages([])
    setVisibleSuggestions([])
    setSuggestionsMessageId(null)
    setIsTranscriptOpen(false)
    setVoiceState('idle')
    setIsProcessing(false)
    setIsStartingListening(false)
    setStatusText('Talk to me')
    setIsChatHidden(false)
  }, [stopListening]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewQuestion = () => {
    setIsChatHidden(true)
    setVisibleSuggestions([])
    setIsTranscriptOpen(false)
    userCancelledRef.current = true
    cancelSpeechPlayback()
    stopListening()
    setTimeout(() => {
      startListening()
    }, 750)
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const orbRetracted  = (messages.length > 0 || isProcessing) && !isChatHidden
  const readyForNextQuestion = !isProcessing && !isStartingListening && !isListening && voiceState === 'idle'
  const isActive      = isListening || isStartingListening || isProcessing || voiceState !== 'idle'
  const canInteract   = !isProcessing && !isStartingListening

  // Orb animation target
  const orbAnimate = viewW > 0
    ? orbRetracted
      ? { x: viewW - ORB_SIZE * ORB_MINI - CORNER_PAD, y: CORNER_TOP, scale: ORB_MINI }
      : { x: viewW / 2 - ORB_SIZE / 2, y: viewH / 2 - ORB_SIZE / 2, scale: 1 }
    : { x: -ORB_SIZE, y: 0, scale: 1 }   // hidden offscreen until viewport measured

  const lastAiMsg       = messages.filter(m => m.role === 'assistant').at(-1)
  const lastUserMsg     = messages.filter(m => m.role === 'user').at(-1)
  const showDashboard   = !!(lastAiMsg?.showAdaptiveFlow && lastAiMsg?.domain)
  const lastMsgSpeaking = voiceState === 'speaking' && messages.at(-1)?.role === 'assistant'
  const hasTranscript   = !!lastAiMsg?.text
  const reserveDrawerSpace = isTranscriptOpen && viewW > 960

  // ── Error state ──────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-8 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertIcon />
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-900">Could not load twin</h1>
        <p className="max-w-xs text-sm text-slate-500 leading-relaxed mb-8">
          {loadError}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="rounded-full bg-slate-900 px-8 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 hover-lift shadow-lg shadow-slate-200"
        >
          Try Again
        </button>
      </div>
    )
  }

  // ── Loading state ────────────────────────────────────────────────────────────

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, #fefefe 0%, #f0f9ff 40%, #e0f2fe 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full" style={{ border: '1.5px solid rgba(139,92,246,0.4)', borderTopColor: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
          <p className="text-sm" style={{ color: '#64748b' }}>Loading your twin...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden',
        background: 'linear-gradient(135deg, #fefefe 0%, #f0f9ff 40%, #e0f2fe 100%)',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#1a1a1a',
      }}
    >
      {/* ── Ambient background ─────────────────────────────────────────────── */}
      <div className="pointer-events-none" style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <div className="fixed inset-0 z-0 bg-[#F8FAFC]" />
      <motion.div
        aria-hidden="true"
        animate={{
          y: orbRetracted ? -16 : 10,
          scale: orbRetracted ? 0.96 : 1.02,
          opacity: orbRetracted ? 0.032 : 0.048,
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)',
          maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 80%)',
        }}
      >
        <Image
          src="/dualis-logo.png"
          alt=""
          aria-hidden="true"
          width={1200}
          height={1200}
          priority
          style={{
            width: 'auto',
            height: '72vh',
            maxWidth: '76vw',
            objectFit: 'contain',
            mixBlendMode: 'soft-light',
            filter: 'grayscale(0.2) saturate(0.45) blur(20px)',
            boxShadow: '0 0 120px rgba(100,150,255,0.08)',
          }}
        />
      </motion.div>
      </div>

      {/* ── Accent bar ─────────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f472b6, #8b5cf6, #06b6d4)', zIndex: 100 }} />

      {/* ── Fixed top nav ───────────────────────────────────────────────────── */}
      <TopNav />

      {/* New conversation — appears in active state */}
      <AnimatePresence>
        {messages.length > 0 && (
          <motion.button
            key="history-toggle"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.25 }}
            onClick={() => isChatHidden ? setIsChatHidden(false) : (isActive ? handleReset() : handleNewQuestion())}
            style={{
              position: 'fixed', top: 14, right: hasTranscript && viewW > 720 ? 176 : 20, zIndex: 41,
              background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20,
              padding: '7px 16px', fontSize: 12, fontWeight: 700,
              color: '#4f46e5', cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 4px 15px rgba(139,92,246,0.12)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isChatHidden ? 'My latest results →' : (isActive ? '↩ Clear' : '+ New Question')}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hasTranscript && !isChatHidden && (
          <motion.button
            key="transcript-toggle"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.25 }}
            onClick={() => setIsTranscriptOpen(prev => !prev)}
            style={{
              position: 'fixed', top: 14, right: 20, zIndex: 41,
              background: isTranscriptOpen ? 'linear-gradient(135deg, #0f766e, #0891b2)' : 'rgba(255,255,255,0.92)',
              color: isTranscriptOpen ? '#ffffff' : '#0f766e',
              backdropFilter: 'blur(10px)',
              border: isTranscriptOpen ? '1px solid rgba(15,118,110,0.2)' : '1px solid rgba(15,118,110,0.16)',
              borderRadius: 20,
              padding: '7px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 4px 15px rgba(15,118,110,0.12)',
            }}
          >
            {isTranscriptOpen ? 'Close transcript' : 'Read explanation'}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── ORB — always mounted, position/scale animated ───────────────────── */}
      <motion.div
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 50, transformOrigin: 'top left' }}
        animate={orbAnimate}
        transition={{ duration: 0.65, ease: [0.42, 0, 0.18, 1] }}
      >
        <DigitalTwinEye
          isListening={isListening}
          canInteract={canInteract}
          onClick={toggleMic}
          size={ORB_SIZE}
        />
      </motion.div>

      {/* ──────────────────────────────────────────────────────────────────────
          STATE 1: IDLE — orb centered, greeting + suggestions visible
      ────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!orbRetracted && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.45 }}
            style={{ position: 'fixed', inset: 0, zIndex: 20 }}
          >
            {/* Greeting — positioned above the centered orb */}
            <div style={{
              position: 'absolute', top: '11%', left: 0, right: 0,
              textAlign: 'center', padding: '0 28px',
            }}>
              <h1 style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 'clamp(1.75rem, 4vw, 2.6rem)',
                fontWeight: 300, color: '#1a1a1a',
                lineHeight: 1.3, letterSpacing: '-0.02em', marginBottom: 14,
              }}>
                What's on your mind about{' '}
                <strong style={{
                  fontWeight: 600,
                  background: 'linear-gradient(120deg, #06b6d4, #8b5cf6)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  your health?
                </strong>
              </h1>
              <p style={{ fontSize: 17, color: '#64748b', fontWeight: 400, lineHeight: 1.6 }}>
                I'm here to understand your health journey with you
              </p>
            </div>

            {/* Status text + suggestions — below orb */}
            <div style={{
              position: 'absolute', bottom: 86, left: 0, right: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 18, padding: '0 28px',
            }}>
              <div style={{
                fontSize: 15, fontWeight: 500,
                color: isActive ? '#8b5cf6' : '#64748b',
                minHeight: '1.5rem', transition: 'color 0.4s ease',
              }}>
                {statusText}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', maxWidth: 720 }}>
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    onClick={() => canInteract && handleSuggestion(s)}
                    disabled={!canInteract}
                    animate={{ y: [0, -7, 0] }}
                    transition={{ duration: 4, delay: i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      padding: '13px 22px',
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
                      backdropFilter: 'blur(10px)', border: 'none',
                      borderRadius: 24, fontSize: 14, color: '#1a1a1a',
                      cursor: !canInteract ? 'not-allowed' : 'pointer',
                      boxShadow: '0 6px 20px rgba(139,92,246,0.08), 0 2px 8px rgba(6,182,212,0.05)',
                      fontWeight: 500, fontFamily: 'inherit',
                      opacity: !canInteract ? 0.6 : 1, transition: 'opacity 0.3s',
                    }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────────────────
          STATES 2–3: ACTIVE — orb in corner, content fills main area
      ────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {orbRetracted && (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.55, delay: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            ref={contentScrollRef}
            style={{
              position: 'fixed',
              top: 56,
              bottom: 82,
              left: 20,
              right: reserveDrawerSpace ? 396 : 20,
              zIndex: 20,
              overflowY: 'auto',
              overflowX: 'hidden',
              transition: 'right 0.3s ease',
            }}
          >
            {showDashboard ? (
              /* ── Dashboard mode: full-panel grid ───────────────────────────── */
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', gap: 10 }}>

                {/* Context bubble — last question */}
                {lastUserMsg && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}
                  >
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.06))',
                      border: '1px solid rgba(139,92,246,0.15)',
                      borderRadius: 14, padding: '8px 14px',
                      fontSize: 13, color: '#334155', maxWidth: '72%',
                    }}>
                      {lastUserMsg.text}
                    </div>
                  </motion.div>
                )}

                {/* Processing indicator */}
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 2px' }}
                  >
                    {[0, 1, 2].map(j => (
                      <span key={j} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                        display: 'inline-block',
                        animation: 'speakDot 1.2s ease-in-out infinite',
                        animationDelay: `${j * 0.2}s`,
                      }} />
                    ))}
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Analyzing…</span>
                  </motion.div>
                )}

                {/* Dashboard fills remaining space */}
                {lastAiMsg?.showAdaptiveFlow && lastAiMsg.domain && (
                  <div style={{ flex: 1 }}>
                    <AdaptiveInsightFlow
                      domain={lastAiMsg.domain}
                      snapshot={snapshot}
                      isActivelySpeaking={lastMsgSpeaking}
                      fullText=""
                    />
                  </div>
                )}

                {lastAiMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.08 }}
                    style={{
                      background: 'rgba(255,255,255,0.84)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(15,118,110,0.12)',
                      borderRadius: 18,
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0f766e', marginBottom: 4 }}>
                          Clinical Twin Summary
                        </div>
                        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                          Spoken interpretation is active. Visual decision support stays on the main surface, and the transcript opens only if requested.
                        </div>
                      </div>
                      <button
                        onClick={() => setIsTranscriptOpen(true)}
                        style={{
                          border: '1px solid rgba(15,118,110,0.16)',
                          background: 'rgba(240,253,250,0.95)',
                          color: '#0f766e',
                          borderRadius: 999,
                          padding: '10px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Open transcript
                      </button>
                    </div>

                    {(lastAiMsg.evidence || (lastAiMsg.citations && lastAiMsg.citations.length > 0)) && (
                      <details style={{
                        marginTop: 12,
                        borderRadius: 14,
                        border: '1px solid rgba(14,165,233,0.12)',
                        background: 'rgba(248,250,252,0.92)',
                        padding: '10px 12px',
                      }}>
                        <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
                          PubMed evidence
                        </summary>
                        <div style={{ marginTop: 10 }}>
                          {lastAiMsg.evidence && (
                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: lastAiMsg.citations?.length ? 8 : 0 }}>
                              <div>Status: {lastAiMsg.evidence.evidenceStatus === 'ok' ? 'Verified PubMed evidence' : lastAiMsg.evidence.evidenceStatus === 'stale-cache' ? 'From cache' : 'Unavailable'}</div>
                              {lastAiMsg.evidence.topics.length > 0 && <div>Topics: {lastAiMsg.evidence.topics.join(', ')}</div>}
                            </div>
                          )}
                          {lastAiMsg.citations && lastAiMsg.citations.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {lastAiMsg.citations.map((c, ci) => (
                                <a
                                  key={`${c.pmid}-${ci}`}
                                  href={c.url ?? `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#0284c7', fontSize: 12, lineHeight: 1.5, textDecoration: 'none' }}
                                >
                                  [{ci + 1}] {c.title} ({c.year})
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </motion.div>
                )}
              </div>

            ) : (
              /* ── Chat mode: message thread ─────────────────────────────────── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12 }}>

                {lastUserMsg && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    style={{ display: 'flex', justifyContent: 'flex-end' }}
                  >
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(6,182,212,0.06))',
                      border: '1px solid rgba(139,92,246,0.15)',
                      borderRadius: 16, padding: '10px 14px',
                      fontSize: 14, color: '#334155', maxWidth: '75%', lineHeight: 1.55,
                    }}>
                      {lastUserMsg.text}
                    </div>
                  </motion.div>
                )}

                {lastAiMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    style={{
                      background: 'rgba(255,255,255,0.84)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(14,165,233,0.12)',
                      borderRadius: 20,
                      padding: '16px 18px',
                      boxShadow: '0 10px 30px rgba(148,163,184,0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
                          Decision Support
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em', marginBottom: 6 }}>
                          Spoken answer delivered
                        </div>
                        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, maxWidth: 560 }}>
                          Your twin has narrated the full interpretation aloud. The main surface stays focused on interaction, evidence, and clinical context.
                        </div>
                      </div>
                      <button
                        onClick={() => setIsTranscriptOpen(true)}
                        style={{
                          border: '1px solid rgba(15,118,110,0.16)',
                          background: 'rgba(240,253,250,0.95)',
                          color: '#0f766e',
                          borderRadius: 999,
                          padding: '10px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        Open transcript
                      </button>
                    </div>

                    {(lastAiMsg.evidence || (lastAiMsg.citations && lastAiMsg.citations.length > 0)) && (
                      <details style={{
                        marginTop: 14,
                        borderRadius: 14,
                        border: '1px solid rgba(14,165,233,0.12)',
                        background: 'rgba(248,250,252,0.92)',
                        padding: '10px 12px',
                      }}>
                        <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0369a1' }}>
                          PubMed evidence
                        </summary>
                        <div style={{ marginTop: 10 }}>
                          {lastAiMsg.evidence && (
                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: lastAiMsg.citations?.length ? 8 : 0 }}>
                              <div>Status: {lastAiMsg.evidence.evidenceStatus === 'ok' ? 'Verified PubMed evidence' : lastAiMsg.evidence.evidenceStatus === 'stale-cache' ? 'From cache' : 'Unavailable'}</div>
                              {lastAiMsg.evidence.topics.length > 0 && <div>Topics: {lastAiMsg.evidence.topics.join(', ')}</div>}
                            </div>
                          )}
                          {lastAiMsg.citations && lastAiMsg.citations.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {lastAiMsg.citations.map((c, ci) => (
                                <a
                                  key={`${c.pmid}-${ci}`}
                                  href={c.url ?? `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: '#0284c7', fontSize: 12, lineHeight: 1.5, textDecoration: 'none' }}
                                >
                                  [{ci + 1}] {c.title} ({c.year})
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </motion.div>
                )}

                {/* Processing state in chat mode */}
                {isProcessing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 2px' }}>
                    {[0, 1, 2].map(j => (
                      <span key={j} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                        display: 'inline-block',
                        animation: 'speakDot 1.2s ease-in-out infinite',
                        animationDelay: `${j * 0.2}s`,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ──────────────────────────────────────────────────────────────────────
          BOTTOM BAR — always fixed, adapts to state
      ────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {orbRetracted && visibleSuggestions.length > 0 && !isProcessing && voiceState === 'idle' && (
          <motion.div
            key={`follow-up-${suggestionsMessageId ?? 'default'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.24 }}
            style={{
              position: 'fixed',
              left: 20,
              right: reserveDrawerSpace ? 396 : 20,
              bottom: 90,
              zIndex: 29,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              transition: 'right 0.3s ease',
            }}
          >
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 12,
              maxWidth: 880,
              pointerEvents: 'auto',
            }}>
              {visibleSuggestions.map((suggestion, i) => (
                <motion.button
                  key={`${suggestionsMessageId ?? 'base'}-${suggestion}`}
                  onClick={() => handleSuggestion(suggestion)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  style={{
                    padding: '13px 22px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.94), rgba(255,255,255,0.78))',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(139,92,246,0.16)',
                    borderRadius: 24,
                    fontSize: 14,
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(139,92,246,0.08), 0 2px 8px rgba(6,182,212,0.05)',
                    fontWeight: 500,
                    fontFamily: 'inherit',
                  }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 82,
        zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <AnimatePresence mode="wait">
          {orbRetracted ? (
            /* Active controls: pill with mic + status */
            <motion.div
              key="active-bar"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.3 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(139,92,246,0.14)',
                borderRadius: 40, padding: '8px 18px',
                boxShadow: '0 4px 24px rgba(139,92,246,0.1), 0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              {voiceState === 'paused' && (
                <button
                  onClick={handleRedoSpeech}
                  title="Restart speech"
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#8b5cf6', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.06)'}
                >
                  <RedoIcon />
                </button>
              )}

              <button
                onClick={handleVoicePillClick}
                disabled={isStartingListening}
                aria-label={
                  voiceState === 'speaking' ? 'Stop speaking' :
                  voiceState === 'paused'   ? 'Resume speaking' :
                  isListening               ? 'Stop listening' : 'Start listening'
                }
                style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background:
                    voiceState === 'speaking' ? 'linear-gradient(135deg, #ef4444, #f97316)' :
                    voiceState === 'paused'   ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' :
                    isListening               ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)' :
                                                'rgba(0,0,0,0.05)',
                  border: 'none',
                  cursor: isStartingListening ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s, transform 0.15s, opacity 0.15s',
                  transform: isListening ? 'scale(1.1)' : 'scale(1)',
                  animation: voiceState === 'speaking' ? 'speakingPulse 1.8s ease-in-out infinite' : 'none',
                  opacity: isStartingListening ? 0.55 : 1,
                }}
              >
                {voiceState === 'speaking' ? <StopIcon /> :
                 voiceState === 'paused'   ? <PlayIcon /> :
                                             <MicIcon active={isListening} />}
              </button>

              <span style={{
                fontSize: 13, fontWeight: 600, minWidth: 80,
                color: voiceState === 'speaking' ? '#ef4444' :
                       voiceState === 'paused'   ? '#8b5cf6' :
                       isActive                  ? '#8b5cf6' : '#64748b',
                transition: 'color 0.2s',
              }}>
                {voiceState === 'paused' ? 'Continue session' : (messages.length > 0 && readyForNextQuestion ? 'Ask another question' : statusText)}
              </span>

              {readyForNextQuestion && messages.length > 0 && (
                <button
                  onClick={handleNewQuestion}
                  style={{
                    padding: '8px 18px', borderRadius: 24,
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: 'white',
                    fontSize: 12, fontWeight: 800, border: 'none',
                    cursor: 'pointer', transition: 'all 0.3s',
                    marginLeft: 12,
                    boxShadow: '0 4px 12px rgba(139,92,246,0.25)',
                    textTransform: 'uppercase', letterSpacing: '0.02em',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(139,92,246,0.4)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,92,246,0.25)'
                  }}
                >
                  New Question
                </button>
              )}
            </motion.div>
          ) : (
            /* Idle footer: heartbeat dot */
            <motion.div
              key="idle-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b', fontWeight: 500 }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #f472b6, #8b5cf6)', display: 'inline-block',
                animation: 'heartbeatDot 2s ease-in-out infinite',
                boxShadow: '0 0 12px rgba(244,114,182,0.4)',
              }} />
              Your Health Twin is listening
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Keyframes ──────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isTranscriptOpen && lastAiMsg && (
          <>
            <motion.button
              key="transcript-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setIsTranscriptOpen(false)}
              aria-label="Close transcript"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 35,
                border: 'none',
                background: 'rgba(15,23,42,0.14)',
                cursor: 'pointer',
              }}
            />
            <motion.aside
              key="transcript-drawer"
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: 'fixed',
                top: 56,
                right: 20,
                bottom: 82,
                width: 'min(360px, calc(100vw - 40px))',
                zIndex: 40,
                background: 'rgba(255,255,255,0.94)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(15,118,110,0.14)',
                borderRadius: 24,
                boxShadow: '0 24px 60px rgba(15,23,42,0.18)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{
                padding: '18px 18px 14px',
                borderBottom: '1px solid rgba(148,163,184,0.16)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 6 }}>
                    Assistant Transcript
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.03em' }}>
                    Full explanation
                  </div>
                </div>
                <button
                  onClick={() => setIsTranscriptOpen(false)}
                  style={{
                    border: '1px solid rgba(148,163,184,0.16)',
                    background: '#ffffff',
                    color: '#475569',
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: 18,
                    lineHeight: 1,
                    fontFamily: 'inherit',
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: '18px', overflowY: 'auto' }}>
                {lastUserMsg && (
                  <div style={{
                    marginBottom: 14,
                    padding: '10px 12px',
                    borderRadius: 14,
                    background: 'rgba(248,250,252,0.95)',
                    border: '1px solid rgba(148,163,184,0.14)',
                    fontSize: 12,
                    color: '#334155',
                    lineHeight: 1.55,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#64748b', marginBottom: 4 }}>
                      Question
                    </div>
                    {lastUserMsg.text}
                  </div>
                )}

                <div style={{
                  padding: '14px 14px 16px',
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98))',
                  border: '1px solid rgba(14,165,233,0.12)',
                  fontSize: 14,
                  color: '#334155',
                  lineHeight: 1.75,
                  whiteSpace: 'pre-wrap',
                }}>
                  {lastAiMsg.text}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

        @keyframes humanPulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.7; transform: translate(-50%, -50%) scale(1.05); }
        }
        @keyframes heartbeatDot {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          10%       { transform: scale(1.3); opacity: 0.8; }
          20%       { transform: scale(1);   opacity: 1;   }
          30%       { transform: scale(1.2); opacity: 0.9; }
          40%       { transform: scale(1);   opacity: 1;   }
        }
        @keyframes speakDot {
          0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
          50%       { transform: scaleY(1.5); opacity: 1;   }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes speakingPulse {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(0.93); }
        }
      `}</style>
    </div>
  )
}
