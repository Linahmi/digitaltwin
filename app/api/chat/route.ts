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
  warning?: string
}

interface AnswerReview {
  satisfactory: boolean
  revisedAnswer?: string
}

function stripMarkdown(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

function parseTopics(text: string): string[] {
  const trimmed = stripMarkdown(text)
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

function buildFallbackTopics(message: string): string[] {
  const lower = message.toLowerCase()
  const fallbackTopics = new Set<string>()

  const keywordMap: Array<[string, string[]]> = [
    ['cholesterol', ['cholesterol']],
    ['ldl', ['cholesterol', 'ldl']],
    ['hdl', ['lipids', 'hdl']],
    ['blood pressure', ['blood pressure', 'hypertension']],
    ['hypertension', ['hypertension']],
    ['heart', ['heart disease risk']],
    ['cardio', ['heart disease risk']],
    ['beta blocker', ['beta blockers']],
    ['beta blockers', ['beta blockers']],
    ['diabetes', ['diabetes']],
    ['glucose', ['diabetes', 'glucose']],
    ['hba1c', ['diabetes', 'hba1c']],
  ]

  for (const [needle, topics] of keywordMap) {
    if (lower.includes(needle)) {
      for (const topic of topics) fallbackTopics.add(topic)
    }
  }

  if (fallbackTopics.size === 0) {
    const words = message
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 3)

    for (const word of words) fallbackTopics.add(word)
  }

  return Array.from(fallbackTopics).slice(0, 3)
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

async function reviewAnswer({
  question,
  draftAnswer,
  evidenceContext,
}: {
  question: string
  draftAnswer: string
  evidenceContext: string
}): Promise<AnswerReview> {
  const reviewResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 220,
    system: 'You review medical answers for evidence-grounding. Return ONLY valid JSON with keys satisfactory:boolean and revisedAnswer:string. Mark satisfactory false if the answer misses part of the user question, overstates the evidence, or is not clearly supported by the supplied PubMed evidence. If false, provide a safer revisedAnswer that answers the full question using only the supplied evidence.',
    messages: [{
      role: 'user',
      content: `Question:\n${question}\n\nPubMed evidence:\n${evidenceContext}\n\nDraft answer:\n${draftAnswer}`,
    }],
  })

  const reviewText = reviewResponse.content[0].type === 'text' ? reviewResponse.content[0].text : ''

  try {
    const parsed = JSON.parse(stripMarkdown(reviewText)) as AnswerReview
    return {
      satisfactory: Boolean(parsed?.satisfactory),
      revisedAnswer: typeof parsed?.revisedAnswer === 'string' ? parsed.revisedAnswer.trim() : undefined,
    }
  } catch {
    return {
      satisfactory: false,
      revisedAnswer: undefined,
    }
  }
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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        system: 'You extract 1-3 key medical PubMed search topics from a user question given brief patient context. Prefer disease names, biomarkers, medications, or symptoms that appear in the question. Return ONLY a JSON array of short topic strings, for example ["hypertension", "beta blockers"].',
        messages: [{ role: 'user', content: `Patient context snippet:\n${patientContext.slice(0, 500)}\n\nUser question: ${message}` }],
      })
      const topicsText = topicResponse.content[0].type === 'text' ? topicResponse.content[0].text : ''
      const extractedTopics = parseTopics(topicsText)
      const topicsToUse = extractedTopics.length > 0 ? extractedTopics : buildFallbackTopics(message)
      const selectedEvidence = await getTopEvidence(topicsToUse)

      citations = selectedEvidence.citations
      evidence = {
        topics: selectedEvidence.topics,
        query: selectedEvidence.query,
        evidenceStatus: selectedEvidence.citations.length > 0
          ? (selectedEvidence.staleCache ? 'stale-cache' : 'ok')
          : 'unavailable',
        cacheHit: selectedEvidence.cacheHit,
        retrievedAt: selectedEvidence.retrievedAt,
        warning: selectedEvidence.warning,
      }

      if (citations.length === 0) {
        return buildEvidenceUnavailableResponse(evidence)
      }

      evidenceContext = buildEvidenceContext(citations)
    } catch (err) {
      console.error('Failed to fetch evidence:', err)
      const selectedEvidence = await getTopEvidence(buildFallbackTopics(message))
      citations = selectedEvidence.citations
      evidence = {
        topics: selectedEvidence.topics,
        query: selectedEvidence.query,
        evidenceStatus: selectedEvidence.citations.length > 0
          ? (selectedEvidence.staleCache ? 'stale-cache' : 'ok')
          : 'unavailable',
        cacheHit: selectedEvidence.cacheHit,
        retrievedAt: selectedEvidence.retrievedAt,
        warning: selectedEvidence.warning,
      }

      if (citations.length === 0) {
        return buildEvidenceUnavailableResponse(evidence)
      }

      evidenceContext = buildEvidenceContext(citations)
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

Medical Evidence (${evidence.evidenceStatus === 'stale-cache' ? 'trusted guideline sources — PubMed unavailable' : 'PubMed'}):
${evidenceContext}
${evidence.warning ? `\nEvidence note: ${evidence.warning}` : ''}

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
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : ''
    const reviewed = await reviewAnswer({
      question: message,
      draftAnswer: assistantMessage,
      evidenceContext,
    })
    const finalAnswer = reviewed.satisfactory
      ? assistantMessage
      : (reviewed.revisedAnswer || "I can't answer that safely right now because the retrieved evidence did not support a complete answer to your question.")

    return NextResponse.json({
      response: finalAnswer,
      citations,
      evidence,
      grounded: reviewed.satisfactory || Boolean(reviewed.revisedAnswer),
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
