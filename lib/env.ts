// Read env at call time — never cache secrets at module load (security rule).
export function env(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

export function requireEnv(key: string): string {
  const v = env(key);
  if (!v) throw new Error(`Missing required env: ${key}`);
  return v;
}

// DATA_LAYER selects the fan-out composition. `cse` is the richest (CSE + Apify
// deepen) and the default day-of layer; `web` is the always-on web_search floor;
// `mock` is offline demo determinism.
export type DataLayer = "web" | "cse" | "mock";
export function dataLayer(): DataLayer {
  const v = (env("DATA_LAYER") || "cse").toLowerCase();
  return v === "web" || v === "mock" ? v : "cse";
}

// Capability detection — what tracks can actually run with the keys present.
export function capabilities() {
  return {
    anthropic: !!env("ANTHROPIC_API_KEY"),
    cse: !!env("GOOGLE_SEARCH_API_KEY") && (!!env("GOOGLE_SEARCH_ENGINE_ID_FULL_WEB") || !!env("GOOGLE_SEARCH_ENGINE_ID_TRUSTED")),
    apify: !!env("APIFY_API_TOKEN"),
  };
}
