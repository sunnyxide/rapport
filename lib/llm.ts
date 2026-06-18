import { anthropic } from "./anthropic";

const STRUCTURED_BETA = "structured-outputs-2025-11-13";

type Effort = "low" | "medium" | "high" | "xhigh";

function firstText(content: Array<{ type: string }>): string {
  const b = content.find((x) => x.type === "text") as { text: string } | undefined;
  return b?.text ?? "";
}

export interface StructuredArgs {
  model: string;
  system: string;
  user: string;
  schema: Record<string, unknown>;
  effort?: Effort;
  maxTokens?: number;
}

// No-search STRICT structured call (identity + attribution judge). Uses beta
// output_format JSON schema. Only for SMALL schemas — the strict grammar compiler
// rejects the full persona shape. NEVER on a web_search call (400).
export async function structured<T>(a: StructuredArgs): Promise<T> {
  const body = {
    model: a.model,
    max_tokens: a.maxTokens ?? 4000,
    system: a.system,
    thinking: { type: "adaptive" as const },
    output_config: { effort: a.effort ?? "high" },
    output_format: { type: "json_schema" as const, schema: a.schema },
    betas: [STRUCTURED_BETA],
    messages: [{ role: "user" as const, content: a.user }],
  };
  // Cast: effort "xhigh" is valid at the API but not yet in the SDK union.
  const res = await anthropic().beta.messages.create(body as never);
  const text = firstText((res as { content: Array<{ type: string }> }).content);
  return JSON.parse(text || "{}") as T;
}

// Extract the outermost balanced JSON object from a fenced/prose-wrapped response.
export function extractJson(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json|jsonc)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return s;
}

export interface LooseArgs {
  model: string;
  system: string;
  user: string;
  effort?: Effort;
  maxTokens?: number;
}

// Prompt-specified JSON (no output_format) — for the rich persona/chemistry schemas
// that exceed the strict-grammar size limit. Tolerant parse + one repair retry.
export async function looseJson<T>(a: LooseArgs): Promise<T> {
  const directive =
    "\n\nReturn ONLY the JSON object conforming to the schema in your system prompt. No markdown, no code fences, no prose before or after — the very first character must be { and the last must be }.";
  const call = async (user: string): Promise<string> => {
    const body = {
      model: a.model,
      max_tokens: a.maxTokens ?? 16000,
      system: a.system,
      thinking: { type: "adaptive" as const },
      output_config: { effort: a.effort ?? "high" },
      messages: [{ role: "user" as const, content: user }],
    };
    const res = await anthropic().beta.messages.create(body as never);
    return firstText((res as { content: Array<{ type: string }> }).content);
  };

  const raw = await call(a.user + directive);
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch {
    const repaired = await call(
      `Your previous output was not valid JSON. Re-emit the SAME content as a single valid JSON object only.\n\n${raw.slice(0, 12000)}${directive}`,
    );
    return JSON.parse(extractJson(repaired)) as T;
  }
}
