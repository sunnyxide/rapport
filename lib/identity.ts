import { MODEL_FAST } from "./anthropic";
import { structured } from "./llm";
import { IDENTITY_SCHEMA } from "./schema";
import type { IdentityResult, OutputLang } from "./types";

export interface Seed {
  name: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  meeting_context?: string;
  output_lang?: OutputLang;
}

// Deterministically extract the canonical LinkedIn handle from a /in/<handle> URL.
// Load-bearing for Gate #4 — romanized Korean names collide, so the handle (not
// the name) is the authoritative match key.
export function handleFromLinkedIn(url?: string): string {
  if (!url) return "";
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : "";
}

const IDENTITY_SYSTEM = `You are the IDENTITY GATE of Rapport, a person-intelligence tool. Resolve the seed to the ONE specific real person using your OWN knowledge — you have NO web access in this step (it is intentionally fast, ~5s).

Rules:
- If a LinkedIn URL is seeded, TRUST it as the canonical identity and extract the handle from /in/<handle>.
- If two or more well-known same-name people plausibly match AND the seed (company/title/URL) does NOT disambiguate, return status "needs_disambiguation" with 2-3 candidate chips {name,title,company,distinguishing_detail}. Do NOT guess.
- A famous / cleanly-identifiable person → status "ok" with confidence and the distinguishing signal you used.
- If you are not confident which person it is (ambiguous, < ~0.6), PREFER needs_disambiguation over a wrong resolve. A same-name collision is the #1 live-demo killer.
- NEVER invent a LinkedIn handle you don't actually know; leave resolved_handle "" if the seed gives no URL and you can't be sure.
Output strict JSON only.`;

export async function resolveIdentity(seed: Seed): Promise<IdentityResult> {
  const seededHandle = handleFromLinkedIn(seed.linkedin_url);
  const user = [
    `Seed name: ${seed.name}`,
    seed.company ? `Company/context: ${seed.company}` : "",
    seed.title ? `Title: ${seed.title}` : "",
    seed.linkedin_url ? `LinkedIn URL: ${seed.linkedin_url} (handle: ${seededHandle || "?"})` : "",
    seed.meeting_context ? `Meeting context: ${seed.meeting_context}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const parsed = await structured<IdentityResult>({
    model: MODEL_FAST,
    system: IDENTITY_SYSTEM,
    user,
    schema: IDENTITY_SCHEMA,
    effort: "low",
    maxTokens: 1500,
  });

  // Deterministic override: a seeded URL handle always wins (anti-collision spine).
  if (parsed.resolved) {
    if (seededHandle) parsed.resolved.resolved_handle = seededHandle;
    if (seed.linkedin_url) parsed.resolved.linkedin_url = seed.linkedin_url;
  }
  return parsed;
}
