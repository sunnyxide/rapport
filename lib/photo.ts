import type { ResolvedIdentity, SourceHit } from "./types";

// Resolution order: a) resolved LinkedIn /in/{handle} og/profile image →
// b) trusted article og:image → c) none (UI falls back to initials).
// image-shape guard: only accept actual image URLs, never page URLs.
function isImageUrl(u: string): boolean {
  if (!u) return false;
  if (/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(u)) return true;
  return /(licdn\.com|media\.|images?\.|pbs\.twimg\.com|ggpht\.com|githubusercontent\.com)/i.test(u);
}

export interface PhotoResult {
  photo_url: string;
  photo_source_url: string;
  photo_provenance: "linkedin" | "article" | "none";
}

export function resolvePhoto(id: ResolvedIdentity, hits: SourceHit[]): PhotoResult {
  const handle = id.resolved_handle?.toLowerCase();

  if (handle) {
    const own = hits.find(
      (h) => new RegExp(`linkedin\\.com/in/${handle}`, "i").test(h.url) && h.og_image && isImageUrl(h.og_image),
    );
    if (own?.og_image) return { photo_url: own.og_image, photo_source_url: own.url, photo_provenance: "linkedin" };
  }

  const article = hits.find(
    (h) => (h.type === "news" || h.type === "article" || h.type === "web") && h.og_image && isImageUrl(h.og_image),
  );
  if (article?.og_image) return { photo_url: article.og_image, photo_source_url: article.url, photo_provenance: "article" };

  return { photo_url: "", photo_source_url: "", photo_provenance: "none" };
}
