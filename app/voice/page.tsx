'use client'

import { useState, useEffect } from 'react'
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

export default function VoicePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [patient, setPatient] = useState<PatientHeader | null>(null)
  const [currentResponse, setCurrentResponse] = useState<string>()
  const [dbError, setDbError] = useState<string | null>(null)

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

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Activity className="h-6 w-6 animate-pulse" />
          <p>Loading patient from database...</p>
        </div>
      </div>
    )
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-semibold">Digital Health Twin</h1>
          <p className="text-sm text-slate-400">
            {patient.firstName} {patient.lastName}
            {patient.age !== null ? ` • ${patient.age} years old` : ''}
            {patient.gender ? ` • ${patient.gender}` : ''}
          </p>
        </div>
      </header>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Ask your digital twin about your health</p>
              <p className="text-sm mt-2">Try: &quot;What&apos;s my risk of heart disease?&quot;</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))
          )}
        </div>
      </div>

      {/* Voice interface — fixed at bottom */}
      <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-6">
        <div className="mx-auto max-w-4xl">
          <VoiceInterface
            onTranscript={handleTranscript}
            isProcessing={isProcessing}
            responseText={currentResponse}
          />
        </div>
      </div>
    </div>
  )
}
