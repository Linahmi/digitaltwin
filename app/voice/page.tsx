'use client'

import { useState, useEffect } from 'react'
import { VoiceInterface } from '@/components/VoiceInterface'
import { MessageBubble } from '@/components/MessageBubble'
import { ChatMessage, Patient } from '@/types/patient'
import { Activity } from 'lucide-react'

export default function VoicePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [currentResponse, setCurrentResponse] = useState<string>()

  // Load patient data on mount
  useEffect(() => {
    fetch('/patients/patient-001.json')
      .then(res => res.json())
      .then(data => setPatient(data))
      .catch(err => console.error('Failed to load patient:', err))
  }, [])

  const handleTranscript = async (transcript: string) => {
    if (!patient) {
      alert('Patient data not loaded yet')
      return
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: transcript,
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)
    setCurrentResponse(undefined)

    try {
      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: transcript,
          patientData: patient
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API request failed')
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, assistantMessage])
      setCurrentResponse(data.response)

    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Activity className="h-6 w-6 animate-pulse" />
          <p>Loading patient data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-xl font-semibold">Digital Health Twin</h1>
          <p className="text-sm text-slate-400">
            {patient.first_name} {patient.last_name} • {patient.vitals.age} years old
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
              <p className="text-sm mt-2">Try: "What's my risk of heart disease?"</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))
          )}
        </div>
      </div>

      {/* Voice interface - fixed at bottom */}
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
