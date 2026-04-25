/**
 * lib/evidence/pubmed.ts
 *
 * Interacts with NCBI E-utilities API to fetch PubMed citations.
 * Includes a SQLite-backed cache (7-day TTL) to prevent repeated API calls.
 */

import db from '../db/sqlite'

export interface Citation {
  pmid: string
  title: string
  authors: string[]
  journal: string
  year: string
  url: string
  evidenceType?: string
  relevanceScore?: number
}

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const TOOL_NAME = 'digital-twin'
// In production, an email must be provided to NCBI. We use a placeholder if env var is missing.
const EMAIL = process.env.PUBMED_EMAIL || 'dev@example.com'

/**
 * Executes a PubMed search via ESearch and returns a list of PMIDs.
 */
async function searchPubMed(query: string): Promise<string[]> {
  const url = new URL(`${EUTILS_BASE}/esearch.fcgi`)
  url.searchParams.append('db', 'pubmed')
  url.searchParams.append('retmode', 'json')
  url.searchParams.append('retmax', '10') // Fetch slightly more to allow filtering
  url.searchParams.append('sort', 'relevance')
  url.searchParams.append('term', query)
  url.searchParams.append('tool', TOOL_NAME)
  url.searchParams.append('email', EMAIL)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`ESearch failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.esearchresult?.idlist || []
}

/**
 * Fetches citation details for a list of PMIDs via ESummary.
 */
async function fetchPubMedDetails(pmids: string[]): Promise<Citation[]> {
  if (pmids.length === 0) return []

  const url = new URL(`${EUTILS_BASE}/esummary.fcgi`)
  url.searchParams.append('db', 'pubmed')
  url.searchParams.append('retmode', 'json')
  url.searchParams.append('id', pmids.join(','))
  url.searchParams.append('tool', TOOL_NAME)
  url.searchParams.append('email', EMAIL)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`ESummary failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const result = data.result || {}
  
  const citations: Citation[] = []
  
  for (const pmid of pmids) {
    const details = result[pmid]
    if (!details) continue
    
    // Extract authors
    const authors = Array.isArray(details.authors) 
      ? details.authors.map((a: any) => a.name).filter(Boolean)
      : []

    // Extract year
    let year = 'Unknown'
    if (details.pubdate) {
        const yearMatch = details.pubdate.match(/\b\d{4}\b/)
        if (yearMatch) year = yearMatch[0]
    }

    citations.push({
      pmid,
      title: details.title || 'Unknown Title',
      authors,
      journal: details.source || 'Unknown Journal',
      year,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
    })
  }

  return citations
}

/**
 * Retrieves citations for a query, using the SQLite cache if available
 * and less than 7 days old.
 */
export async function getPubMedEvidence(query: string): Promise<Citation[]> {
  // Check Cache
  const cached = db.prepare('SELECT results_json, created_at FROM pubmed_cache WHERE query = ?').get(query) as { results_json: string, created_at: string } | undefined
  
  if (cached) {
    const ageMs = Date.now() - new Date(cached.created_at).getTime()
    const daysOld = ageMs / (1000 * 60 * 60 * 24)
    if (daysOld < 7) {
      return JSON.parse(cached.results_json) as Citation[]
    }
  }

  // Cache miss or expired, hit API
  try {
    const pmids = await searchPubMed(query)
    const citations = await fetchPubMedDetails(pmids)

    // Store in cache
    db.prepare(`
      INSERT OR REPLACE INTO pubmed_cache (query, results_json, created_at)
      VALUES (?, ?, ?)
    `).run(query, JSON.stringify(citations), new Date().toISOString())

    return citations
  } catch (error) {
    console.error('PubMed API Error:', error)
    // If API fails, return cached data even if stale (if we have it)
    if (cached) {
        console.warn('Returning stale cache due to API failure')
        return JSON.parse(cached.results_json) as Citation[]
    }
    throw error
  }
}
