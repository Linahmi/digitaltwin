'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, Volume2 } from 'lucide-react'

interface VoiceInterfaceProps {
  onTranscript: (text: string) => void
  isProcessing: boolean
  responseText?: string
}

export function VoiceInterface({ onTranscript, isProcessing, responseText }: VoiceInterfaceProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recog = new SpeechRecognition()
        recog.continuous = false
        recog.interimResults = false
        recog.lang = 'en-US'

        recog.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          onTranscript(transcript)
          setIsListening(false)
        }

        recog.onerror = () => {
          setIsListening(false)
        }

        recog.onend = () => {
          setIsListening(false)
        }

        setRecognition(recog)
      }
    }
  }, [onTranscript])

  useEffect(() => {
    if (responseText && !isProcessing) {
      speak(responseText)
    }
  }, [responseText, isProcessing])

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech recognition not supported in this browser. Try Chrome.')
      return
    }

    if (isListening) {
      recognition.stop()
      setIsListening(false)
    } else {
      recognition.start()
      setIsListening(true)
    }
  }

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

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={toggleListening}
        disabled={isProcessing || isSpeaking}
        className={`
          relative flex h-24 w-24 items-center justify-center rounded-full
          transition-all duration-300
          ${isListening 
            ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' 
            : 'bg-blue-600 hover:bg-blue-500 hover:scale-105'
          }
          ${(isProcessing || isSpeaking) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isListening ? (
          <>
            <Mic className="h-10 w-10 text-white" />
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
          </>
        ) : (
          <MicOff className="h-10 w-10 text-white" />
        )}
      </button>

      <div className="text-center">
        {isListening && (
          <p className="text-sm text-blue-400 animate-pulse">Listening...</p>
        )}
        {isProcessing && (
          <p className="text-sm text-yellow-400 animate-pulse">Processing...</p>
        )}
        {isSpeaking && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <Volume2 className="h-4 w-4 animate-pulse" />
            <span>Speaking...</span>
          </div>
        )}
        {!isListening && !isProcessing && !isSpeaking && (
          <p className="text-sm text-slate-400">Tap to speak with your twin</p>
        )}
      </div>
    </div>
  )
}
