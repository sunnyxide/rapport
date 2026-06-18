import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { slugify } from "./slug";
import type { CachedReport, Chemistry, Persona } from "./types";

export { slugify };

// SEED_DIR = the committed/bundled demo caches (read-only on Vercel).
// WRITE_DIR = runtime writes. On Vercel the FS is read-only except /tmp, so live
// runs + feedback go to /tmp; locally both point at data/cache. Reads check the
// writable dir first, then fall back to the bundled seed.
const SEED_DIR = join(process.cwd(), "data", "cache");
const WRITE_DIR = process.env.VERCEL ? "/tmp/rapport-cache" : SEED_DIR;

function readDir(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}

// Cache = encore/fallback + saved-reports list. Live cold-run is the main story.
export function readReport(slug: string): CachedReport | null {
  for (const dir of [WRITE_DIR, SEED_DIR]) {
    const f = join(dir, `${slug}.json`);
    if (!existsSync(f)) continue;
    try {
      const raw = JSON.parse(readFileSync(f, "utf8"));
      // Back-compat: a bare Persona file is wrapped into a CachedReport.
      if (raw && raw.persona) return raw as CachedReport;
      return { persona: raw as Persona, slug };
    } catch {
      // try the next dir
    }
  }
  return null;
}

export function writeReport(slug: string, persona: Persona, chemistry?: Chemistry | null, meta?: { durationMs?: number; nSources?: number; created_at?: string }): void {
  try {
    if (!existsSync(WRITE_DIR)) mkdirSync(WRITE_DIR, { recursive: true });
    const report: CachedReport = { persona, chemistry: chemistry ?? null, slug, ...meta };
    writeFileSync(join(WRITE_DIR, `${slug}.json`), JSON.stringify(report, null, 2), "utf8");
  } catch {
    // cache write failure never crashes a run
  }
}

export interface ReportSummary {
  slug: string;
  name: string;
  title: string;
  company: string;
  photo_url: string;
  the_one_thing: string;
  has_chemistry: boolean;
}

export function listReports(): ReportSummary[] {
  try {
    const slugs = Array.from(new Set([...readDir(WRITE_DIR), ...readDir(SEED_DIR)].map((f) => f.replace(/\.json$/, ""))));
    return slugs
      .map((slug) => {
        const r = readReport(slug);
        if (!r) return null;
        const p = r.persona;
        return {
          slug,
          name: p.identity?.name || slug,
          title: p.identity?.title || "",
          company: p.identity?.company || "",
          photo_url: p.identity?.photo_url || "",
          the_one_thing: p.the_one_thing || "",
          has_chemistry: !!r.chemistry,
        } as ReportSummary;
      })
      .filter((x): x is ReportSummary => x !== null);
  } catch {
    return [];
  }
}
