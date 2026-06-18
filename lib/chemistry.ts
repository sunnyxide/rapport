import { MODEL_SYNTH, type RunMode, synthEffort } from "./anthropic";
import { looseJson } from "./llm";
import type { Chemistry, OutputLang, Persona } from "./types";

// Chemistry = SEPARATE no-search opus call over [me, target]. Cache-pair coda only
// (live-chemistry BANNED — never inline in the main pipeline). Both personas must
// already be Gate#4-clean. Every shared point cites BOTH sides or is CUT. SWAP TEST.

const CHEMISTRY_SYSTEM = `You compute interpersonal CHEMISTRY between two real people — "me" (the requester) and "them" (the target) — for someone about to meet them. You have NO web access; reason ONLY over the two sourced personas provided.

HARD RULES:
- QUALITATIVE first; the numeric score is a memorable garnish, not the signal.
- Every shared_interest cites a concrete datum from BOTH sides (me_evidence + me_source_id AND them_evidence + them_source_id) or is CUT. One side only = NOT shared.
- SWAP TEST: if a point stays true after swapping in any two founders/people, it's a role-prior → CUT ("two technical founders click", "both care about users" all fail).
- Big Five / communication-accommodation framing only. No clinical claims.
- If either party is limited_data / low coverage → section OFF: overall_read = "insufficient public data on one party", empty arrays, chemistry_score 0.
- The whole block is "directional, public-signal-based, NOT a relationship prediction." Be honest, not flattering.

TOGGLES (DEFAULT ON): (a) chemistry_score = 10-point, 1 decimal (e.g. 8.3), labeled heuristic/directional; (b) mbti_compat aside, labeled illustrative.

Output a SINGLE strict JSON object only:
{
  "overall_read": "1-2 sentences: how this pairing goes + confidence; honest if thin",
  "chemistry_confidence": 0.0,
  "chemistry_score": 0.0,
  "mbti_compat": {"me_type","them_type","read":"illustrative · not clinical","label":"directional"},
  "shared_interests": [{"point","me_evidence","me_source_id","them_evidence","them_source_id"}],
  "similar_traits": [{"trait","me_signal","them_signal","framework":"Big Five|comms-accommodation","basis":"inferred"}],
  "complementary_traits": [{"trait","me_signal","them_signal","why_it_helps"}],
  "potential_friction": [{"point","me_signal","them_signal","how_to_navigate"}],
  "interaction_simulation": {"opening_30s","likely_arc","where_it_could_stall","how_to_adapt"},
  "honest_gaps": ["chemistry is a low-confidence inference from public text, not a relationship prediction"]
}`;

function condense(p: Persona) {
  return {
    name: p.identity.name,
    title: p.identity.title,
    company: p.identity.company,
    snapshot: p.snapshot,
    whats_new: p.whats_new,
    skills: p.skills_expertise?.slice(0, 8),
    cares_about: p.sales_playbook?.what_they_care_about,
    big_five: p.behavioral_read?.big_five,
    mbti: p.behavioral_read?.predicted_mbti?.type,
    quotes: p.notable_quotes?.slice(0, 4),
    coverage: p.coverage_confidence,
    status: p.status,
  };
}

export async function compareChemistry(me: Persona, them: Persona, output_lang: OutputLang, mode: RunMode = "cache-bake"): Promise<Chemistry> {
  const langName = output_lang === "ko" ? "Korean (한국어)" : "English";
  const user = [
    `OUTPUT_LANGUAGE = ${output_lang}: write every prose field in ${langName}, uniformly.`,
    ``,
    `ME (the requester):`,
    JSON.stringify(condense(me), null, 2),
    ``,
    `THEM (the target):`,
    JSON.stringify(condense(them), null, 2),
    ``,
    `Compute the chemistry per your system rules. Both-or-cut on shared_interests. Output the single JSON object only.`,
  ].join("\n");

  const chem = await looseJson<Chemistry>({
    model: MODEL_SYNTH,
    system: CHEMISTRY_SYSTEM,
    user,
    effort: synthEffort(mode),
    maxTokens: 8000,
  });
  return { ...chem, me_name: me.identity.name };
}
