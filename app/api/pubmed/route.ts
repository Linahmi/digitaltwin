/**
 * GET /api/pubmed?q=<comma-separated topics>
 *
 * Exposes the evidence layer for manual searching and testing.
 * Uses the production EvidenceService with rate limiting, in-memory cache,
 * retry/backoff, and trusted-source fallback.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEvidence } from "@/lib/evidence/evidenceService";
import { buildPubMedQuery } from "@/lib/evidence/evidenceSelector";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q) {
    return NextResponse.json(
      { error: 'Missing query parameter "q"' },
      { status: 400 }
    );
  }

  try {
    const topics = q.split(",").map((s) => s.trim()).filter(Boolean);
    const query = buildPubMedQuery(topics);

    const result = await getEvidence(query);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
