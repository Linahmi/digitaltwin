/**
 * GET /api/pubmed?q=<query>
 *
 * Exposes the PubMed evidence layer for manual searching and testing.
 * Uses the SQLite cache internally.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPubMedEvidence } from '@/lib/evidence/pubmed'
import { buildPubMedQuery } from '@/lib/evidence/evidenceSelector'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')

  if (!q) {
    return NextResponse.json({ error: 'Missing query parameter "q"' }, { status: 400 })
  }

  try {
    // If the user provided a raw query, we use it directly, 
    // but if we want to test the query builder, we could split by space
    // For this endpoint, we'll just run it through the builder as topics
    const topics = q.split(',').map(s => s.trim()).filter(Boolean)
    const formattedQuery = buildPubMedQuery(topics)
    
    const evidence = await getPubMedEvidence(formattedQuery)

    return NextResponse.json({
      query: formattedQuery,
      citations: evidence.citations,
      cacheHit: evidence.cacheHit,
      retrievedAt: evidence.retrievedAt,
      staleCache: evidence.staleCache,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
