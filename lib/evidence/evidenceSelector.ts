/**
 * lib/evidence/evidenceSelector.ts
 *
 * Builds targeted PubMed queries and scores/filters retrieved citations
 * to select the most relevant high-quality evidence.
 */

import { getPubMedEvidence, Citation } from './pubmed'

export interface EvidenceSelection {
  topics: string[]
  query: string
  citations: Citation[]
  cacheHit: boolean
  retrievedAt: string | null
  staleCache: boolean
}

function sanitizeTopic(topic: string): string {
  return topic
    .replace(/[\[\]()"']/g, ' ')
    .replace(/\b(?:AND|OR|NOT)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeTopics(topics: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const topic of topics) {
    const cleaned = sanitizeTopic(topic)
    const key = cleaned.toLowerCase()

    if (!cleaned || seen.has(key)) continue
    seen.add(key)
    normalized.push(cleaned)
  }

  return normalized.slice(0, 3)
}

/**
 * Builds a structured PubMed query from user topics.
 * Focuses on guidelines, reviews, and meta-analyses.
 */
export function buildPubMedQuery(topics: string[]): string {
  const normalizedTopics = normalizeTopics(topics)
  // Restrict to English, human studies, and high-quality evidence types
  // Limit to roughly the last 15 years using PubMed date syntax.
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - 15

  if (normalizedTopics.length === 0) return ''

  const topicClause = normalizedTopics
    .map(topic => `("${topic}"[Title/Abstract] OR "${topic}"[MeSH Terms])`)
    .join(' OR ')

  return `(${topicClause}) AND (guideline[Publication Type] OR meta-analysis[Publication Type] OR systematic[sb] OR review[Publication Type]) AND humans[MeSH Terms] AND english[Language] AND ("${startYear}/01/01"[PDat] : "${currentYear}/12/31"[PDat])`
}

/**
 * Scores a citation based on keyword matches, recency, and evidence type.
 */
function scoreCitation(citation: Citation, topics: string[]): number {
  let score = 0
  
  const titleLower = citation.title.toLowerCase()
  const journalLower = citation.journal.toLowerCase()

  // 1. Evidence Type Bonus
  if (titleLower.includes('guideline') || titleLower.includes('recommendation')) score += 10
  if (titleLower.includes('meta-analysis')) score += 8
  if (titleLower.includes('systematic review')) score += 7
  if (titleLower.includes('review')) score += 5
  if (titleLower.includes('case report')) score -= 10 // Deprioritize

  // 2. Recency Bonus
  const year = parseInt(citation.year, 10)
  if (!isNaN(year)) {
      const currentYear = new Date().getFullYear()
      const age = currentYear - year
      if (age <= 3) score += 5
      else if (age <= 7) score += 3
      else if (age <= 10) score += 1
      else if (age > 15) score -= 5 // Very old
  }

  // 3. Keyword Match
  for (const topic of topics) {
      if (titleLower.includes(topic.toLowerCase())) score += 2
  }

  // High-impact journals (simplified heuristic)
  if (journalLower.includes('jama') || journalLower.includes('lancet') || journalLower.includes('new england journal') || journalLower.includes('nejm')) {
      score += 3
  }

  return score
}

/**
 * Fetches and selects the top 2-3 most relevant citations for the given topics.
 */
export async function getTopEvidence(topics: string[]): Promise<EvidenceSelection> {
  const normalizedTopics = normalizeTopics(topics)
  if (normalizedTopics.length === 0) {
    return {
      topics: [],
      query: '',
      citations: [],
      cacheHit: false,
      retrievedAt: null,
      staleCache: false,
    }
  }

  const query = buildPubMedQuery(normalizedTopics)
  
  try {
    const evidence = await getPubMedEvidence(query)
    
    // Score and sort
    const scored = evidence.citations.map(c => ({
        ...c,
        relevanceScore: scoreCitation(c, normalizedTopics)
    }))

    scored.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))

    return {
      topics: normalizedTopics,
      query,
      citations: scored.slice(0, 3),
      cacheHit: evidence.cacheHit,
      retrievedAt: evidence.retrievedAt,
      staleCache: evidence.staleCache,
    }
  } catch (err) {
    console.error("Evidence selection failed:", err)
    return {
      topics: normalizedTopics,
      query,
      citations: [],
      cacheHit: false,
      retrievedAt: null,
      staleCache: false,
    }
  }
}
