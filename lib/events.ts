// Progress/thinking-stream event contract (NDJSON over ReadableStream).
// One event per source found + per gate action — turns the ~100s wait into
// "watch the agent work" (a demo asset, EVENT_GO §6).
import type { Chemistry, IdentityCandidate, Persona } from "./types";

export type StageEvent =
  | { stage: "identity"; status: "start" | "resolving" | "resolved" | "ambiguous"; candidateName?: string; handle?: string; confidence?: number }
  | { stage: "fanout"; status: "start" | "track" | "hit" | "done"; track?: string; host?: string; title?: string; url?: string; type?: string; relation?: string; count?: number }
  | { stage: "transcript"; status: "start" | "hit" | "done"; host?: string; title?: string; quotes?: number }
  | { stage: "synth"; status: "start" | "thinking" | "done"; note?: string }
  | { stage: "gate"; status: "info"; gate: number; message: string }
  | { stage: "chemistry"; status: "start" | "done"; score?: number }
  | { stage: "done"; persona: Persona; chemistry?: Chemistry | null; slug: string; durationMs: number; nSources: number; cached?: boolean }
  | { stage: "needs_disambiguation"; candidates: IdentityCandidate[] }
  | { stage: "error"; message: string };

export type Emit = (e: StageEvent) => void;

// Encode one event as an NDJSON line.
export function ndjson(e: StageEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(e) + "\n");
}
