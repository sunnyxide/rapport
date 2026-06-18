import { anthropic, MODEL_FAST, WEB_SEARCH_TOOL_VERSION } from "../anthropic";
import type { Emit } from "../events";
import { buildQueries } from "../queries";
import type { ResolvedIdentity, SourceHit } from "../types";
import { toSourceHit } from "./util";

// record_sources: forced client tool (strict) — the model searches via native
// web_search, then hands back every source it read with a verbatim snippet we can
// substring-verify quotes against. A web_search call CANNOT use output_format
// (400 — EVENT_GO), so we structure via a client tool instead.
const RECORD_TOOL = {
  name: "record_sources",
  description:
    "Record every public source you found about the target. Call this ONCE after searching, with one entry per distinct source. The snippet MUST be 1-3 sentences copied VERBATIM from the page (used to verify quotes downstream).",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      sources: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            url: { type: "string" },
            title: { type: "string" },
            date: { type: "string", description: "publication date if visible, else ''" },
            snippet: { type: "string", description: "1-3 sentences copied verbatim from the page" },
            type: { type: "string", description: "web|linkedin|youtube|podcast|x|github|news" },
            relation_to_target: { type: "string", enum: ["by_target", "about_target", "third_party", "unrelated"] },
            author_handle: { type: "string", description: "byline / LinkedIn handle if visible, else ''" },
          },
          required: ["url", "title", "date", "snippet", "type", "relation_to_target", "author_handle"],
        },
      },
    },
    required: ["sources"],
  },
  strict: true,
};

export async function webTrack(id: ResolvedIdentity, emit: Emit): Promise<SourceHit[]> {
  emit({ stage: "fanout", status: "track", track: "web_search" });
  const queries = buildQueries(id);

  const system = `You are the research fan-out for Rapport, a sales/meeting persona builder. Use the web_search tool to run the queries below and gather public sources about the SPECIFIC target person (not same-name others). Prefer the target's OWN authored posts for voice, and recent (last ~12 months) material. After searching, call record_sources exactly once with every distinct source you actually read.

Target: ${id.name}${id.company ? ` — ${id.company}` : ""}${id.title ? `, ${id.title}` : ""}
${id.resolved_handle ? `Canonical LinkedIn handle: ${id.resolved_handle} (their OWN /posts/${id.resolved_handle} = by_target; a same-name post by a DIFFERENT handle is third_party, not the target).` : "No confirmed handle — tag LinkedIn/posts as about_target/third_party, NEVER by_target."}

Queries to run:
${queries.map((q, i) => `${i + 1}. ${q.q}`).join("\n")}`;

  const tools = [
    { type: WEB_SEARCH_TOOL_VERSION, name: "web_search", max_uses: 6 },
    RECORD_TOOL,
  ];

  const hits: SourceHit[] = [];
  let messages: Array<{ role: "user" | "assistant"; content: unknown }> = [
    { role: "user", content: "Search the queries and record every source you read." },
  ];

  // Server runs web_search internally; control returns on the client tool_use
  // (record_sources) or pause_turn. Bound the loop.
  for (let round = 0; round < 4; round++) {
    let res: {
      content: Array<{ type: string; name?: string; input?: unknown }>;
      stop_reason: string;
    };
    try {
      res = (await anthropic().beta.messages.create({
        model: MODEL_FAST,
        max_tokens: 8000,
        system,
        tools,
        output_config: { effort: "low" },
        messages,
      } as never)) as typeof res;
    } catch (err) {
      // web_search 200-error trap: surface, return whatever floor we have.
      emit({ stage: "gate", status: "info", gate: 0, message: `web_search error: ${err instanceof Error ? err.message : String(err)}` });
      break;
    }

    // Harvest native web_search result blocks (url/title/date) as a floor.
    for (const b of res.content) {
      if (b.type === "web_search_tool_result") {
        const inner = (b as unknown as { content?: Array<{ type: string; url: string; title: string; page_age?: string | null }> }).content || [];
        for (const r of inner) {
          if (r.type === "web_search_result") {
            const h = toSourceHit({ url: r.url, title: r.title, date: r.page_age || "" });
            hits.push(h);
            emit({ stage: "fanout", status: "hit", track: "web_search", host: h.host, title: h.title, url: h.url, type: h.type });
          }
        }
      }
    }

    const rec = res.content.find((b) => b.type === "tool_use" && b.name === "record_sources");
    if (rec) {
      const input = (rec.input as { sources?: Array<Record<string, string>> })?.sources || [];
      for (const r of input) {
        const h = toSourceHit({
          url: r.url,
          title: r.title,
          date: r.date,
          snippet: r.snippet,
          type: r.type,
          relation_to_target: r.relation_to_target as SourceHit["relation_to_target"],
          author_handle: r.author_handle,
        });
        hits.push(h);
        emit({ stage: "fanout", status: "hit", track: "web_search", host: h.host, title: h.title, url: h.url, type: h.type, relation: h.relation_to_target });
      }
      break; // got structured sources — done
    }

    if (res.stop_reason === "pause_turn") {
      messages = [...messages, { role: "assistant", content: res.content }];
      continue; // resume server-side tool loop
    }
    break; // end_turn with no record_sources — rely on harvested result blocks
  }

  return hits;
}
