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

    // ── Extract topics & Fetch Evidence ──────────────────────────────────
    let citations: any[] = []
    let evidenceContext = "No specific medical evidence retrieved."

    try {
      const topicResponse = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 50,
        system: "You extract 1-3 key medical search topics from a user's question given their clinical context. Return ONLY a comma-separated list of search terms (e.g. 'hypertension, beta blockers'). Do not include conversational text.",
        messages: [{ role: 'user', content: `Patient context snippet:\n${patientContext.slice(0, 500)}\n\nUser question: ${message}` }],
      })
      const topicsText = topicResponse.content[0].type === 'text' ? topicResponse.content[0].text : ''
      const topics = topicsText.split(',').map(s => s.trim()).filter(Boolean)
      
      const { getTopEvidence } = await import('@/lib/evidence/evidenceSelector')
      citations = await getTopEvidence(topics)

      if (citations.length > 0) {
        evidenceContext = citations.map(c => 
          `- ${c.title} (${c.journal}, ${c.year}). Authors: ${c.authors.slice(0, 3).join(', ')}${c.authors.length > 3 ? ' et al.' : ''}`
        ).join('\n')
      }
    } catch (err) {
      console.error("Failed to fetch evidence:", err)
      evidenceContext = "References are temporarily unavailable due to a system error."
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
- Use only the provided patient context and medical evidence to answer health questions
- Do not hallucinate clinical data or fake studies
- Explain risks and recommendations simply and accurately
- Personalize answers using the patient context
- Give practical next steps
- Be transparent about uncertainty

Patient Clinical Context (from Synthea database):
${patientContext}

Medical Evidence (PubMed):
${evidenceContext}

Critical medical rules:
1. Do not diagnose definitively.
2. Do not invent citations or fake studies. Use ONLY the provided PubMed evidence.
3. If evidence is weak or missing, say so clearly. Do not justify numeric thresholds with PubMed unless it's in the evidence.
4. If data is missing or shown as N/A, explicitly say what is missing.
5. For serious or urgent symptoms, advise contacting a doctor or emergency care.
6. Never say "I don't know" alone. Instead say what can be inferred and what data is needed.
7. Keep the answer under 100 words unless the user asks for more detail.

Voice behavior:
- Start directly.
- Use short sentences.
- No bullet points unless specifically asked.
- Do not read citations aloud.
- Explain: what this means, why it matters, and what to do next.
- End with one clear next step, followed by: "I can show you the references behind this."

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
      citations,
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
