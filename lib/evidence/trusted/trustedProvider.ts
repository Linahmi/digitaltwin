import type { EvidenceReference } from "../pubmed/types";

interface TrustedSource {
  name: string;
  searchUrl: (q: string) => string;
}

const TRUSTED_SOURCES: TrustedSource[] = [
  {
    name: "NICE Guidelines",
    searchUrl: (q) =>
      `https://www.nice.org.uk/search#q=${encodeURIComponent(q)}&ndt=Guidance`,
  },
  {
    name: "WHO",
    searchUrl: (q) =>
      `https://www.who.int/search#q=${encodeURIComponent(q)}`,
  },
  {
    name: "CDC",
    searchUrl: (q) =>
      `https://search.cdc.gov/search/?query=${encodeURIComponent(q)}`,
  },
  {
    name: "Cochrane Library",
    searchUrl: (q) =>
      `https://www.cochranelibrary.com/search?q=${encodeURIComponent(q)}&t=6`,
  },
  {
    name: "MSD Manual Professional",
    searchUrl: (q) =>
      `https://www.msdmanuals.com/professional/search?q=${encodeURIComponent(q)}`,
  },
  {
    name: "AAFP",
    searchUrl: (q) =>
      `https://www.aafp.org/search.html#q=${encodeURIComponent(q)}`,
  },
];

interface CuratedEntry {
  keywords: string[];
  references: EvidenceReference[];
}

// All URLs below are verified, live guideline pages as of 2025.
const CURATED_GUIDELINES: CuratedEntry[] = [
  {
    keywords: ["hypertension", "blood pressure", "antihypertensive", "systolic"],
    references: [
      {
        title: "Hypertension in adults: diagnosis and management (NG136)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/ng136",
        year: "2023",
        type: "guideline",
      },
      {
        title: "High Blood Pressure (Hypertension)",
        source: "CDC",
        url: "https://www.cdc.gov/high-blood-pressure/",
        year: "2024",
        type: "guideline",
      },
    ],
  },
  {
    keywords: ["diabetes", "type 2 diabetes", "glycemic", "hba1c", "blood glucose", "insulin resistance"],
    references: [
      {
        title: "Type 2 diabetes in adults: management (NG28)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/ng28",
        year: "2022",
        type: "guideline",
      },
      {
        title: "Type 2 Diabetes",
        source: "CDC",
        url: "https://www.cdc.gov/diabetes/type2/",
        year: "2024",
        type: "guideline",
      },
    ],
  },
  {
    keywords: ["cholesterol", "ldl", "hyperlipidemia", "dyslipidemia", "statin", "lipids", "hdl", "triglycerides"],
    references: [
      {
        title: "Cardiovascular disease: risk assessment and reduction, including lipid modification (CG181)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/cg181",
        year: "2023",
        type: "guideline",
      },
      {
        title: "Cholesterol",
        source: "CDC",
        url: "https://www.cdc.gov/cholesterol/",
        year: "2024",
        type: "guideline",
      },
    ],
  },
  {
    keywords: ["cardiovascular", "heart disease", "coronary", "atherosclerosis", "cvd", "cardiac", "heart failure"],
    references: [
      {
        title: "Cardiovascular disease prevention (PH25)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/ph25",
        year: "2023",
        type: "guideline",
      },
      {
        title: "Heart Disease",
        source: "CDC",
        url: "https://www.cdc.gov/heart-disease/",
        year: "2024",
        type: "guideline",
      },
      {
        title: "Cardiovascular diseases (CVDs)",
        source: "WHO",
        url: "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)",
        year: "2021",
        type: "guideline",
      },
    ],
  },
  {
    keywords: ["obesity", "bmi", "weight loss", "overweight", "bariatric"],
    references: [
      {
        title: "Obesity: identification, assessment and management (CG189)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/cg189",
        year: "2023",
        type: "guideline",
      },
      {
        title: "Obesity and overweight",
        source: "WHO",
        url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
        year: "2024",
        type: "guideline",
      },
    ],
  },
  {
    keywords: ["smoking", "tobacco", "smoking cessation", "nicotine"],
    references: [
      {
        title: "Stop smoking interventions and services (NG209)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/ng209",
        year: "2023",
        type: "guideline",
      },
      {
        title: "Smoking and Tobacco Use",
        source: "CDC",
        url: "https://www.cdc.gov/tobacco/",
        year: "2024",
        type: "guideline",
      },
    ],
  },
  {
    keywords: ["depression", "anxiety", "mental health", "antidepressant", "ssri"],
    references: [
      {
        title: "Depression in adults: treatment and management (NG222)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/ng222",
        year: "2022",
        type: "guideline",
      },
      {
        title: "Mental health",
        source: "WHO",
        url: "https://www.who.int/health-topics/mental-health",
        year: "2024",
        type: "guideline",
      },
    ],
  },
  {
    keywords: ["asthma", "copd", "respiratory", "inhaler", "bronchodilator"],
    references: [
      {
        title: "Asthma: diagnosis, monitoring and chronic asthma management (NG80)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/ng80",
        year: "2023",
        type: "guideline",
      },
    ],
  },
  {
    keywords: ["chronic kidney disease", "ckd", "renal", "kidney disease", "egfr"],
    references: [
      {
        title: "Chronic kidney disease: assessment and management (NG203)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/ng203",
        year: "2023",
        type: "guideline",
      },
    ],
  },
  {
    keywords: ["stroke", "tia", "transient ischemic", "cerebrovascular"],
    references: [
      {
        title: "Stroke and transient ischaemic attack in over 16s: diagnosis and initial management (NG128)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/ng128",
        year: "2023",
        type: "guideline",
      },
      {
        title: "Stroke",
        source: "CDC",
        url: "https://www.cdc.gov/stroke/",
        year: "2024",
        type: "guideline",
      },
    ],
  },
  {
    keywords: ["atrial fibrillation", "afib", "arrhythmia", "anticoagulant", "warfarin"],
    references: [
      {
        title: "Atrial fibrillation: diagnosis and management (NG196)",
        source: "NICE Guidelines",
        url: "https://www.nice.org.uk/guidance/ng196",
        year: "2023",
        type: "guideline",
      },
    ],
  },
];

