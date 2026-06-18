import { MODEL_SYNTH, type RunMode, synthEffort } from "./anthropic";
import { looseJson } from "./llm";
import { personaSystemPrompt } from "./persona_prompt";
import type { OutputLang, Persona, ResolvedIdentity, SourceHit } from "./types";

export interface SynthInput {
  identity: ResolvedIdentity;
  sources: SourceHit[];
  meeting_context?: string;
  me_profile?: string; // requester base for shared_hooks (NOT chemistry — separate call)
  output_lang: OutputLang;
  mode: RunMode;
}

// [c] SYNTHESIS — opus-4.8, NO web_search, effort=high(live)/xhigh(cache-bake),
// rich instructed-JSON. The runtime prompt (v6 winner) is the system prompt.
export async function synthesize(input: SynthInput): Promise<Persona> {
  const { identity, sources, meeting_context, me_profile, output_lang, mode } = input;

  const sourcesForModel = sources.map((s) => ({
    id: s.id,
    url: s.url,
    title: s.title,
    date: s.date,
    snippet: s.snippet,
    relation_to_target: s.relation_to_target,
    author_handle: s.author_handle,
    type: s.type,
  }));

  const langName = output_lang === "ko" ? "Korean (한국어)" : "English";
  const user = [
    `OUTPUT_LANGUAGE = ${output_lang} — write EVERY generated field (the_one_thing, snapshot, top_moves, playbook, behavioral_read, friendly_read, honest_gaps…) in ${langName}, uniformly. NEVER mix languages. Only notable_quotes stay verbatim in their source's original language (tag original_lang).`,
    ``,
    `RESOLVED IDENTITY (already disambiguated — do NOT re-resolve):`,
    JSON.stringify(identity, null, 2),
    ``,
    meeting_context ? `MEETING CONTEXT (condition the playbook on THIS meeting):\n${meeting_context}\n` : ``,
    me_profile ? `REQUESTER ("me") BASE for shared_hooks (set-intersection only, both-or-cut):\n${me_profile}\n` : ``,
    `SOURCES (cite only these source_id values; each carries relation_to_target + author_handle for the ATTRIBUTION gate):`,
    JSON.stringify(sourcesForModel, null, 2),
    ``,
    `Build the persona per your system prompt. Output a single strict JSON object matching the schema in your system prompt, PLUS a top-level "output_lang": "${output_lang}" field. If sources are thin, return fewer evidence-tied items + status "limited_data" — never role-template padding.`,
  ].join("\n");

  const persona = await looseJson<Persona>({
    model: MODEL_SYNTH,
    system: personaSystemPrompt(),
    user,
    effort: synthEffort(mode),
    maxTokens: 16000,
  });
  return normalizePersona(persona, identity, output_lang);
}

// Defensive normalize: the model may omit keys (esp. when told to return fewer
// items + limited_data). The downstream gates + UI dereference these without
// guards, so default EVERY collection to [] and every nested object to a fully
// shaped value here — immutably. One cheap pass kills the whole crash class.
function normalizePersona(p: Partial<Persona>, identity: ResolvedIdentity, output_lang: OutputLang): Persona {
  const br = p.behavioral_read || ({} as Persona["behavioral_read"]);
  const pb = p.sales_playbook || ({} as Persona["sales_playbook"]);
  const mbti = br.predicted_mbti || ({} as Persona["behavioral_read"]["predicted_mbti"]);
  return {
    status: p.status || "ok",
    output_lang,
    candidates: p.candidates || [],
    the_one_thing: p.the_one_thing || "",
    identity: {
      name: p.identity?.name || identity.name,
      title: p.identity?.title || identity.title || "",
      company: p.identity?.company || identity.company || "",
      location: p.identity?.location || identity.location || "",
      confidence: p.identity?.confidence ?? identity.confidence ?? 0,
      resolved_handle: p.identity?.resolved_handle || identity.resolved_handle || "",
      photo_url: p.identity?.photo_url || "",
      photo_source_url: p.identity?.photo_source_url || "",
      photo_provenance: p.identity?.photo_provenance || "none",
    },
    snapshot: p.snapshot || "",
    whats_new: p.whats_new || "",
    recent_activity: p.recent_activity || [],
    top_moves: p.top_moves || [],
    non_obvious: p.non_obvious || { insight: "", source_id: "" },
    career_arc: p.career_arc || [],
    skills_expertise: p.skills_expertise || [],
    notable_quotes: p.notable_quotes || [],
    sales_playbook: {
      best_hook: pb.best_hook || { point: "", evidence: "", source_id: "", basis: "inferred" },
      what_they_care_about: pb.what_they_care_about || [],
      likely_objections: pb.likely_objections || [],
      approach_do: pb.approach_do || [],
      approach_avoid: pb.approach_avoid || [],
      shared_hooks: pb.shared_hooks || [],
    },
    honest_gaps: p.honest_gaps || [],
    behavioral_read: {
      note: br.note || "",
      method_note: br.method_note || "",
      big_five: br.big_five || [],
      communication_adaptation: br.communication_adaptation || "",
      predicted_mbti: { type: mbti.type || "", label: mbti.label || "", basis_per_letter: mbti.basis_per_letter || [] },
      likely_likes: br.likely_likes || [],
      likely_dislikes: br.likely_dislikes || [],
    },
    sources: p.sources || [],
    coverage_confidence: p.coverage_confidence ?? 0,
  };
}
