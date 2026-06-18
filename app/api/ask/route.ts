import { anthropic } from "@ai-sdk/anthropic";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { readReport } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

// "Ask {person}" — a GROUNDED chat. Answers ONLY from the collected sources/cache
// for this dossier, cites [n], and says "not in public data" otherwise. Free Claude
// chat is BANNED here (hallucination destroys the trust moat).
export async function POST(req: Request) {
  const { messages, slug }: { messages: UIMessage[]; slug: string } = await req.json();
  const report = readReport(slug);
  if (!report) return new Response(JSON.stringify({ error: "unknown dossier" }), { status: 404 });

  const p = report.persona;
  const refIndex = new Map(p.sources.map((s, i) => [s.id, i + 1]));
  const sourceLines = p.sources
    .map((s) => `[${refIndex.get(s.id)}] (${s.relation_to_target}) ${s.title} — ${s.url}\n    ${(s.used_for || "").slice(0, 120)}`)
    .join("\n");

  const grounding = JSON.stringify(
    {
      identity: p.identity,
      snapshot: p.snapshot,
      whats_new: p.whats_new,
      top_moves: p.top_moves,
      non_obvious: p.non_obvious,
      career_arc: p.career_arc,
      skills: p.skills_expertise,
      notable_quotes: p.notable_quotes,
      sales_playbook: p.sales_playbook,
      behavioral_read: p.behavioral_read,
      honest_gaps: p.honest_gaps,
    },
    null,
    1,
  );

  const system = `You are the grounded Q&A layer of Rapport, answering follow-up questions about ${p.identity.name} (${p.identity.title}${p.identity.company ? ` @ ${p.identity.company}` : ""}) for someone about to meet them.

ABSOLUTE RULES — this is a trust product, not a chatbot:
1. Answer ONLY from the DOSSIER + SOURCES below. NEVER use outside/world knowledge about this person.
2. Cite the reference number like [3] for every factual claim, matching the SOURCES list.
3. If the answer is not in the dossier/sources, say plainly: "That's not in the public data I gathered." Do NOT guess, infer beyond evidence, or fabricate.
4. Be concise and meeting-useful — 1-3 sentences unless asked for more.
5. Reply in the dossier's output language (${p.output_lang === "ko" ? "Korean" : "English"}).

SOURCES (cite by these numbers):
${sourceLines}

DOSSIER:
${grounding}`;

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system,
    messages: convertToModelMessages(messages),
    temperature: 0.2,
  });

  return result.toUIMessageStreamResponse();
}
