import { env } from "../env";
import type { Emit } from "../events";
import { buildQueries } from "../queries";
import type { ResolvedIdentity, SourceHit } from "../types";
import { toSourceHit } from "./util";

// Google Programmable Search (CSE) dual-engine track. Richer + Korean-deep vs the
// web_search floor; returns real snippets (quote-gate verifiable) + og:image
// (photo). cost-circuit-breaker caps HTTP calls per person; 429 → stop the loop.
const CAP = 12;

interface CseItem {
  title: string;
  link: string;
  snippet?: string;
  pagemap?: { metatags?: Array<Record<string, string>>; cse_image?: Array<{ src: string }> };
}

function metaOf(item: CseItem, keys: string[]): string {
  const m = item.pagemap?.metatags?.[0];
  if (!m) return "";
  for (const k of keys) if (m[k]) return m[k];
  return "";
}

function ogImageOf(item: CseItem): string {
  return metaOf(item, ["og:image", "twitter:image"]) || item.pagemap?.cse_image?.[0]?.src || "";
}

export async function cseTrack(id: ResolvedIdentity, emit: Emit): Promise<SourceHit[]> {
  const key = env("GOOGLE_SEARCH_API_KEY");
  const cxFull = env("GOOGLE_SEARCH_ENGINE_ID_FULL_WEB");
  const cxTrusted = env("GOOGLE_SEARCH_ENGINE_ID_TRUSTED");
  if (!key || (!cxFull && !cxTrusted)) return []; // not configured → graceful skip

  emit({ stage: "fanout", status: "track", track: "cse" });
  const engines = [cxFull, cxTrusted].filter(Boolean) as string[];
  const queries = buildQueries(id).slice(0, 4); // bound query count

  const hits: SourceHit[] = [];
  let calls = 0;
  let stop = false;

  for (const q of queries) {
    if (stop) break;
    for (const cx of engines) {
      if (stop || calls >= CAP) break; // cost-circuit-breaker
      calls++;
      try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&num=5&q=${encodeURIComponent(q.q)}`;
        const res = await fetch(url);
        if (res.status === 429) {
          emit({ stage: "gate", status: "info", gate: 0, message: "CSE 429 — quota; stopping CSE track" });
          stop = true;
          break;
        }
        if (!res.ok) continue; // 4xx/5xx on one query never crashes the run
        const data = (await res.json()) as { items?: CseItem[] };
        for (const it of data.items || []) {
          const h = toSourceHit({
            url: it.link,
            title: it.title,
            snippet: it.snippet || "",
            date: metaOf(it, ["article:published_time", "og:updated_time"]),
            author_handle: metaOf(it, ["article:author"]),
            relation_to_target: q.relation === "by_target" ? "by_target" : q.relation === "third_party" ? "third_party" : "about_target",
            og_image: ogImageOf(it),
          });
          hits.push(h);
          emit({ stage: "fanout", status: "hit", track: "cse", host: h.host, title: h.title, url: h.url, type: h.type, relation: h.relation_to_target });
        }
      } catch {
        // network error on a single call → skip, keep going
      }
    }
  }

  return hits;
}
