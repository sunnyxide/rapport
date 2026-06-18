import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CachedReport, Chemistry, Persona } from "./types";

const CACHE_DIR = join(process.cwd(), "data", "cache");

export function slugify(name: string, company?: string): string {
  return [name, company]
    .filter(Boolean)
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Cache = encore/fallback + saved-reports list. Live cold-run is the main story.
export function readReport(slug: string): CachedReport | null {
  const f = join(CACHE_DIR, `${slug}.json`);
  if (!existsSync(f)) return null;
  try {
    const raw = JSON.parse(readFileSync(f, "utf8"));
    // Back-compat: a bare Persona file is wrapped into a CachedReport.
    if (raw && raw.persona) return raw as CachedReport;
    return { persona: raw as Persona, slug };
  } catch {
    return null;
  }
}

export function writeReport(slug: string, persona: Persona, chemistry?: Chemistry | null, meta?: { durationMs?: number; nSources?: number; created_at?: string }): void {
  try {
    const report: CachedReport = { persona, chemistry: chemistry ?? null, slug, ...meta };
    writeFileSync(join(CACHE_DIR, `${slug}.json`), JSON.stringify(report, null, 2), "utf8");
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
    return readdirSync(CACHE_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const slug = f.replace(/\.json$/, "");
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
