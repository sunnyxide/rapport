import { env } from "../env";
import type { Emit } from "../events";
import type { SourceHit } from "../types";

// Apify common runner. Bearer header ONLY (never a URL token — leaks in error
// reprs). Time-boxed; 407/429 → bail (no retry loop); any error → null (graceful).
export async function runActor<T = unknown>(actor: string, input: unknown, timeboxMs = 25000): Promise<T[] | null> {
  const token = env("APIFY_API_TOKEN");
  if (!token) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeboxMs);
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      signal: ctrl.signal,
      body: JSON.stringify(input),
    });
    if (res.status === 407 || res.status === 429) return null; // proxy/quota → bail
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null; // timeout / network → graceful
  } finally {
    clearTimeout(timer);
  }
}

// website-content-crawler deepen: pull full body (8k+ chars, headless Firefox
// renders SPAs) for the top sources so the quote gate has real verbatim text
// (sim_d: the 0-drop quote enabler). Skip hosts cheerio/crawlers can't help with.
const ENRICH_SKIP = /linkedin\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|instagram\.com|facebook\.com|namu\.wiki|wikipedia\.org/i;
const DEEPEN_CAP = 3;

export async function enrichWithApify(hits: SourceHit[], emit: Emit): Promise<SourceHit[]> {
  if (!env("APIFY_API_TOKEN")) return hits;

  const candidates = hits.filter((h) => !ENRICH_SKIP.test(h.url) && h.snippet.length < 600).slice(0, DEEPEN_CAP);
  if (candidates.length === 0) return hits;

  emit({ stage: "fanout", status: "track", track: "apify-deepen" });
  const enrichedById = new Map<string, string>();

  await Promise.allSettled(
    candidates.map(async (h) => {
      const items = await runActor<{ text?: string; markdown?: string }>(
        "apify~website-content-crawler",
        { startUrls: [{ url: h.url }], maxCrawlPages: 1, maxCrawlDepth: 0, crawlerType: "playwright:firefox", saveMarkdown: true },
        15000,
      );
      const body = (items?.[0]?.markdown || items?.[0]?.text || "").slice(0, 8000);
      if (body) {
        enrichedById.set(h.id, body);
        emit({ stage: "fanout", status: "hit", track: "apify-deepen", host: h.host, title: `deepened ${h.host} (${body.length}c)`, url: h.url, type: h.type });
      }
    }),
  );

  return hits.map((h) => (enrichedById.has(h.id) ? { ...h, snippet: `${h.snippet}\n${enrichedById.get(h.id)}` } : h));
}
