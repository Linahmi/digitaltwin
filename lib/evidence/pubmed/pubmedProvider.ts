import { esearch, esummary, efetch } from "./client";
import {
  evidenceCache,
  TTL,
  searchCacheKey,
  articleCacheKey,
  abstractCacheKey,
} from "./cache";
import type { EvidenceReference, PubMedSummary } from "./types";

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSummaries(result: Record<string, unknown>): PubMedSummary[] {
  const articles: PubMedSummary[] = [];
  for (const [key, val] of Object.entries(result)) {
    if (key === "uids" || !val || typeof val !== "object") continue;
    const doc = val as Record<string, unknown>;
    const pmid = String(doc.uid ?? key);
    const title = decodeXml(String(doc.title ?? ""));
    const journal = String(
      (doc.fulljournalname as string) ?? (doc.source as string) ?? ""
    );
    const year = String(
      ((doc.pubdate as string) ?? "").match(/\b\d{4}\b/)?.[0] ?? ""
    );
    const authors = ((doc.authors as Array<{ name: string }>) ?? []).map(
      (a) => a.name
    );
    const pubTypes = ((doc.pubtype as string[]) ?? []).map((t) =>
      t.toLowerCase()
    );
    const doi = (
      (doc.articleids as Array<{ idtype: string; value: string }>) ?? []
    ).find((id) => id.idtype === "doi")?.value;

    articles.push({ pmid, title, authors, journal, year, pubTypes, doi, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` });
  }
  return articles;
}

function parseAbstracts(xml: string): Map<string, string> {
  const map = new Map<string, string>();
  const articleMatches = xml.match(/<PubmedArticle[\s\S]*?<\/PubmedArticle>/g) ?? [];

  for (const article of articleMatches) {
    const pmidMatch = article.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    if (!pmidMatch) continue;
    const pmid = pmidMatch[1];

    const sections = [...article.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)];
    if (sections.length === 0) continue;

    const text = sections
      .map(([, attrs, body]) => {
        const labelMatch = attrs.match(/Label="([^"]+)"/);
        const prefix = labelMatch ? `${labelMatch[1]}: ` : "";
        return prefix + decodeXml(body);
      })
      .join(" ");

    map.set(pmid, text);
  }
  return map;
}

function inferType(pubTypes: string[]): EvidenceReference["type"] {
  for (const t of pubTypes) {
    if (t.includes("practice guideline") || t.includes("guideline"))
      return "guideline";
    if (t.includes("meta-analysis") || t.includes("systematic review"))
      return "systematic_review";
  }
  return "article";
}

function typePriority(t: EvidenceReference["type"]): number {
  if (t === "guideline") return 0;
  if (t === "systematic_review") return 1;
  return 2;
}

export interface PubMedProviderResult {
  references: EvidenceReference[];
  hasAbstracts: boolean;
}

export async function fetchPubMedEvidence(
  query: string,
  maxResults = 10,
  maxAbstracts = 5
): Promise<PubMedProviderResult> {
  const normalized = normalizeQuery(query);
  const searchKey = searchCacheKey(normalized);

  // 1. Search cache — or ESearch
  let pmids = evidenceCache.get<string[]>(searchKey);
  if (!pmids) {
    pmids = await esearch(query, maxResults);
    evidenceCache.set(searchKey, pmids, TTL.SEARCH);
    console.log(
      `[evidence:pubmed] esearch pmids=${pmids.length} query="${normalized.slice(0, 60)}"`
    );
  }

  if (pmids.length === 0) {
    return { references: [], hasAbstracts: false };
  }

  // 2. Article metadata — cache-first, single batched ESummary for misses
  const cachedSummaries: PubMedSummary[] = [];
  const uncachedPmids: string[] = [];

  for (const pmid of pmids) {
    const hit = evidenceCache.get<PubMedSummary>(articleCacheKey(pmid));
    if (hit) cachedSummaries.push(hit);
    else uncachedPmids.push(pmid);
  }

  let freshSummaries: PubMedSummary[] = [];
  if (uncachedPmids.length > 0) {
    const raw = await esummary(uncachedPmids);
    freshSummaries = parseSummaries(raw);
    for (const s of freshSummaries) {
      evidenceCache.set(articleCacheKey(s.pmid), s, TTL.ARTICLE);
    }
    console.log(`[evidence:pubmed] esummary fetched=${freshSummaries.length}`);
  }

  const all = [...cachedSummaries, ...freshSummaries];

  // 3. Sort: guideline > systematic_review > article, then by year desc
  all.sort((a, b) => {
    const td = typePriority(inferType(a.pubTypes)) - typePriority(inferType(b.pubTypes));
    if (td !== 0) return td;
    return (b.year ?? "0").localeCompare(a.year ?? "0");
  });

  // 4. Abstracts — cache-first, single batched EFetch for top N only
  const topForAbstracts = all.slice(0, maxAbstracts);
  const cachedAbstracts = new Map<string, string>();
  const uncachedAbstractPmids: string[] = [];

  for (const s of topForAbstracts) {
    const hit = evidenceCache.get<string>(abstractCacheKey(s.pmid));
    if (hit) cachedAbstracts.set(s.pmid, hit);
    else uncachedAbstractPmids.push(s.pmid);
  }

  let fetchedAbstracts = new Map<string, string>();
  let abstractsFailed = false;

  if (uncachedAbstractPmids.length > 0) {
    try {
      const xml = await efetch(uncachedAbstractPmids);
      fetchedAbstracts = parseAbstracts(xml);
      for (const [pmid, abstract] of fetchedAbstracts) {
        evidenceCache.set(abstractCacheKey(pmid), abstract, TTL.ABSTRACT);
      }
      console.log(
        `[evidence:pubmed] efetch abstracts=${fetchedAbstracts.size}`
      );
    } catch (err) {
      abstractsFailed = true;
      console.warn("[evidence:pubmed] efetch failed, metadata-only mode:", err);
    }
  }

  const allAbstracts = new Map([...cachedAbstracts, ...fetchedAbstracts]);
  const hasAbstracts = !abstractsFailed || cachedAbstracts.size > 0;

  // 5. Build output
  const references: EvidenceReference[] = all.map((s) => {
    const type = inferType(s.pubTypes);
    const abstract = allAbstracts.get(s.pmid);
    const ref: EvidenceReference = {
      title: s.title,
      source: s.journal || "PubMed",
      url: s.url,
      year: s.year || undefined,
      type,
    };
    if (abstract) ref.abstract = abstract;
    return ref;
  });

  return { references, hasAbstracts };
}
