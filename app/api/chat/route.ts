/**
 * POST /api/chat
 *
 * Receives { message, patientId } — NOT raw patient data.
 * Loads the patient's full clinical context from SQLite,
 * then sends it to Claude as part of the system prompt.
 *
 * No mock JSON. No patient data is accepted from the client.
 * If the database is empty or the patient is not found,
 * the API returns a clear error.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildSyntheaContext, getPatientSummary } from '@/lib/db/patientContext'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, patientId } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid message' }, { status: 400 })
    }

    if (!patientId || typeof patientId !== 'string') {
      return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })
    }

    // ── Load patient context from SQLite ──────────────────────────────────
    // Both calls throw if the database is empty (no fallback to mock data).
    let patientContext: string
    let patientName: string

    try {
      const summary = getPatientSummary(patientId)
      if (!summary) {
        return NextResponse.json(
          { error: `Patient not found: ${patientId}` },
          { status: 404 }
        )
      }
      patientName = `${summary.firstName} ${summary.lastName}`

      const ctx = buildSyntheaContext(patientId)
      if (!ctx) {
        return NextResponse.json(
          { error: `Could not build context for patient: ${patientId}` },
          { status: 404 }
        )
      }
      patientContext = ctx
    } catch (dbError: any) {
      const isEmptyDB = dbError.message?.includes('No Synthea patients found')
      return NextResponse.json(
        { error: dbError.message },
        { status: isEmptyDB ? 503 : 500 }
      )
    }

    // ── Build system prompt ───────────────────────────────────────────────
    const systemPrompt = `You are a medical digital twin assistant for ${patientName}.

You speak through voice, so your answers must sound natural when read aloud.

Tone: calm, professional, concise, not overly soft
- reassuring but not overly gentle
- confident without sounding robotic
- like a competent medical assistant explaining things in clinic

Avoid:
- exaggerated empathy
- phrases like "don't worry" or "everything is fine"
- sounding dramatic, patronizing, or too soft
- long textbook explanations

Your role:
- Use only the provided patient context to answer health questions
- Do not hallucinate clinical data
- Explain risks and recommendations simply and accurately
- Personalize answers using the patient context
- Give practical next steps
- Be transparent about uncertainty

Patient Clinical Context (from Synthea database):
${patientContext}

Critical medical rules:
1. Do not diagnose definitively.
2. Do not invent citations or fake studies.
3. If evidence is general, say "based on current medical evidence" without naming fake references.
4. If data is missing or shown as N/A, explicitly say what is missing.
5. For serious or urgent symptoms, advise contacting a doctor or emergency care.
6. Never say "I don't know" alone. Instead say what can be inferred and what data is needed.
7. Keep the answer under 100 words unless the user asks for more detail.

Answer style:
- Start directly.
- Use short sentences.
- No bullet points unless specifically asked.
- Explain: what this means, why it matters, and what to do next.
- End with one clear next step.

Respond as if speaking aloud.`

    // ── Call Claude ───────────────────────────────────────────────────────
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({
      response: assistantMessage,
      usage: response.usage,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
