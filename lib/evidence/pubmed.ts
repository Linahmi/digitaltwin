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
  abstract?: string
  publicationTypes?: string[]
  evidenceType?: string
  relevanceScore?: number
}

export interface PubMedEvidenceResult {
  citations: Citation[]
  cacheHit: boolean
  retrievedAt: string
  staleCache: boolean
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

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2019;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function pickEvidenceType(publicationTypes: string[]): string | undefined {
  const lowerTypes = publicationTypes.map(type => type.toLowerCase())
  if (lowerTypes.some(type => type.includes('guideline'))) return 'guideline'
  if (lowerTypes.some(type => type.includes('meta-analysis'))) return 'meta-analysis'
  if (lowerTypes.some(type => type.includes('systematic review'))) return 'systematic review'
  if (lowerTypes.some(type => type.includes('review'))) return 'review'
  return publicationTypes[0]
}

async function fetchPubMedAbstracts(pmids: string[]): Promise<Record<string, { abstract?: string; publicationTypes: string[] }>> {
  if (pmids.length === 0) return {}

  const url = new URL(`${EUTILS_BASE}/efetch.fcgi`)
  url.searchParams.append('db', 'pubmed')
  url.searchParams.append('retmode', 'xml')
  url.searchParams.append('id', pmids.join(','))
  url.searchParams.append('tool', TOOL_NAME)
  url.searchParams.append('email', EMAIL)

  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`EFetch failed: ${response.status} ${response.statusText}`)
  }

  const xml = await response.text()
  const articles = xml.match(/<PubmedArticle[\s\S]*?<\/PubmedArticle>/g) || []
  const detailsByPmid: Record<string, { abstract?: string; publicationTypes: string[] }> = {}

  for (const article of articles) {
    const pmidMatch = article.match(/<PMID[^>]*>(.*?)<\/PMID>/)
    const pmid = pmidMatch?.[1]?.trim()
    if (!pmid) continue

    const abstractSections = Array.from(article.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g))
      .map(match => decodeXmlEntities(match[1]))
      .filter(Boolean)

    const publicationTypes = Array.from(article.matchAll(/<PublicationType[^>]*>([\s\S]*?)<\/PublicationType>/g))
      .map(match => decodeXmlEntities(match[1]))
      .filter(Boolean)

    detailsByPmid[pmid] = {
      abstract: abstractSections.length > 0 ? abstractSections.join(' ') : undefined,
      publicationTypes,
    }
  }

  return detailsByPmid
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

  const [summaryResponse, abstractsByPmid] = await Promise.all([
    fetch(url.toString()),
    fetchPubMedAbstracts(pmids),
  ])

  if (!summaryResponse.ok) {
    throw new Error(`ESummary failed: ${summaryResponse.status} ${summaryResponse.statusText}`)
  }

  const data = await summaryResponse.json()
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

    const abstractDetails = abstractsByPmid[pmid]
    const publicationTypes = abstractDetails?.publicationTypes || []

    citations.push({
      pmid,
      title: details.title || 'Unknown Title',
      authors,
      journal: details.source || 'Unknown Journal',
      year,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      abstract: abstractDetails?.abstract,
      publicationTypes,
      evidenceType: pickEvidenceType(publicationTypes),
    })
  }

  return citations
}

/**
 * Retrieves citations for a query, using the SQLite cache if available
 * and less than 7 days old.
 */
export async function getPubMedEvidence(query: string): Promise<PubMedEvidenceResult> {
  // Check Cache
  const cached = db.prepare('SELECT results_json, created_at FROM pubmed_cache WHERE query = ?').get(query) as { results_json: string, created_at: string } | undefined
  
  if (cached) {
    const ageMs = Date.now() - new Date(cached.created_at).getTime()
    const daysOld = ageMs / (1000 * 60 * 60 * 24)
    if (daysOld < 7) {
      return {
        citations: JSON.parse(cached.results_json) as Citation[],
        cacheHit: true,
        retrievedAt: cached.created_at,
        staleCache: false,
      }
    }
  }

  // Cache miss or expired, hit API
  try {
    const pmids = await searchPubMed(query)
    const citations = await fetchPubMedDetails(pmids)
    const retrievedAt = new Date().toISOString()

    // Store in cache
    db.prepare(`
      INSERT OR REPLACE INTO pubmed_cache (query, results_json, created_at)
      VALUES (?, ?, ?)
    `).run(query, JSON.stringify(citations), retrievedAt)

    return {
      citations,
      cacheHit: false,
      retrievedAt,
      staleCache: false,
    }
  } catch (error) {
    console.error('PubMed API Error:', error)
    // If API fails, return cached data even if stale (if we have it)
    if (cached) {
        console.warn('Returning stale cache due to API failure')
        return {
          citations: JSON.parse(cached.results_json) as Citation[],
          cacheHit: true,
          retrievedAt: cached.created_at,
          staleCache: true,
        }
    }
    throw error
  }
}
