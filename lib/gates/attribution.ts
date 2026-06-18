import { MODEL_FAST } from "../anthropic";
import type { Emit } from "../events";
import { structured } from "../llm";
import { JUDGE_SCHEMA } from "../schema";
import type { GateReport, Persona, RelationToTarget, ResolvedIdentity, SourceHit } from "../types";
import { isVoiceEligible } from "./util";

const DIMS: [string, string][] = [
  ["E", "I"],
  ["N", "S"],
  ["T", "F"],
  ["J", "P"],
];

// Stage 2: scoped sonnet judge on ambiguous (non-LinkedIn about/unknown) sources
// only. fail-open — on any error keep the existing relation (thin-target guard).
async function judgeRelations(id: ResolvedIdentity, candidates: SourceHit[]): Promise<Map<string, RelationToTarget>> {
  const out = new Map<string, RelationToTarget>();
  if (candidates.length === 0) return out;
  try {
    const res = await structured<{ verdicts: { id: string; relation_to_target: RelationToTarget }[] }>({
      model: MODEL_FAST,
      system: `You verify source ATTRIBUTION for a persona of ONE specific person. For each source decide its relation to the TARGET:
- by_target: authored BY the target themselves
- about_target: about the target (profiles, articles, interviews of them)
- third_party: a same-name DIFFERENT person, or someone else's content that merely mentions the target
- unrelated: not about the target at all
Be strict: a topically-similar post by a different author is third_party, NOT about_target.`,
      user: `TARGET: ${id.name}${id.company ? ` — ${id.company}` : ""}${id.title ? `, ${id.title}` : ""} (handle ${id.resolved_handle || "unknown"})\n\nSOURCES:\n${candidates
        .map((s) => `${s.id}: ${s.title} | ${s.url} | author:${s.author_handle || "?"} | ${s.snippet.slice(0, 160)}`)
        .join("\n")}`,
      schema: JUDGE_SCHEMA,
      effort: "low",
      maxTokens: 2000,
    });
    for (const v of res.verdicts || []) out.set(v.id, v.relation_to_target);
  } catch {
    // fail-open: keep existing relations
  }
  return out;
}

// Gate ④ ATTRIBUTION / AUTHORSHIP. voice/values/behavioral/MBTI/quotes may cite a
// source ONLY if by_target | about_target. third_party/unrelated support facts-only.
// Stage 1 handle-match already ran on `fetched` (in pipeline); here Stage 2 judges
// ambiguous cited sources, then enforces on the persona.
export async function gateAttribution(
  persona: Persona,
  fetched: SourceHit[],
  id: ResolvedIdentity,
  report: GateReport,
  emit: Emit,
): Promise<Persona> {
  const rel = new Map<string, RelationToTarget>(fetched.map((s) => [s.id, s.relation_to_target]));

  const cited = new Set<string>();
  persona.notable_quotes.forEach((q) => q.source_id && cited.add(q.source_id));
  persona.behavioral_read.big_five.forEach((t) => t.source_id && cited.add(t.source_id));
  persona.behavioral_read.predicted_mbti.basis_per_letter.forEach((b) => b.source_id && cited.add(b.source_id));
  persona.sales_playbook.what_they_care_about.forEach((w) => w.source_id && cited.add(w.source_id));

  const ambiguous = fetched.filter(
    (s) => cited.has(s.id) && !/linkedin\.com\/(posts|in)\//i.test(s.url) && rel.get(s.id) !== "by_target",
  );
  if (ambiguous.length) {
    const judged = await judgeRelations(id, ambiguous);
    for (const [sid, r] of judged) rel.set(sid, r);
  }

  const authorHandle = (sid: string) => fetched.find((s) => s.id === sid)?.author_handle || "";
  const eligible = (sid?: string) => !sid || isVoiceEligible(rel.get(sid) ?? "about_target");

  // notable_quotes: first-person voice — third_party/unrelated → CUT.
  const quotesKept = persona.notable_quotes.filter((q) => {
    if (eligible(q.source_id)) return true;
    report.sourcesDropped_misattributed.push(`quote via ${q.source_id} (@${authorHandle(q.source_id)})`);
    emit({ stage: "gate", status: "info", gate: 4, message: `dropped quote — source @${authorHandle(q.source_id)} is not the target` });
    return false;
  });

  // big_five: behavioral trait from third_party → CUT.
  const bigFiveKept = persona.behavioral_read.big_five.filter((t) => {
    if (eligible(t.source_id)) return true;
    emit({ stage: "gate", status: "info", gate: 4, message: `dropped Big Five "${t.trait}" — misattributed source` });
    return false;
  });

  // MBTI: drop letters from third_party sources; recompute type with ? for ungrounded.
  const lettersKept = persona.behavioral_read.predicted_mbti.basis_per_letter.filter((b) => eligible(b.source_id));
  const lettersDropped = persona.behavioral_read.predicted_mbti.basis_per_letter.length - lettersKept.length;
  let mbtiType = persona.behavioral_read.predicted_mbti.type;
  if (lettersDropped > 0) {
    const present = new Map(lettersKept.map((b) => [b.letter.toUpperCase(), true]));
    mbtiType = DIMS.map(([a, b]) => (present.has(a) ? a : present.has(b) ? b : "?")).join("");
    emit({ stage: "gate", status: "info", gate: 4, message: `MBTI demoted to ${mbtiType} — ${lettersDropped} letter(s) lost grounding` });
  }

  // what_they_care_about (values): third_party → DEMOTE "(reported by @handle)" + inferred.
  const careAbout = persona.sales_playbook.what_they_care_about.map((w) => {
    if (eligible(w.source_id)) return w;
    report.claimsDemoted_about.push(w.point.slice(0, 40));
    const h = authorHandle(w.source_id);
    return { ...w, basis: "inferred" as const, evidence: `(reported by ${h ? "@" + h : "third party"}) ${w.evidence}` };
  });

  // Propagate Stage-1/2 relations into rendered sources (badges reflect truth).
  const sources = persona.sources.map((s) => ({ ...s, relation_to_target: rel.get(s.id) ?? s.relation_to_target }));

  // Flag same-name different-author sources (demo trust line).
  for (const s of fetched) {
    if (
      rel.get(s.id) === "third_party" &&
      s.author_handle &&
      id.resolved_handle &&
      s.author_handle !== id.resolved_handle.toLowerCase() &&
      /linkedin\.com\/posts\//i.test(s.url)
    ) {
      emit({ stage: "gate", status: "info", gate: 4, message: `flagged source authored by @${s.author_handle} — not the target (${id.resolved_handle})` });
    }
  }

  return {
    ...persona,
    notable_quotes: quotesKept,
    sales_playbook: { ...persona.sales_playbook, what_they_care_about: careAbout },
    behavioral_read: {
      ...persona.behavioral_read,
      big_five: bigFiveKept,
      predicted_mbti: { ...persona.behavioral_read.predicted_mbti, type: mbtiType, basis_per_letter: lettersKept },
    },
    sources,
  };
}
