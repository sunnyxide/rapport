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
  return { ...persona, output_lang };
}
