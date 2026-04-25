export interface EvidenceReference {
  title: string;
  source: string;
  url: string;
  year?: string;
  type?: "article" | "guideline" | "systematic_review";
  abstract?: string;
}

export interface EvidenceResult {
  evidenceStatus: "pubmed_full" | "pubmed_metadata_only" | "trusted_fallback" | "unavailable";
  primarySourceUsed: "pubmed" | "trusted_fallback" | "none";
  query: string;
  references: EvidenceReference[];
  warning?: string;
}

export interface PubMedSummary {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: string;
  pubTypes: string[];
  doi?: string;
  url: string;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
