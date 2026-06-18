import type { RunMode } from "./anthropic";
import { readReport, slugify, writeReport } from "./cache";
import { compareChemistry } from "./chemistry";
import type { Emit } from "./events";
import { applyGates } from "./gates";
import { resolveIdentity, type Seed } from "./identity";
import { resolvePhoto } from "./photo";
import { fanOut } from "./sources";
import { resetSourceIds } from "./sources/util";
import { synthesize } from "./synthesize";
import type { Chemistry, OutputLang, Persona } from "./types";

export interface RunOptions {
  mode?: RunMode;
  me_slug?: string; // when set + cached, compute chemistry (me × target) as a coda
}

// Build a compact "me" profile string from a cached persona, for shared_hooks.
function meProfileText(me: Persona): string {
  return JSON.stringify(
    {
      name: me.identity.name,
      title: me.identity.title,
      company: me.identity.company,
      snapshot: me.snapshot,
      cares_about: me.sales_playbook?.what_they_care_about?.map((w) => w.point),
      skills: me.skills_expertise?.map((s) => s.point),
    },
    null,
    2,
  );
}

// Full pipeline: input → [a] identity → [b] fan-out → [c] synthesis → gates →
// photo → [optional] chemistry → cache → done. Emits stage events throughout.
export async function runPipeline(seed: Seed, emit: Emit, opts: RunOptions = {}): Promise<void> {
  const t0 = Date.now();
  const mode: RunMode = opts.mode ?? "live";
  const output_lang: OutputLang = seed.output_lang ?? "en";
  resetSourceIds();

  // [a] Identity resolution — Gate ① (disambiguation, pre-synth).
  emit({ stage: "identity", status: "start", candidateName: seed.name });
  const idr = await resolveIdentity(seed);
  if (idr.status === "needs_disambiguation" || !idr.resolved) {
    emit({ stage: "identity", status: "ambiguous" });
    emit({ stage: "needs_disambiguation", candidates: idr.candidates || [] });
    return;
  }
  const identity = idr.resolved;
  emit({ stage: "identity", status: "resolved", candidateName: identity.name, handle: identity.resolved_handle, confidence: identity.confidence });

  // Optional "me" base (for shared_hooks + chemistry).
  const meReport = opts.me_slug ? readReport(opts.me_slug) : null;
  const me_profile = meReport ? meProfileText(meReport.persona) : undefined;

  // [b] Fan-out (parallel tracks).
  const sources = await fanOut(identity, emit);
  if (sources.length === 0) {
    emit({ stage: "gate", status: "info", gate: 0, message: "no public sources found — limited_data" });
  }

  // [c] Synthesis (no search, high effort, instructed JSON).
  emit({ stage: "synth", status: "start" });
  let persona = await synthesize({ identity, sources, meeting_context: seed.meeting_context, me_profile, output_lang, mode });
  emit({ stage: "synth", status: "done" });

  // Safety net: the synth's own identity gate can still detect a collision the fast
  // step missed (cross-domain same-name). Surface chips, don't render a broken card.
  if (persona.status === "needs_disambiguation") {
    emit({ stage: "gate", status: "info", gate: 1, message: "synthesis detected same-name collision — disambiguation required" });
    emit({ stage: "needs_disambiguation", candidates: persona.candidates || [] });
    return;
  }

  // Gates ②③④ + confidence.
  persona = await applyGates(persona, identity, sources, emit);

  // Photo (deterministic, image-shape-guarded) — overrides any model guess.
  const photo = resolvePhoto(identity, sources);
  persona = { ...persona, identity: { ...persona.identity, ...photo } };

  // [optional] Chemistry coda — only when a cached "me" persona is available.
  let chemistry: Chemistry | null = null;
  if (meReport && persona.status !== "needs_disambiguation") {
    try {
      emit({ stage: "chemistry", status: "start" });
      chemistry = await compareChemistry(meReport.persona, persona, output_lang, mode);
      emit({ stage: "chemistry", status: "done", score: chemistry.chemistry_score });
    } catch (err) {
      emit({ stage: "gate", status: "info", gate: 6, message: `chemistry skipped: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  const slug = slugify(identity.name, identity.company);
  if (mode === "live" || mode === "cache-bake") {
    writeReport(slug, persona, chemistry, { durationMs: Date.now() - t0, nSources: sources.length, created_at: new Date().toISOString() });
  }

  emit({ stage: "done", persona, chemistry, slug, durationMs: Date.now() - t0, nSources: sources.length });
}
