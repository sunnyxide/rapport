import { appendFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";

// POST { slug, verdict: "correct"|"partial"|"wrong", section?, vote?, note? }
// → append to data/feedback.jsonl. The stage killer: a judge clicks "correct" on
// their own dossier = live self-verification. "We learn from feedback" story.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const verdict = typeof body.verdict === "string" ? body.verdict : "";
  if (!slug && !verdict && !body.section) return new Response(JSON.stringify({ error: "empty feedback" }), { status: 400 });

  const entry = {
    slug,
    verdict,
    section: typeof body.section === "string" ? body.section : undefined,
    vote: typeof body.vote === "string" ? body.vote : undefined,
    note: typeof body.note === "string" ? body.note.slice(0, 2000) : undefined,
    at: new Date().toISOString(),
  };

  try {
    appendFileSync(join(process.cwd(), "data", "feedback.jsonl"), JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // demo: never fail the UI on a write error
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}
