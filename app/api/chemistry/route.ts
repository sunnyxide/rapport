import { readReport, writeReport } from "@/lib/cache";
import { compareChemistry } from "@/lib/chemistry";
import type { OutputLang } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

// Recompute chemistry for a cached PAIR (no re-fanout) and write it back into the
// target report. Cache-pair coda — fast (one opus call) and idempotent.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }
  const target_slug = typeof body.target_slug === "string" ? body.target_slug : "";
  const me_slug = typeof body.me_slug === "string" ? body.me_slug : "";
  const target = readReport(target_slug);
  const me = readReport(me_slug);
  if (!target || !me) return new Response(JSON.stringify({ error: "target or me not cached" }), { status: 404 });

  const lang: OutputLang = target.persona.output_lang || "en";
  const chemistry = await compareChemistry(me.persona, target.persona, lang, "cache-bake");
  writeReport(target_slug, target.persona, chemistry, {
    durationMs: target.durationMs,
    nSources: target.nSources,
    created_at: target.created_at,
  });
  return new Response(JSON.stringify({ ok: true, score: chemistry.chemistry_score }), { headers: { "Content-Type": "application/json" } });
}
