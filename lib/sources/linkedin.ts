import { env } from "../env";
import type { Emit } from "../events";
import type { ResolvedIdentity, SourceHit } from "../types";
import { runActor } from "./apify";
import { toSourceHit } from "./util";

// LinkedIn login-wall (HTTP 999) bypass via no-cookies Apify actor. web_search
// can't reach the target's OWN posts; harvestapi/linkedin-profile-posts can —
// that closes the "me voice" gap. by_target for authored; reposts = about_target
// ("amplified, not authored") — no verbatim voice extracted from a repost.
const MAX_POSTS = 6;

// Shape verified against harvestapi~linkedin-profile-posts build 0.0.75 LIVE
// response: text lives in `content`, the post URL in `linkedinUrl`, the date in a
// `postedAt` OBJECT, and a repost is signalled by `repostedBy`/`repostId`/`repost`
// (NOT a boolean `isRepost`). Getting any of these wrong mis-attributes another
// person's reposted words as the target's authored voice — a stage-credibility risk.
interface LiPost {
  text?: string;
  content?: string;
  postedAt?: string | { date?: string; timestamp?: number };
  postedAtISO?: string;
  date?: string;
  url?: string;
  postUrl?: string;
  linkedinUrl?: string;
  isRepost?: boolean;
  repost?: unknown; // object when reposted, else null
  repostId?: string | number | null;
  repostedBy?: unknown; // truthy when this entry is a repost
  author?: Record<string, unknown>;
  authorProfilePicture?: unknown;
  profilePicture?: unknown;
}

// Pull a LinkedIn profile picture (licdn) out of the actor response — field names
// vary by build, so probe common shapes (string, {url}, sized array). This is the
// PREFERRED photo source: trust-first (a real LinkedIn headshot, never a random
// article face). Only the target's OWN entries carry their author picture.
function extractProfilePic(items: LiPost[]): string {
  const pick = (v: unknown): string => {
    if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
    if (Array.isArray(v)) {
      for (const e of v) {
        const u = pick(e && typeof e === "object" ? (e as Record<string, unknown>).url : e);
        if (u) return u;
      }
    }
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      return pick(o.url) || pick(o.src) || pick(o.imageUrl) || "";
    }
    return "";
  };
  for (const p of items) {
    const a = (p.author || {}) as Record<string, unknown>;
    const cand =
      pick(a.profilePicture) || pick(a.profilePictureUrl) || pick(a.picture) || pick(a.image) || pick(a.avatar) ||
      pick(p.authorProfilePicture) || pick(p.profilePicture);
    if (cand && /licdn\.com/i.test(cand)) return cand;
  }
  return "";
}

export async function linkedInPostsTrack(id: ResolvedIdentity, emit: Emit): Promise<SourceHit[]> {
  const handle = id.resolved_handle?.trim();
  const profileUrl = id.linkedin_url || (handle ? `https://www.linkedin.com/in/${handle}/` : "");
  if (!handle || !profileUrl || !env("APIFY_API_TOKEN")) return [];

  emit({ stage: "fanout", status: "track", track: "linkedin-posts" });

  // Actor input is `targetUrls` (stringList), NOT `profiles` — a wrong key is
  // silently ignored (201 + []), killing the own-posts voice layer. Verified
  // against harvestapi~linkedin-profile-posts build 0.0.75 input schema.
  const items = await runActor<LiPost>(
    "harvestapi~linkedin-profile-posts",
    { targetUrls: [profileUrl], maxPosts: MAX_POSTS, includeReposts: true },
    18000,
  );
  if (!items || items.length === 0) return [];

  const hits: SourceHit[] = [];
  for (const p of items.slice(0, MAX_POSTS)) {
    const text = (p.text || p.content || "").trim();
    if (!text) continue;
    // Repost = amplified, not authored: any of repostedBy/repostId/repost(object)
    // or the legacy isRepost flag. Conservative — when in doubt, treat as repost so
    // we never claim someone else's words as the target's by_target voice.
    const isRepost = !!(p.isRepost || p.repostedBy || p.repostId || (p.repost && typeof p.repost === "object"));
    const url = p.linkedinUrl || p.url || p.postUrl || `https://www.linkedin.com/in/${handle}/recent-activity/`;
    const postedDate =
      typeof p.postedAt === "object" && p.postedAt ? p.postedAt.date || "" : (p.postedAtISO || (typeof p.postedAt === "string" ? p.postedAt : "") || p.date || "");
    const h = toSourceHit({
      url,
      title: `LinkedIn post — ${id.name}${isRepost ? " (repost)" : ""}`,
      date: postedDate,
      snippet: text.slice(0, 1200),
      type: "linkedin",
      // repost = about_target (amplified, not authored); authored = by_target.
      relation_to_target: isRepost ? "about_target" : "by_target",
      author_handle: handle,
    });
    hits.push(h);
    emit({ stage: "fanout", status: "hit", track: "linkedin-posts", host: h.host, title: h.title, url: h.url, type: "linkedin", relation: h.relation_to_target });
  }

  // Attach the profile photo as a synthetic /in/{handle} source so resolvePhoto
  // prefers the real LinkedIn headshot (even when CSE didn't return an og:image).
  const pic = extractProfilePic(items);
  if (pic) {
    const profile = toSourceHit({
      url: `https://www.linkedin.com/in/${handle}/`,
      title: `LinkedIn profile — ${id.name}`,
      snippet: "",
      type: "linkedin",
      relation_to_target: "by_target",
      author_handle: handle,
      og_image: pic,
    });
    hits.unshift(profile);
    emit({ stage: "fanout", status: "hit", track: "linkedin-posts", host: profile.host, title: "profile photo", url: profile.url, type: "linkedin", relation: "by_target" });
  }

  return hits;
}
