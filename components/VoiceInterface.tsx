'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2 } from 'lucide-react'

interface VoiceInterfaceProps {
  onTranscript: (text: string) => void
  isProcessing: boolean
  responseText?: string
}

// ── Waveform bars (used in Listening + Speaking states) ──────────────────────
function Waveform({ active }: { active: boolean }) {
  const bars = 7
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-full"
          style={{
            background: '#00e5ff',
            height: active ? undefined : '6px',
            opacity: active ? 1 : 0.25,
            animation: active
              ? `waveBar 0.9s ease-in-out ${i * 0.1}s infinite alternate`
              : 'none',
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { height: 4px; }
          to   { height: 28px; }
        }
      `}</style>
    </div>
  )
}

// ── Thinking dots ─────────────────────────────────────────────────────────────
function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-cyan-400"
          style={{ animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40%            { opacity: 1;   transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export function VoiceInterface({ onTranscript, isProcessing, responseText }: VoiceInterfaceProps) {
  const [isListening, setIsListening]   = useState(false)
  const [isSpeaking,  setIsSpeaking]    = useState(false)
  const recognitionRef                  = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const recog = new SR()
    recog.continuous     = false
    recog.interimResults = false
    recog.lang           = 'en-US'
    recog.onresult = (e: any) => { onTranscript(e.results[0][0].transcript); setIsListening(false) }
    recog.onerror  = () => setIsListening(false)
    recog.onend    = () => setIsListening(false)
    recognitionRef.current = recog
  }, [onTranscript])

  useEffect(() => {
    if (responseText && !isProcessing) {
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const utt   = new SpeechSynthesisUtterance(responseText)
      utt.rate    = 0.95
      utt.pitch   = 1.0
      utt.onstart = () => setIsSpeaking(true)
      utt.onend   = () => setIsSpeaking(false)
      window.speechSynthesis.speak(utt)
    }
  }, [responseText, isProcessing])

  const toggle = () => {
    const r = recognitionRef.current
    if (!r) { alert('Speech recognition not supported. Try Chrome.'); return }
    if (isListening) { r.stop(); setIsListening(false) }
    else             { r.start(); setIsListening(true) }
  }

<<<<<<< HEAD
  const getBestVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices()
    if (!voices.length) return null

    // Preferred voices in priority order
    const preferred = [
      'Google US English',
      'Microsoft Zira',
      'Samantha',
      'Alex',
    ]

    for (const name of preferred) {
      const match = voices.find((v) => v.name.includes(name) && v.lang.startsWith('en'))
      if (match) return match
    }

    // Fall back to any en-US voice, then any English voice
    return (
      voices.find((v) => v.lang === 'en-US') ??
      voices.find((v) => v.lang.startsWith('en')) ??
      null
    )
  }

  const waitForVoices = (): Promise<void> =>
    new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        resolve()
        return
      }
      // Chrome loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = () => resolve()
      // Safety timeout so we never hang
      setTimeout(resolve, 2000)
    })

  const speak = async (text: string) => {
    if (!('speechSynthesis' in window)) return

    // Cancel anything currently playing
    window.speechSynthesis.cancel()

    // Wait for voices to become available (Chrome loads them async)
    await waitForVoices()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 1.0       // slightly faster than default — tweak 0.8‑1.5
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voice = getBestVoice()
    if (voice) utterance.voice = voice

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)

    // Chrome pauses long utterances after ~15 s; this keep-alive prevents that
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(keepAlive)
        return
      }
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    }, 10_000)

    utterance.onend = () => {
      clearInterval(keepAlive)
      setIsSpeaking(false)
    }
    utterance.onerror = () => {
      clearInterval(keepAlive)
      setIsSpeaking(false)
    }
  }
=======
  const disabled    = isProcessing || isSpeaking
  const micActive   = isListening
  const glowColor   = micActive ? 'rgba(0,229,255,0.55)' : 'rgba(0,229,255,0.25)'
  const ringColor   = micActive ? 'rgba(0,229,255,0.35)' : 'rgba(0,229,255,0.15)'

  // Derive state label
  const stateLabel = isListening  ? 'Listening…'
    : isProcessing                ? 'Thinking…'
    : isSpeaking                  ? 'Speaking…'
    : 'Tap to speak with your twin'
>>>>>>> 525ed9c (feat: add landing page animations, voice interface enhancements, and synthetic FHIR patient data generation.)

  return (
    <div className="flex flex-col items-center gap-5">

      {/* State indicator */}
      <div className="flex h-8 items-center justify-center gap-3">
        {isListening  && <Waveform active />}
        {isProcessing && <ThinkingDots />}
        {isSpeaking   && <Waveform active />}
        <span
          className="text-sm font-medium tracking-wide"
          style={{
            color: (isListening || isSpeaking) ? '#00e5ff'
              : isProcessing ? 'rgba(0,229,255,0.6)'
              : 'rgba(255,255,255,0.35)',
          }}
        >
          {stateLabel}
        </span>
      </div>

      {/* Mic button */}
      <button
        onClick={toggle}
        disabled={disabled}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
        className="relative flex items-center justify-center rounded-full transition-all duration-300 focus:outline-none"
        style={{
          width: 88, height: 88,
          background: micActive
            ? 'radial-gradient(circle, rgba(0,229,255,0.25) 0%, rgba(0,229,255,0.08) 70%)'
            : 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, rgba(0,229,255,0.04) 70%)',
          boxShadow: `0 0 0 1.5px rgba(0,229,255,${micActive ? 0.6 : 0.3}), 0 0 32px ${glowColor}, 0 0 64px ${glowColor}`,
          transform: micActive ? 'scale(1.08)' : 'scale(1)',
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {/* Idle pulse ring */}
        {!micActive && !disabled && (
          <>
            <span className="absolute inset-0 rounded-full"
              style={{ border: `1px solid ${ringColor}`, animation: 'outerPing 2.5s ease-out infinite' }} />
            <span className="absolute inset-[-12px] rounded-full"
              style={{ border: `1px solid rgba(0,229,255,0.08)`, animation: 'outerPing 2.5s ease-out 0.8s infinite' }} />
          </>
        )}
        {/* Active ripple */}
        {micActive && (
          <span className="absolute inset-0 rounded-full"
            style={{ background: 'rgba(0,229,255,0.15)', animation: 'ripple 1s ease-out infinite' }} />
        )}

        {isListening
          ? <Mic    className="relative z-10 h-9 w-9" style={{ color: '#00e5ff' }} />
          : <MicOff className="relative z-10 h-9 w-9" style={{ color: disabled ? '#475569' : 'rgba(0,229,255,0.7)' }} />
        }
      </button>

      <style>{`
        @keyframes outerPing {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        @keyframes ripple {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
