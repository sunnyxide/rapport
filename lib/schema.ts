// JSON Schemas for Anthropic strict structured output (output_format).
// Rules: additionalProperties:false everywhere, every key in `required`, no
// min/max/length constraints, no recursion. STRICT schemas only on NO-web_search
// calls. The rich persona/chemistry shapes use instructed-JSON instead (looseJson).

type JSON = Record<string, unknown>;

const str = { type: "string" } as const;

function obj(props: Record<string, JSON>): JSON {
  return { type: "object", properties: props, required: Object.keys(props), additionalProperties: false };
}
function arr(items: JSON): JSON {
  return { type: "array", items };
}

const candidate = obj({
  name: str,
  title: str,
  company: str,
  distinguishing_detail: str,
});

// ---- Identity resolution schema (sonnet, no search) ----
export const IDENTITY_SCHEMA: JSON = obj({
  status: { type: "string", enum: ["ok", "needs_disambiguation"] },
  resolved: obj({
    name: str,
    title: str,
    company: str,
    location: str,
    resolved_handle: str,
    linkedin_url: str,
    confidence: { type: "number" },
    distinguishing_signal: str,
  }),
  candidates: arr(candidate),
});

// ---- Attribution judge schema (Gate #4 Stage 2, sonnet, no search) ----
export const JUDGE_SCHEMA: JSON = obj({
  verdicts: arr(
    obj({
      id: str,
      relation_to_target: { type: "string", enum: ["by_target", "about_target", "third_party", "unrelated"] },
    }),
  ),
});
