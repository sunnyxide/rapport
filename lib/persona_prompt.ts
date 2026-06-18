import { readFileSync } from "node:fs";
import { join } from "node:path";

// Load the LOCKED v6-winner runtime prompt from disk (source of truth = the .md).
let cached: string | null = null;
export function personaSystemPrompt(): string {
  if (cached) return cached;
  cached = readFileSync(join(process.cwd(), "prompts", "persona_agent_prompt.md"), "utf8");
  return cached;
}
