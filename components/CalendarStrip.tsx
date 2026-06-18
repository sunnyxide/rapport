"use client";

import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import type { Seed } from "./useStream";

// S7 — calendar auto-prep (mock). The vision: Rapport watches your calendar and
// pre-builds a dossier for everyone you're about to meet. No real OAuth — a mock
// strip wired to cached/live demo targets shows the product's ambient value.
interface Meeting {
  when: string;
  name: string;
  org: string;
  linkedin: string;
}

const MEETINGS: Meeting[] = [
  { when: "Today · 2:30 PM", name: "Yeop Lee", org: "Anthropic", linkedin: "https://www.linkedin.com/in/yeoplee927/" },
  { when: "Today · 4:00 PM", name: "Dongjin Jang", org: "Anthropic", linkedin: "https://www.linkedin.com/in/dongjin-jang-kr/" },
  { when: "Tomorrow · 10:00 AM", name: "Hannah Moran", org: "Anthropic", linkedin: "https://www.linkedin.com/in/hannahemoran/" },
];

export function CalendarStrip({ cachedSlugs, busy, onRun }: { cachedSlugs: Set<string>; busy: boolean; onRun: (seed: Seed) => void }) {
  const router = useRouter();

  function open(m: Meeting) {
    const slug = slugify(m.name, m.org);
    if (cachedSlugs.has(slug)) router.push(`/r/${slug}`);
    else onRun({ name: m.name, company: m.org, linkedin_url: m.linkedin });
  }

  return (
    <section className="rounded border border-hair bg-white">
      <div className="flex items-center justify-between border-b border-hair px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Upcoming meetings — auto-prepped</span>
        <span className="font-mono text-[9px] text-muted">calendar · mock</span>
      </div>
      <ul className="divide-y divide-hair">
        {MEETINGS.map((m) => {
          const ready = cachedSlugs.has(slugify(m.name, m.org));
          return (
            <li key={m.name}>
              <button onClick={() => open(m)} disabled={busy} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-paper disabled:opacity-50">
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] text-accent">{m.when}</span>
                  <span className="font-serif text-[15px]">{m.name}</span>
                  <span className="ml-2 text-[12px] text-muted">{m.org}</span>
                </span>
                <span className={`shrink-0 font-mono text-[9px] ${ready ? "text-accent" : "text-muted"}`}>{ready ? "dossier ready ↗" : "prep now"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
