"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AskPanel } from "@/components/AskPanel";
import { CalendarStrip } from "@/components/CalendarStrip";
import { ChemistryBlock } from "@/components/Chemistry";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { ExampleGallery } from "@/components/ExampleGallery";
import { Header, Wordmark } from "@/components/Header";
import { PersonaDossier } from "@/components/persona/PersonaDossier";
import { RecentReports } from "@/components/RecentReports";
import { ResearchLog } from "@/components/ResearchLog";
import { SearchForm } from "@/components/SearchForm";
import { type Seed, useStream } from "@/components/useStream";
import type { ReportSummary } from "@/lib/cache";
import type { IdentityCandidate } from "@/lib/types";

export default function Home() {
  const { state, run, reset } = useStream();
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const lastSeed = useRef<Seed | null>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setReports(d.reports || []))
      .catch(() => {});
  }, []);

  // Inject the active "me" profile (set on /me) so chemistry runs against you,
  // and remember the seed so a disambiguation pick can re-run with the same context.
  const runWithMe: typeof run = (seed) => {
    const me = typeof window !== "undefined" ? localStorage.getItem("rapport_me") : null;
    const full = me ? { ...seed, me_slug: me } : seed;
    lastSeed.current = full;
    return run(full);
  };

  // Click a "Which one?" candidate → re-resolve seeded with THAT person's
  // company/title (the disambiguating signal), keeping the original meeting
  // context + language. This pins the identity and proceeds to synthesis.
  const pickCandidate = (c: IdentityCandidate) => {
    const base = lastSeed.current;
    runWithMe({
      name: c.name,
      company: c.company || base?.company,
      title: c.title || undefined,
      meeting_context: base?.meeting_context,
      output_lang: base?.output_lang,
    });
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
        {/* HERO — masthead */}
        {!started && (
          <section className="pt-14 pb-8">
            <Wordmark size="lg" />
            <div className="mt-3 flex items-center gap-3">
              <span className="h-px flex-1 bg-ink" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">person intelligence · sourced · for the room you&apos;re walking into</span>
            </div>
            <p className="mt-6 max-w-xl font-serif text-3xl leading-[1.15] text-ink">
              Know anyone before you meet them — and how you&apos;ll click.
            </p>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
              Paste a name or LinkedIn URL. Rapport fans out across public data and returns a sourced, meeting-ready
              briefing — every claim clickable to its source, quotes substring-verified, attribution authorship-checked.
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
            <p className="mb-3 mt-1 text-xs text-muted">Same-name collision — pick the right person to confirm (anti-collision gate), or re-run with a LinkedIn URL that pins them.</p>
            <ul className="space-y-2 text-sm">
              {state.candidates.map((c, i) => (
                <li key={i}>
                  <button
                    onClick={() => pickCandidate(c)}
                    disabled={state.busy}
                    className="group flex w-full items-start justify-between gap-3 rounded border border-hair bg-paper px-3.5 py-2.5 text-left transition hover:border-accent disabled:opacity-50"
                  >
                    <span>
                      <b>{c.name}</b>
                      {(c.title || c.company) && <> — {[c.title, c.company].filter(Boolean).join(" @ ")}</>}
                      {c.distinguishing_detail && <span className="text-muted"> · {c.distinguishing_detail}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-muted group-hover:text-accent">this one →</span>
                  </button>
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
            {state.slug && state.persona.status !== "needs_disambiguation" && (
              <div className="mt-8">
                <AskPanel slug={state.slug} name={state.persona.identity.name} />
                <FeedbackWidget slug={state.slug} />
              </div>
            )}
          </div>
        )}

        {/* CALENDAR + GALLERY + RECENT (landing only) */}
        {!started && (
          <div className="mt-12 border-t border-hair pt-10">
            <CalendarStrip cachedSlugs={cachedSlugs} busy={state.busy} onRun={runWithMe} />
            <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-2">
              <ExampleGallery cachedSlugs={cachedSlugs} busy={state.busy} onRun={runWithMe} />
              <RecentReports reports={reports} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
