import type { ResolvedIdentity, SourceHit } from "./types";

// Photo resolution — TRUST-FIRST. Showing the wrong person's face is worse than
// no photo, so we only accept images from sources that reliably depict the target:
//   a) the target's own LinkedIn profile image (licdn) — PREFERRED
//   b) the target's GitHub avatar (githubusercontent) — reliable for builders
//   else → none (UI renders initials).
// We intentionally DROP article/news/web og:image fallbacks: those routinely
// surface a stock photo, a logo, or a DIFFERENT person (rocketreach, a random
// article lead image), which destroys trust in a person-intelligence product.
const LINKEDIN_IMG = /licdn\.com/i;
const GITHUB_IMG = /githubusercontent\.com/i;

type Hit = SourceHit & { og_image?: string };

export interface PhotoResult {
  photo_url: string;
  photo_source_url: string;
  photo_provenance: "linkedin" | "github" | "none";
}

const NONE: PhotoResult = { photo_url: "", photo_source_url: "", photo_provenance: "none" };

export function resolvePhoto(id: ResolvedIdentity, hits: SourceHit[]): PhotoResult {
  const handle = id.resolved_handle?.toLowerCase();
  const list = hits as Hit[];

  // a) LinkedIn profile image — from the /in/{handle} page OR any by_target
  //    LinkedIn source (the Apify own-posts track attaches the profile picture).
  const li = list.find(
    (h) =>
      h.og_image &&
      LINKEDIN_IMG.test(h.og_image) &&
      ((handle && new RegExp(`linkedin\\.com/in/${handle}`, "i").test(h.url)) ||
        (h.type === "linkedin" && h.relation_to_target === "by_target")),
  );
  if (li?.og_image) return { photo_url: li.og_image, photo_source_url: li.url, photo_provenance: "linkedin" };

  // Any licdn image about the target (even if relation tagging is loose) — still
  // the person's LinkedIn headshot, never a random article face.
  const liAny = list.find((h) => h.og_image && LINKEDIN_IMG.test(h.og_image) && /linkedin\.com/i.test(h.url));
  if (liAny?.og_image) return { photo_url: liAny.og_image, photo_source_url: liAny.url, photo_provenance: "linkedin" };

  // b) GitHub avatar (reliable for builder targets).
  const gh = list.find((h) => h.og_image && GITHUB_IMG.test(h.og_image));
  if (gh?.og_image) return { photo_url: gh.og_image, photo_source_url: gh.url, photo_provenance: "github" };

  return NONE;
}
