"use client";

import { useState } from "react";
import type { Persona } from "@/lib/types";

// Image-shape guard: render <img> only when photo_url looks like an actual image
// (extension or known image host) — never a page URL. onError → initials avatar
// (deterministic name-hash hue). provenance caption.
function looksLikeImage(url: string): boolean {
  if (!url) return false;
  if (/\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url)) return true;
  return /(licdn\.com|media\.|images?\.|pbs\.twimg\.com|ggpht\.com|githubusercontent\.com)/i.test(url);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function Photo({ identity, size = 96 }: { identity: Persona["identity"]; size?: number }) {
  const [failed, setFailed] = useState(false);
  const showImg = !failed && looksLikeImage(identity.photo_url);
  const dim = { width: size, height: size };

  if (showImg) {
    return (
      <figure className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/img?u=${encodeURIComponent(identity.photo_url)}`}
          alt={identity.name}
          {...dim}
          onError={() => setFailed(true)}
          className="rounded-sm border border-hair object-cover"
          style={{ width: size, height: size }}
        />
        {identity.photo_provenance && identity.photo_provenance !== "none" && (
          <figcaption className="mt-1 font-mono text-[9px] text-muted">photo: {identity.photo_provenance}</figcaption>
        )}
      </figure>
    );
  }

  const hue = hashHue(identity.name);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-sm font-serif text-white"
      style={{ width: size, height: size, fontSize: size / 3, background: `hsl(${hue} 32% 42%)` }}
      aria-label={identity.name}
    >
      {initials(identity.name) || "?"}
    </div>
  );
}
