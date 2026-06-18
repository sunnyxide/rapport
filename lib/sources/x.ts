import { env } from "../env";
import type { Emit } from "../events";
import type { ResolvedIdentity, SourceHit } from "../types";
import { runActor } from "./apify";
import { toSourceHit } from "./util";

// X / Twitter track (no-cookies via Apify, bypasses the 402 on direct fetch).
// Name-search surfaces posts mentioning the target. We CANNOT verify the author
// is the target from a bare name search, so everything is tagged about_target and
// routed through Gate#4's Stage-2 judge (never assume by_target).
const MAX_POSTS = 8;

interface XPost {
  text?: string;
  full_text?: string;
  url?: string;
  twitterUrl?: string;
  createdAt?: string;
  date?: string;
  author?: { userName?: string; screen_name?: string } | string;
}

function authorOf(p: XPost): string {
  if (typeof p.author === "string") return p.author;
  return (p.author?.userName || p.author?.screen_name || "").toLowerCase();
}

export async function xTrack(id: ResolvedIdentity, emit: Emit): Promise<SourceHit[]> {
  if (!env("APIFY_API_TOKEN")) return [];
  emit({ stage: "fanout", status: "track", track: "x-search" });

  const items = await runActor<XPost>(
    "scraper_one~x-posts-search",
    { searchTerms: [`"${id.name}"${id.company ? ` ${id.company}` : ""}`], maxItems: MAX_POSTS },
    18000,
  );
  if (!items || items.length === 0) return [];

  const hits: SourceHit[] = [];
  for (const p of items.slice(0, MAX_POSTS)) {
    const text = (p.text || p.full_text || "").trim();
    if (!text) continue;
    const url = p.url || p.twitterUrl || "";
    if (!url) continue;
    const h = toSourceHit({
      url,
      title: `X post — ${id.name}`,
      date: p.createdAt || p.date || "",
      snippet: text.slice(0, 800),
      type: "x",
      relation_to_target: "about_target", // unverified author → judged by Gate#4
      author_handle: authorOf(p),
    });
    hits.push(h);
    emit({ stage: "fanout", status: "hit", track: "x-search", host: h.host, title: h.title, url: h.url, type: "x", relation: h.relation_to_target });
  }
  return hits;
}
