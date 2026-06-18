"use client";

import { useRouter } from "next/navigation";
import demo from "@/data/demo_targets.json";
import { slugify } from "@/lib/slug";
import type { Seed } from "./useStream";

interface Target {
  name: string;
  org: string;
  role: string;
  linkedin: string;
  demo_role?: string;
  footprint?: string;
}

// Curated demo targets. Cached → click navigates to the instant dossier. Not
// cached → click runs a live cold-run with the seed.
export function ExampleGallery({ cachedSlugs, busy, onRun }: { cachedSlugs: Set<string>; busy: boolean; onRun: (seed: Seed) => void }) {
  const router = useRouter();
  const targets = (demo as { targets: Target[] }).targets
    .filter((t) => t.linkedin && t.linkedin.startsWith("http") && t.demo_role !== "—")
    .slice(0, 8);

  function pick(t: Target) {
    const slug = slugify(t.name, t.org);
    if (cachedSlugs.has(slug)) {
      router.push(`/r/${slug}`);
      return;
    }
    onRun({ name: t.name, company: t.org, linkedin_url: t.linkedin });
  }

  return (
    <section>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Try a demo target</h2>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {targets.map((t) => {
          const cached = cachedSlugs.has(slugify(t.name, t.org));
          return (
            <button
              key={t.name}
              onClick={() => pick(t)}
              disabled={busy}
              className="group flex items-center justify-between gap-3 rounded border border-hair bg-white px-3.5 py-2.5 text-left transition hover:border-accent disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-serif text-[15px] text-ink">{t.name}</span>
                <span className="block truncate text-[11px] text-muted">
                  {t.role} · {t.org}
                </span>
              </span>
              <span className={`shrink-0 font-mono text-[9px] ${cached ? "text-accent" : "text-muted"}`}>{cached ? "instant ↗" : "live"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
