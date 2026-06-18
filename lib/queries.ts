import type { ResolvedIdentity } from "./types";

export interface Query {
  q: string;
  // provisional relation hint for sources found via this query (Gate #4 Stage 1 overrides)
  relation: "by_target" | "about_target" | "third_party" | "general";
  priority: number;
}

// General + self/repost/mention query pack. When a resolved handle exists, add 3
// handle-scoped queries (atomic with Gate #4 tagging — mentions without tagging
// amplify the sonupaik-style hallucination). No handle → fail-SAFE: NO by_target
// query; everything stays about/third. cap 12.
export function buildQueries(id: ResolvedIdentity): Query[] {
  const name = id.name.trim();
  const company = id.company?.trim();
  const handle = id.resolved_handle?.trim();
  const base = `"${name}"${company ? ` ${company}` : ""}`;

  const out: Query[] = [
    { q: base, relation: "general", priority: 0 },
    { q: `${base} interview OR podcast OR talk`, relation: "about_target", priority: 1 },
    { q: `${base} background OR profile OR career`, relation: "about_target", priority: 1 },
  ];

  if (handle) {
    // by_target: the target's OWN authored activity (prefer for voice/values).
    out.push({ q: `"${name}" site:linkedin.com/posts`, relation: "by_target", priority: 0 });
    out.push({ q: `site:linkedin.com/in/${handle}`, relation: "by_target", priority: 0 });
    // about/third: others talking about the target, excluding the target's own page.
    out.push({
      q: `"${name}" -site:linkedin.com/in/${handle} (said OR wrote OR "according to")`,
      relation: "third_party",
      priority: 2,
    });
  }

  return out.slice(0, 12);
}
