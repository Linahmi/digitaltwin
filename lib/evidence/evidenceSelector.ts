/**
 * lib/evidence/evidenceSelector.ts
 *
 * Builds PubMed queries and orchestrates evidence selection via evidenceService.
 * Keeps its public API stable so the chat route does not require changes.
 */

import { getEvidence } from "./evidenceService";
import type { Citation } from "./pubmed";

export interface EvidenceSelection {
  topics: string[];
  query: string;
  citations: Citation[];
  cacheHit: boolean;
  retrievedAt: string | null;
  staleCache: boolean;
  warning?: string;
}

const TOPIC_SYNONYMS: Record<string, string[]> = {
  cholesterol: ["cholesterol", "ldl", "hyperlipidemia", "dyslipidemia", "statin"],
  lipids: ["lipids", "ldl", "hdl", "hyperlipidemia", "dyslipidemia"],
  "blood pressure": ["blood pressure", "hypertension", "systolic blood pressure"],
  hypertension: ["hypertension", "blood pressure", "antihypertensive"],
  "heart disease risk": [
    "cardiovascular risk",
    "coronary disease",
    "atherosclerotic cardiovascular disease",
  ],
  diabetes: ["diabetes", "type 2 diabetes", "glycemic control", "hba1c"],
};

function sanitizeTopic(topic: string): string {
  return topic
    .replace(/[\[\]()"']/g, " ")
    .replace(/\b(?:AND|OR|NOT)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expandTopic(topic: string): string[] {
  const cleaned = sanitizeTopic(topic);
  if (!cleaned) return [];
  const lower = cleaned.toLowerCase();
  const expanded = new Set<string>([cleaned]);
  for (const [key, synonyms] of Object.entries(TOPIC_SYNONYMS)) {
    if (lower.includes(key) || key.includes(lower)) {
      for (const syn of synonyms) expanded.add(syn);
    }
  }
  return Array.from(expanded);
}

export function normalizeTopics(topics: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const topic of topics) {
    for (const expanded of expandTopic(topic)) {
      const key = expanded.toLowerCase();
      if (!expanded || seen.has(key)) continue;
      seen.add(key);
      out.push(expanded);
    }
  }
  return out.slice(0, 5);
}

export function buildPubMedQuery(topics: string[]): string {
  const normalized = normalizeTopics(topics);
  if (normalized.length === 0) return "";
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 15;
  const topicClause = normalized
    .map((t) => `("${t}"[Title/Abstract] OR "${t}"[MeSH Terms])`)
    .join(" OR ");
  return `(${topicClause}) AND (guideline[Publication Type] OR meta-analysis[Publication Type] OR systematic[sb] OR review[Publication Type]) AND humans[MeSH Terms] AND english[Language] AND ("${startYear}/01/01"[PDat] : "${currentYear}/12/31"[PDat])`;
}

function buildFallbackQueries(topics: string[]): string[] {
  const normalized = normalizeTopics(topics);
  if (normalized.length === 0) return [];
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 15;
  const titleClause = normalized.map((t) => `"${t}"[Title/Abstract]`).join(" OR ");
  return [
    buildPubMedQuery(normalized),
    `(${titleClause}) AND humans[MeSH Terms] AND english[Language] AND ("${startYear}/01/01"[PDat] : "${currentYear}/12/31"[PDat])`,
    `${normalized.join(" ")} AND humans[MeSH Terms] AND english[Language]`,
    normalized.join(" OR "),
  ];
}

export async function getTopEvidence(topics: string[]): Promise<EvidenceSelection> {
  const normalizedTopics = normalizeTopics(topics);
  if (normalizedTopics.length === 0) {
    return { topics: [], query: "", citations: [], cacheHit: false, retrievedAt: null, staleCache: false };
  }

  const queries = buildFallbackQueries(normalizedTopics);

  for (const query of queries) {
    const result = await getEvidence(query);

    // Stop at the first query that returns PubMed results (not fallback/unavailable).
    if (
      result.references.length > 0 &&
      result.primarySourceUsed === "pubmed"
    ) {
      const citations: Citation[] = result.references.map((ref) => ({
        pmid: "",
        title: ref.title,
        authors: [],
        journal: ref.source,
        year: ref.year ?? "Unknown",
        url: ref.url,
        abstract: ref.abstract,
        publicationTypes: ref.type ? [ref.type] : [],
        evidenceType: ref.type,
      }));

      return {
        topics: normalizedTopics,
        query,
        citations: citations.slice(0, 3),
        cacheHit: false,
        retrievedAt: new Date().toISOString(),
        staleCache: false,
        warning: result.warning,
      };
    }
  }

  // All PubMed queries failed — try the trusted fallback on the primary query.
  const fallbackResult = await getEvidence(normalizedTopics.join(" "));
  const isTrusted = fallbackResult.primarySourceUsed === "trusted_fallback";
  const citations: Citation[] = fallbackResult.references.map((ref) => ({
    pmid: "",
    title: ref.title,
    authors: [],
    journal: ref.source,
    year: ref.year ?? "Unknown",
    url: ref.url,
    abstract: ref.abstract,
    publicationTypes: ref.type ? [ref.type] : [],
    evidenceType: ref.type,
  }));

  return {
    topics: normalizedTopics,
    query: queries[0] ?? "",
    citations: citations.slice(0, 3),
    cacheHit: false,
    retrievedAt: new Date().toISOString(),
    staleCache: isTrusted,
    warning: fallbackResult.warning,
  };
}
