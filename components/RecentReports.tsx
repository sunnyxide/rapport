"use client";

import Link from "next/link";
import type { ReportSummary } from "@/lib/cache";

// Saved/recent reports (filesystem cache = the saved-reports list).
export function RecentReports({ reports }: { reports: ReportSummary[] }) {
  if (!reports.length) return null;
  return (
    <section>
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Saved reports</h2>
      <ul className="mt-3 divide-y divide-hair border-y border-hair">
        {reports.map((r) => (
          <li key={r.slug}>
            <Link href={`/r/${r.slug}`} className="flex items-baseline justify-between gap-3 py-2.5 transition hover:text-accent">
              <span className="min-w-0">
                <span className="font-serif text-[15px]">{r.name}</span>
                {r.company && <span className="ml-2 text-[11px] text-muted">{r.company}</span>}
              </span>
              <span className="shrink-0 font-mono text-[9px] text-muted">{r.has_chemistry ? "+chemistry ↗" : "↗"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
