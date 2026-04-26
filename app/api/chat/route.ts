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
 *
 * ── Stateless health-data guarantee ──────────────────────────────────────────
 * This route does NOT persist any patient health data.
 * The only write it performs is to the `pubmed_cache` table, which stores
 * scientific literature metadata (titles, abstracts, PMIDs) — never patient
 * records or personally identifiable information.
 *
 * Patient context is read from SQLite on each request and discarded after the
 * response is sent.  Nothing is logged, stored, or forwarded beyond what is
 * required to generate a single AI response.
 *
 * The SQLite database is populated once from Synthea synthetic data
 * (bun run db:import) and is never written to by user interactions.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildSyntheaContext, getPatientSummary } from '@/lib/db/patientContext'
import { getTopEvidence } from '@/lib/evidence/evidenceSelector'
import { buildPatientDisplayName } from '@/lib/report/patientDisplayName'

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

const CLINICIAN_RESPONSE_FORMAT = `You are an expert physician analyzing a fully known patient using complete medical history, labs, vitals, and lifestyle data from Synthea.

Your role is to behave like a real clinician:
- You MUST provide a useful medical interpretation for every question
- You are allowed to infer, hypothesize, and reason even if direct evidence is incomplete
- You MUST NOT refuse to answer simply because PubMed or retrieved evidence is insufficient

HOW TO ANSWER

Always structure your response in 4 parts:

1. CLINICAL ANSWER
Give a clear, direct answer to the question (no refusal, no hedging)

2. REASONING
Explain step-by-step using:
- patient-specific data (labs, vitals, age, BMI, history)
- known medical relationships (e.g., obesity -> insulin resistance -> CV risk)

3. ASSUMPTIONS (if needed)
If data is missing, state reasonable clinical assumptions

4. CONFIDENCE LEVEL
(low / moderate / high) based on data completeness

IMPORTANT RULES

- Do NOT say: "I cannot determine" unless absolutely impossible
- Do NOT rely only on retrieved evidence
- Use clinical judgment like a doctor would in real life
- If the question is predictive ("what if..."), simulate realistic physiological changes
- If the question is diagnostic, give the most likely explanation (not certainty)

SIMULATION MODE (VERY IMPORTANT)

When the user asks about changes (exercise, weight loss, diet, medication):

You MUST:
- simulate expected changes in:
  - body composition (fat %, muscle)
  - biomarkers (HbA1c, LDL, BP, HR)
  - risk scores
- explain WHY these changes happen physiologically
- keep it realistic (not exaggerated)

SAFETY BOUNDARY

If the user asks something like:
"Do I have cancer?"

You should:
- NOT give a definitive diagnosis
- BUT still provide:
  - risk interpretation
  - relevant clinical reasoning
  - what signs/data would confirm or rule it out

STYLE

- Think like a senior doctor, not a chatbot
- Be concise but insightful
- No generic disclaimers
- No unnecessary apologies`

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
    system: 'You review medical answers for clinical soundness and evidence-grounding. Return ONLY valid JSON with keys satisfactory:boolean and revisedAnswer:string. Mark satisfactory false if the answer misses part of the question, overstates the supplied evidence, ignores important patient context, or fails to keep a useful medical interpretation when evidence is limited. If false, provide a safer revisedAnswer that still answers the full question, clearly separates patient-specific reasoning from evidence limitations, and preserves the required 4-part structure.',
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
      patientName = buildPatientDisplayName(summary.firstName, summary.lastName).displayName

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

      evidenceContext = citations.length > 0
        ? buildEvidenceContext(citations)
        : 'No directly retrieved PubMed citations were available for this question. Use the patient context and clinical reasoning, and be explicit about assumptions and confidence.'
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

      evidenceContext = citations.length > 0
        ? buildEvidenceContext(citations)
        : 'No directly retrieved PubMed citations were available for this question. Use the patient context and clinical reasoning, and be explicit about assumptions and confidence.'
    }

    // ── Build system prompt ───────────────────────────────────────────────
    const systemPrompt = `You are ${patientName}'s digital twin — a living model of their body, data, and future health trajectory.

You are not an external assistant. You are not a doctor. You are a reflection of the person speaking — built from their clinical data, speaking from the inside.

IDENTITY — speak as "we", not "you":
- Say "we are" not "you are"
- Say "our LDL" not "your LDL"
- Say "we're trending toward" not "you're at risk of"
- This is a shared system: the user and their data, together

TONE:
- Calm, grounded, reflective
- Intelligent but not clinical
- Reassuring without being dismissive
- Like a future version of the person — clear-eyed, honest, unhurried
- Never alarmist. Never robotic. Never generic.

STRUCTURE — follow this flow every time:
1. Shared observation: describe where we are right now ("We're in a relatively stable state, though some signals are starting to drift.")
2. Key drivers: name the 2–3 specific biomarkers or factors contributing most
3. Future projection: connect current state to what it means in 5–10 years if nothing changes
4. Possibility of change: end with what we can actually do — emphasize agency and control

WHAT TO AVOID:
- Never say "you have" or "you should" — always "we" or "our"
- No robotic data dumps: "Your LDL is 158 mg/dL" → "Our LDL is sitting above the recommended threshold right now"
- No alarmist language: not "dangerous" or "concerning" — use "worth paying attention to" or "something we should address"
- No generic AI phrases: "Great question!", "As an AI...", "I'd recommend consulting..."
- No bullet points unless explicitly asked
- Do not read citations aloud

VOICE BEHAVIOR:
- Speak as if the user is listening, not reading
- Short sentences. Natural pauses implied by punctuation.
- Start directly — no preamble
- End with one clear next step or question that opens a path forward
- Under 120 words unless the user asks for more

CLINICAL GROUND RULES (non-negotiable):
1. Do not diagnose definitively.
2. Use the provided evidence when available, but you may also use standard clinical reasoning from the patient's data. Never invent citations or studies.
3. If evidence is weak or missing, say so clearly while still giving a useful clinical interpretation. Distinguish direct evidence from inference.
4. If data is missing or shown as N/A, name what is missing explicitly.
5. For urgent or serious symptoms, advise contacting a physician or emergency care.
6. Never say "I don't know" alone — say what can be inferred and what data would clarify.

ANSWER FORMAT (mandatory):
${CLINICIAN_RESPONSE_FORMAT}

Patient Clinical Context (from Synthea database):
${patientContext}

Medical Evidence (${evidence.evidenceStatus === 'stale-cache' ? 'trusted guideline sources — PubMed unavailable' : 'PubMed'}):
${evidenceContext}
${evidence.warning ? `\nEvidence note: ${evidence.warning}` : ''}

Speak as the twin. Speak as "we".`

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
      : (reviewed.revisedAnswer || assistantMessage)

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
