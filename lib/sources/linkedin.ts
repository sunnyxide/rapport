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

interface LiPost {
  text?: string;
  content?: string;
  postedAt?: string;
  postedAtISO?: string;
  date?: string;
  url?: string;
  postUrl?: string;
  isRepost?: boolean;
  repost?: boolean;
}

export async function linkedInPostsTrack(id: ResolvedIdentity, emit: Emit): Promise<SourceHit[]> {
  const handle = id.resolved_handle?.trim();
  const profileUrl = id.linkedin_url || (handle ? `https://www.linkedin.com/in/${handle}/` : "");
  if (!handle || !profileUrl || !env("APIFY_API_TOKEN")) return [];

  emit({ stage: "fanout", status: "track", track: "linkedin-posts" });

  const items = await runActor<LiPost>(
    "harvestapi~linkedin-profile-posts",
    { profiles: [profileUrl], maxPosts: MAX_POSTS, includeReposts: true },
    18000,
  );
  if (!items || items.length === 0) return [];

  const hits: SourceHit[] = [];
  for (const p of items.slice(0, MAX_POSTS)) {
    const text = (p.text || p.content || "").trim();
    if (!text) continue;
    const isRepost = !!(p.isRepost || p.repost);
    const url = p.url || p.postUrl || `https://www.linkedin.com/in/${handle}/recent-activity/`;
    const h = toSourceHit({
      url,
      title: `LinkedIn post — ${id.name}${isRepost ? " (repost)" : ""}`,
      date: p.postedAtISO || p.postedAt || p.date || "",
      snippet: text.slice(0, 1200),
      type: "linkedin",
      // repost = about_target (amplified, not authored); authored = by_target.
      relation_to_target: isRepost ? "about_target" : "by_target",
      author_handle: handle,
    });
    hits.push(h);
    emit({ stage: "fanout", status: "hit", track: "linkedin-posts", host: h.host, title: h.title, url: h.url, type: "linkedin", relation: h.relation_to_target });
  }
  return hits;
}
