import type { RelationToTarget, SourceHit } from "../types";

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

// Classify a source type from its host (icons + transcript routing).
export function typeFromHost(host: string): string {
  if (/youtube\.com|youtu\.be/.test(host)) return "youtube";
  if (/linkedin\.com/.test(host)) return "linkedin";
  if (/twitter\.com|x\.com/.test(host)) return "x";
  if (/github\.com/.test(host)) return "github";
  if (/chosun|joongang|donga|hankyung|mk\.co|yna\.co|sedaily|techcrunch|forbes|nytimes|bloomberg|theinformation|wired/.test(host))
    return "news";
  if (/spotify|apple\.com\/.*podcast|podcast/.test(host)) return "podcast";
  return "web";
}

// Parse a LinkedIn author handle from /posts/<handle>_... or /in/<handle>.
export function authorHandleFromUrl(url: string): string {
  const posts = url.match(/linkedin\.com\/posts\/([^_/?#]+)/i);
  if (posts) return posts[1].toLowerCase();
  const inn = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (inn) return inn[1].toLowerCase();
  return "";
}

let counter = 0;
export function resetSourceIds() {
  counter = 0;
}

// Normalize a raw harvested record into a SourceHit with id/host/type filled.
export function toSourceHit(raw: {
  url: string;
  title?: string;
  date?: string;
  snippet?: string;
  type?: string;
  relation_to_target?: RelationToTarget;
  author_handle?: string;
  og_image?: string;
}): SourceHit {
  const host = hostOf(raw.url);
  return {
    id: `s${++counter}`,
    url: raw.url,
    title: raw.title || host,
    date: raw.date || "",
    snippet: raw.snippet || "",
    host,
    type: raw.type || typeFromHost(host),
    relation_to_target: raw.relation_to_target || "about_target",
    author_handle: raw.author_handle || authorHandleFromUrl(raw.url),
    ...(raw.og_image ? { og_image: raw.og_image } : {}),
  };
}

// Dedupe by normalized URL, keeping the richest snippet + any og_image.
export function dedupeSources(hits: SourceHit[]): SourceHit[] {
  const byUrl = new Map<string, SourceHit>();
  for (const h of hits) {
    const key = h.url.replace(/[#?].*$/, "").replace(/\/$/, "");
    const prev = byUrl.get(key);
    if (!prev) {
      byUrl.set(key, h);
    } else {
      byUrl.set(key, {
        ...prev,
        snippet: h.snippet.length > prev.snippet.length ? h.snippet : prev.snippet,
        og_image: prev.og_image || h.og_image,
        date: prev.date || h.date,
      });
    }
  }
  return [...byUrl.values()];
}
