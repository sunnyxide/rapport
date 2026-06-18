import { readReport } from "@/lib/cache";
import { ndjson, type StageEvent } from "@/lib/events";
import type { Seed } from "@/lib/identity";
import { runPipeline } from "@/lib/pipeline";
import type { OutputLang } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// GET ?slug= → instant cached report (encore / network-incident fallback, ~ms).
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("slug") || "";
  const report = readReport(slug);
  if (!report) return new Response(JSON.stringify({ error: "not cached" }), { status: 404 });
  return new Response(JSON.stringify({ ...report, cached: true, durationMs: 0 }), {
    headers: { "Content-Type": "application/json" },
  });
}

// POST { name, company?, title?, linkedin_url?, meeting_context?, output_lang?, me_slug? }
// → NDJSON stream of stage events (identity → fanout → synth → gates → [chemistry] → done).
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return new Response(JSON.stringify({ error: "name is required" }), { status: 400 });

  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : undefined);
  const lang: OutputLang = body.output_lang === "ko" ? "ko" : "en";
  const seed: Seed = {
    name,
    company: str("company"),
    title: str("title"),
    linkedin_url: str("linkedin_url"),
    meeting_context: str("meeting_context"),
    output_lang: lang,
  };
  const me_slug = str("me_slug");

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const emit = (e: StageEvent) => {
        if (!closed) controller.enqueue(ndjson(e));
      };
      try {
        await runPipeline(seed, emit, { mode: "live", me_slug });
      } catch (err) {
        emit({ stage: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
