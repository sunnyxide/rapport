import { writeReport } from "@/lib/cache";
import { synthesize } from "@/lib/synthesize";
import { slugify } from "@/lib/slug";
import type { OutputLang, ResolvedIdentity, SourceHit } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

// Build the requester's OWN "me" profile from a self-description (self-Q&A path for
// thin-web founders). NO web search — the self-text IS the by_target source. Same
// synthesis engine → Gate#4-clean → cached under a me-<slug> for chemistry pairing.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const about = typeof body.about === "string" ? body.about.trim() : "";
  if (!name || !about) return new Response(JSON.stringify({ error: "name and about are required" }), { status: 400 });

  const company = typeof body.company === "string" ? body.company.trim() : "";
  const lang: OutputLang = body.output_lang === "ko" ? "ko" : "en";

  const identity: ResolvedIdentity = {
    name,
    title: typeof body.title === "string" ? body.title : "",
    company,
    location: "",
    resolved_handle: "",
    linkedin_url: "",
    confidence: 1,
    distinguishing_signal: "self-reported profile",
  };

  // The self-description becomes a single by_target source the synth grounds on.
  const selfSource: SourceHit = {
    id: "s1",
    url: "self://profile",
    title: `${name} — self-reported profile`,
    date: new Date().toISOString().slice(0, 10),
    snippet: about.slice(0, 8000),
    host: "self",
    type: "self",
    relation_to_target: "by_target",
    author_handle: "",
  };

  const persona = await synthesize({ identity, sources: [selfSource], output_lang: lang, mode: "live" });
  const slug = `me-${slugify(name, company)}`;
  writeReport(slug, { ...persona, identity: { ...persona.identity, ...identity, photo_url: "", photo_source_url: "", photo_provenance: "none" } }, null, {
    created_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify({ slug }), { headers: { "Content-Type": "application/json" } });
}
