import type { RelationToTarget, SourceHit } from "../types";

// Cross-script normalize for quote substring-verify: lowercase, keep CJK + latin
// alphanumerics, drop the rest. Tolerant of punctuation/spacing/quote-mark drift.
export function normalizeForVerify(s: string): string {
  return (s || "").toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "");
}

// A relation that may back first-person voice / values / behavioral reads.
export function isVoiceEligible(r: RelationToTarget): boolean {
  return r === "by_target" || r === "about_target";
}

// Gate #4 Stage 1 — deterministic handle-match. Re-derive each source's relation
// from its parsed author handle vs the resolved handle. Kills the demonstrated
// sonupaik→sunwoo-ju hallucination (different handle = NOT the target).
// No handle resolved → fail-SAFE: nothing is by_target.
export function applyHandleMatch(sources: SourceHit[], resolvedHandle: string): SourceHit[] {
  const target = resolvedHandle.toLowerCase();
  return sources.map((s) => {
    const author = s.author_handle?.toLowerCase() || "";
    const hasAuthored = /linkedin\.com\/(posts|in)\//i.test(s.url) && author;
    if (!hasAuthored) return s; // non-LinkedIn → leave for Stage 2 judge
    let relation: RelationToTarget;
    if (!target) relation = "third_party"; // fail-SAFE
    else if (author === target) relation = "by_target";
    else relation = "third_party"; // same-name different handle = NOT the target
    return { ...s, relation_to_target: relation };
  });
}
