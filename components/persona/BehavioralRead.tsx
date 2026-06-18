"use client";

import { useState } from "react";
import type { Persona } from "@/lib/types";
import { Ref } from "./refs";

// Behavioral read — footnoted aside. Big Five = grounded backbone; MBTI =
// illustrative garnish with per-letter signals + pill label. friendly_read
// likes/dislikes default ON. method_note always rendered (judge-facing caption).
export function BehavioralRead({ read, index }: { read: Persona["behavioral_read"]; index: Map<string, number> }) {
  const [open, setOpen] = useState(true);
  if (!read) return null;
  const hasMbti = read.predicted_mbti?.type && /[A-Z?]/.test(read.predicted_mbti.type);
  const hasContent =
    (read.big_five?.length ?? 0) > 0 || hasMbti || (read.likely_likes?.length ?? 0) > 0 || (read.likely_dislikes?.length ?? 0) > 0;
  if (!hasContent) return null;

  return (
    <section className="mb-7 border-t border-hair pt-5">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <h2 className="font-serif text-xl">Behavioral read</h2>
        <span className="font-mono text-[10px] text-muted">{open ? "collapse ▲" : "expand ▼"}</span>
      </button>
      {read.note && <p className="mt-1 text-[12px] italic text-accent">{read.note}</p>}

      {open && (
        <div className="mt-3">
          {read.big_five?.length > 0 && (
            <ul className="list-none">
              {read.big_five.map((t, i) => (
                <li key={i} className="mb-2 leading-snug">
                  <span className="font-medium">{t.trait}</span>
                  <span className="font-mono text-[10px] text-muted"> · {fmtPct(t.confidence)} · {t.basis}</span>
                  <Ref id={t.source_id} index={index} />
                  <span className="block text-[13px] text-muted">↳ {t.signal}</span>
                </li>
              ))}
            </ul>
          )}

          {read.communication_adaptation && (
            <p className="mt-2 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-widest text-accent">How to communicate </span>
              {read.communication_adaptation}
            </p>
          )}

          {hasMbti && (
            <div className="mt-4 inline-block border border-hair px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl tracking-wide">{read.predicted_mbti.type}</span>
                <span className="rounded-full bg-panel px-2 py-0.5 font-mono text-[9px] text-muted">
                  illustrative · public-signal estimate · not a clinical diagnosis
                </span>
              </div>
              {read.predicted_mbti.basis_per_letter?.length > 0 && (
                <ul className="mt-1.5 font-mono text-[10px] text-muted">
                  {read.predicted_mbti.basis_per_letter.map((b, i) => (
                    <li key={i}>
                      <span className="text-accent">{b.letter}</span>: {b.signal}
                      <Ref id={b.source_id} index={index} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {(read.likely_likes?.length > 0 || read.likely_dislikes?.length > 0) && (
            <div className="mt-4 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent">Bring</div>
                <ul className="mt-1 list-disc pl-4">
                  {read.likely_likes?.map((l, i) => (
                    <li key={i}>
                      {l.point} {l.evidence && <span className="text-muted">— {l.evidence}</span>}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-accent">Avoid</div>
                <ul className="mt-1 list-disc pl-4">
                  {read.likely_dislikes?.map((l, i) => (
                    <li key={i}>
                      {l.point} {l.evidence && <span className="text-muted">— {l.evidence}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {read.method_note && <p className="mt-4 font-mono text-[10px] italic text-muted">{read.method_note}</p>}
        </div>
      )}
    </section>
  );
}

function fmtPct(n?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}
