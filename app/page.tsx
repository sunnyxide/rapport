"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChemistryBlock } from "@/components/Chemistry";
import { ExampleGallery } from "@/components/ExampleGallery";
import { Header, Wordmark } from "@/components/Header";
import { PersonaDossier } from "@/components/persona/PersonaDossier";
import { RecentReports } from "@/components/RecentReports";
import { ResearchLog } from "@/components/ResearchLog";
import { SearchForm } from "@/components/SearchForm";
import { useStream } from "@/components/useStream";
import type { ReportSummary } from "@/lib/cache";

export default function Home() {
  const { state, run, reset } = useStream();
  const [reports, setReports] = useState<ReportSummary[]>([]);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports || []))
      .catch(() => {});
  }, []);

  // Inject the active "me" profile (set on /me) so chemistry runs against you.
  const runWithMe: typeof run = (seed) => {
    const me = typeof window !== "undefined" ? localStorage.getItem("rapport_me") : null;
    return run(me ? { ...seed, me_slug: me } : seed);
  };

  const cachedSlugs = new Set(reports.map((r) => r.slug));
  const started = state.macro !== "idle";

  return (
    <>
      <Header
        right={
          started ? (
            <button onClick={reset} className="hover:text-ink">
              Search another
            </button>
          ) : null
        }
      />

      <main className="mx-auto max-w-reading px-6 pb-24">
        {/* HERO */}
        {!started && (
          <section className="pt-14 pb-8">
            <Wordmark size="lg" />
            <p className="mt-4 max-w-xl font-serif text-2xl leading-snug text-ink">
              Know anyone before you meet them — and how you&apos;ll click.
            </p>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
              Paste a name or LinkedIn URL. Rapport fans out across public data and returns a sourced, meeting-ready
              briefing — every claim clickable to its source, quotes verified, attribution checked.
            </p>
          </section>
        )}

        {/* SEARCH */}
        <section className={started ? "pt-8" : ""}>
          <SearchForm busy={state.busy} onRun={runWithMe} />
        </section>

        {/* STREAM */}
        {state.log.length > 0 && (
          <div className="mt-8">
            <ResearchLog log={state.log} macro={state.macro} nSources={state.nSources} nSites={state.nSites} elapsed={state.elapsed} busy={state.busy} />
          </div>
        )}

        {/* DISAMBIGUATION */}
        {state.candidates && (
          <div className="mt-8 rounded border border-hair bg-white p-5">
            <div className="font-serif text-xl">Which one?</div>
            <p className="mb-3 mt-1 text-xs text-muted">Same-name collision — confirm before synthesis (anti-collision gate). Re-run with the company or LinkedIn URL that pins the right person.</p>
            <ul className="space-y-2 text-sm">
              {state.candidates.map((c, i) => (
                <li key={i} className="border-b border-hair pb-2 last:border-0">
                  <b>{c.name}</b> — {c.title} @ {c.company} · <span className="text-muted">{c.distinguishing_detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* INLINE DOSSIER */}
        {state.persona && (
          <div className="mt-10 rise-in">
            <div className="no-print mb-4 flex items-center justify-end gap-3">
              {state.slug && (
                <Link href={`/r/${state.slug}`} className="font-mono text-[11px] text-accent hover:underline">
                  open permalink ↗
                </Link>
              )}
              <button onClick={() => window.print()} className="rounded border border-hair px-3 py-1 font-mono text-[11px] text-muted hover:text-ink">
                Save one-pager (PDF)
              </button>
            </div>
            <PersonaDossier persona={state.persona} />
            {state.chemistry && (
              <div className="mt-8">
                <ChemistryBlock chem={state.chemistry} />
              </div>
            )}
          </div>
        )}

        {/* GALLERY + RECENT (landing only) */}
        {!started && (
          <div className="mt-12 grid grid-cols-1 gap-10 border-t border-hair pt-10 md:grid-cols-2">
            <ExampleGallery cachedSlugs={cachedSlugs} busy={state.busy} onRun={runWithMe} />
            <RecentReports reports={reports} />
          </div>
        )}
      </main>
    </>
  );
}
