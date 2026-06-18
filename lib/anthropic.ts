import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "./env";

// One client per process; key read at call time via requireEnv.
let client: Anthropic | null = null;
export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  return client;
}

// Locked model IDs (CLAUDE.md / claude-api verified).
export const MODEL_SYNTH = "claude-opus-4-8"; // synthesis + chemistry — depth
export const MODEL_FAST = "claude-sonnet-4-6"; // identity / fan-out / judge — cheap, many calls

// web_search tool version is LOCKED. 20250305, NOT 20260209 (the latter runs a
// dynamic-filtering code-exec path that is slow + high-variance — EVENT_GO).
export const WEB_SEARCH_TOOL_VERSION = "web_search_20250305";

// Effort is a live(high) vs cache-bake(xhigh) param — NEVER hardcode xhigh for
// live. sim A/B measured: live xhigh adds 100-300s latency, zero demo-visible
// quality gain. Depth comes from prompt structure, not effort.
export type RunMode = "live" | "cache-bake";
export function synthEffort(mode: RunMode): "high" | "xhigh" {
  return mode === "cache-bake" ? "xhigh" : "high";
}
