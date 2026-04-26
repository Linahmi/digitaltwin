import { fetchPubMedEvidence } from "./pubmed/pubmedProvider";
import { fetchTrustedEvidence } from "./trusted/trustedProvider";
import type { EvidenceResult, EvidenceReference } from "./pubmed/types";

export type { EvidenceResult, EvidenceReference };

export async function getEvidence(query: string): Promise<EvidenceResult> {
  console.log(`[evidence:service] query="${query.slice(0, 80)}"`);
  const diagnostics: string[] = [];

  // ── 1. PubMed ────────────────────────────────────────────────────────────
  try {
    const pubmed = await fetchPubMedEvidence(query);

    if (pubmed.references.length > 0) {
      const status = pubmed.hasAbstracts
        ? "pubmed_full"
        : "pubmed_metadata_only";
      console.log(
        `[evidence:service] success status=${status} refs=${pubmed.references.length}`
      );
      return {
        evidenceStatus: status,
        primarySourceUsed: "pubmed",
        query,
        references: pubmed.references,
        diagnostics,
        warning: pubmed.hasAbstracts
          ? undefined
          : "Abstract retrieval failed. Results include metadata only — avoid strong conclusions.",
      };
    }
    // PubMed returned 0 results — fall through to trusted sources.
    diagnostics.push("PubMed search completed but returned 0 results.");
    console.warn("[evidence:service] PubMed returned 0 results, trying trusted fallback");
  } catch (err) {
    diagnostics.push(`PubMed request failed: ${err instanceof Error ? err.message : String(err)}`);
    console.warn("[evidence:service] PubMed failed, trying trusted fallback:", err);
  }

  // ── 2. Trusted fallback ──────────────────────────────────────────────────
  try {
    const trusted = await fetchTrustedEvidence(query);
    const warning = trusted.fromCurated
      ? "Based on public health guidelines and trusted medical sources (PubMed returned no results)."
      : "PubMed returned no results. The links below point to trusted medical sources — content not verified against your specific query.";

    console.log(
      `[evidence:service] trusted fallback refs=${trusted.references.length} fromCurated=${trusted.fromCurated}`
    );
    return {
      evidenceStatus: "trusted_fallback",
      primarySourceUsed: "trusted_fallback",
      query,
      references: trusted.references,
      diagnostics,
      warning,
    };
  } catch (err) {
    diagnostics.push(`Trusted fallback failed: ${err instanceof Error ? err.message : String(err)}`);
    console.error("[evidence:service] trusted fallback also failed:", err);
  }

  // ── 3. Total failure ─────────────────────────────────────────────────────
  console.error("[evidence:service] all sources failed for query:", query);
  return {
    evidenceStatus: "unavailable",
    primarySourceUsed: "none",
    query,
    references: [],
    diagnostics,
    warning:
      "Evidence retrieval is temporarily unavailable. Please consult your healthcare provider directly.",
  };
}
