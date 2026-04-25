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
import { getTopEvidence } from '@/lib/evidence/evidenceSelector'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface EvidenceResponsePayload {
  topics: string[]
  query: string
  evidenceStatus: 'ok' | 'stale-cache' | 'unavailable'
  cacheHit: boolean
  retrievedAt: string | null
}

function parseTopics(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string')
    }
  } catch {
    // Fall back to comma/newline parsing if the model returns invalid JSON.
  }

  return trimmed
    .split(/[\n,]/)
    .map(value => value.trim())
    .filter(Boolean)
}

function buildEvidenceContext(citations: Array<{
  title: string
  journal: string
  year: string
  authors: string[]
  abstract?: string
  publicationTypes?: string[]
}>): string {
  return citations.map((citation, index) => {
    const authorLine = citation.authors.length > 0
      ? citation.authors.slice(0, 3).join(', ') + (citation.authors.length > 3 ? ' et al.' : '')
      : 'Authors unavailable'
    const publicationTypes = citation.publicationTypes?.length
      ? ` Evidence type: ${citation.publicationTypes.slice(0, 2).join(', ')}.`
      : ''
    const abstractSnippet = citation.abstract
      ? ` Abstract: ${citation.abstract.slice(0, 500)}${citation.abstract.length > 500 ? '…' : ''}`
      : ''

    return `${index + 1}. ${citation.title} (${citation.journal}, ${citation.year}). Authors: ${authorLine}.${publicationTypes}${abstractSnippet}`
  }).join('\n')
}

function buildEvidenceUnavailableResponse(evidence: EvidenceResponsePayload) {
  return NextResponse.json({
    response: "I can't answer that safely right now because I couldn't retrieve verified PubMed evidence for your question.",
    citations: [],
    evidence,
    grounded: false,
  })
}

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
    let evidenceContext = ''
    let evidence: EvidenceResponsePayload = {
      topics: [],
      query: '',
      evidenceStatus: 'unavailable',
      cacheHit: false,
      retrievedAt: null,
    }

    try {
      const topicResponse = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        system: 'You extract 1-3 key medical search topics from a user question given brief patient context. Return ONLY a JSON array of short topic strings, for example ["hypertension", "beta blockers"].',
        messages: [{ role: 'user', content: `Patient context snippet:\n${patientContext.slice(0, 500)}\n\nUser question: ${message}` }],
      })
      const topicsText = topicResponse.content[0].type === 'text' ? topicResponse.content[0].text : ''
      const extractedTopics = parseTopics(topicsText)
      const selectedEvidence = await getTopEvidence(extractedTopics)

      citations = selectedEvidence.citations
      evidence = {
        topics: selectedEvidence.topics,
        query: selectedEvidence.query,
        evidenceStatus: selectedEvidence.citations.length > 0
          ? (selectedEvidence.staleCache ? 'stale-cache' : 'ok')
          : 'unavailable',
        cacheHit: selectedEvidence.cacheHit,
        retrievedAt: selectedEvidence.retrievedAt,
      }

      if (citations.length === 0) {
        return buildEvidenceUnavailableResponse(evidence)
      }

      evidenceContext = buildEvidenceContext(citations)
    } catch (err) {
      console.error('Failed to fetch evidence:', err)
      return buildEvidenceUnavailableResponse(evidence)
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
      evidence,
      grounded: true,
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