function matchCurated(query: string): EvidenceReference[] {
  const q = query.toLowerCase();
  const results: EvidenceReference[] = [];
  const seen = new Set<string>();

  for (const entry of CURATED_GUIDELINES) {
    if (entry.keywords.some((kw) => q.includes(kw))) {
      for (const ref of entry.references) {
        if (!seen.has(ref.url)) {
          seen.add(ref.url);
          results.push(ref);
        }
      }
    }
  }

  return results;
}

function extractSearchTerms(query: string): string {
  // Pull quoted strings out of a structured PubMed query (e.g. "diabetes"[MeSH Terms])
  // and discard PubMed field tags so we get clean, deduplicated keywords.
  const seen = new Set<string>();
  const quoted = [...query.matchAll(/"([^"]+)"/g)]
    .map((m) => m[1].split("[")[0].trim())
    .filter(
      (k) =>
        k.length > 2 &&
        !k.match(/^\d{4}\//) && // skip date strings
        !k.match(/^[A-Z]{2,}$/) // skip ALL-CAPS qualifiers
    )
    .filter((k) => {
      const low = k.toLowerCase();
      if (seen.has(low)) return false;
      seen.add(low);
      return true;
    })
    .slice(0, 4);
  if (quoted.length > 0) return quoted.join(" ");
  return query.split(" ").slice(0, 5).join(" ");
}

function buildSearchLinks(query: string): EvidenceReference[] {
  const terms = extractSearchTerms(query);
  return TRUSTED_SOURCES.map((src) => ({
    title: `Search "${terms}" on ${src.name}`,
    source: src.name,
    url: src.searchUrl(terms),
    type: "guideline" as const,
  }));
}

export interface TrustedProviderResult {
  references: EvidenceReference[];
  fromCurated: boolean;
}

export async function fetchTrustedEvidence(
  query: string
): Promise<TrustedProviderResult> {
  console.log(`[evidence:trusted] query="${query.slice(0, 80)}..."`);
  const curated = matchCurated(query);
  if (curated.length > 0) {
    console.log(`[evidence:trusted] curated match refs=${curated.length}`);
    return { references: curated, fromCurated: true };
  }
  const links = buildSearchLinks(query);
  console.log(`[evidence:trusted] no curated match, returning search links count=${links.length}`);
  return { references: links, fromCurated: false };
}
