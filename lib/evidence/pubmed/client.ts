import { rateLimiter } from "./rateLimiter";

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

export type RequestType = "esearch" | "esummary" | "efetch";

function ncbiParams(extra: Record<string, string> = {}): URLSearchParams {
  const p = new URLSearchParams({
    db: "pubmed",
    retmode: "json",
    tool: process.env.NCBI_TOOL ?? "digital-health-twin",
    email: process.env.NCBI_EMAIL ?? "dev@example.com",
    ...extra,
  });
  if (process.env.NCBI_API_KEY) p.set("api_key", process.env.NCBI_API_KEY);
  return p;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function withJitter(baseMs: number): number {
  return baseMs + Math.random() * baseMs * 0.3;
}

async function fetchWithRetry(
  url: string,
  reqType: RequestType,
  attempt = 0
): Promise<Response> {
  await rateLimiter.acquire();
  console.log(
    `[evidence:${reqType}] attempt=${attempt} url=${url.split("?")[0]}`
  );

  const res = await fetch(url);
  console.log(`[evidence:${reqType}] status=${res.status} attempt=${attempt}`);

  if (res.ok) return res;

  if (attempt >= 3) {
    throw new Error(
      `[evidence:${reqType}] failed after 3 retries, last status=${res.status}`
    );
  }

  if (res.status === 429 || res.status >= 500) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const baseDelay = retryAfterHeader
      ? parseInt(retryAfterHeader, 10) * 1000
      : ([1000, 2000, 4000][attempt] ?? 4000);
    const delay = withJitter(baseDelay);
    console.log(
      `[evidence:${reqType}] retrying attempt=${attempt + 1} delay=${Math.round(delay)}ms`
    );
    await sleep(delay);
    return fetchWithRetry(url, reqType, attempt + 1);
  }

  throw new Error(`[evidence:${reqType}] unexpected status=${res.status}`);
}

export async function esearch(query: string, retmax = 10): Promise<string[]> {
  const params = ncbiParams({
    term: query,
    retmax: String(retmax),
    sort: "relevance",
    usehistory: "n",
  });
  const res = await fetchWithRetry(`${BASE}/esearch.fcgi?${params}`, "esearch");
  const json = await res.json();
  return (json?.esearchresult?.idlist ?? []) as string[];
}

export async function esummary(
  pmids: string[]
): Promise<Record<string, unknown>> {
  if (pmids.length === 0) return {};
  const params = ncbiParams({ id: pmids.join(",") });
  const res = await fetchWithRetry(
    `${BASE}/esummary.fcgi?${params}`,
    "esummary"
  );
  const json = await res.json();
  return (json?.result ?? {}) as Record<string, unknown>;
}

export async function efetch(pmids: string[]): Promise<string> {
  if (pmids.length === 0) return "";
  // EFetch uses XML mode; build params manually since retmode differs.
  const p = new URLSearchParams({
    db: "pubmed",
    retmode: "xml",
    rettype: "abstract",
    id: pmids.join(","),
    tool: process.env.NCBI_TOOL ?? "digital-health-twin",
    email: process.env.NCBI_EMAIL ?? "dev@example.com",
  });
  if (process.env.NCBI_API_KEY) p.set("api_key", process.env.NCBI_API_KEY);
  const res = await fetchWithRetry(`${BASE}/efetch.fcgi?${p}`, "efetch");
  return res.text();
}
