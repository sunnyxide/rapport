"use client";

import { useState } from "react";
import type { Chemistry as ChemistryType } from "@/lib/types";

// Chemistry block — me × them. 10-pt score + MBTI-compat aside (default ON,
// labeled directional). shared/complementary/clashing + how-to-click. Both-sides
// sourced. "directional, not a relationship prediction" label.
export function ChemistryBlock({ chem }: { chem: ChemistryType }) {
  const [on, setOn] = useState(true);
  const meName = chem.me_name || "Me";
  const insufficient = chem.chemistry_score <= 0 && chem.shared_interests.length === 0;

  return (
    <section className="mb-7 border border-accent">
      <div className="flex items-center justify-between bg-accent px-5 py-2.5 text-paper">
        <h2 className="font-serif text-xl">Chemistry · {meName} × them</h2>
        <button onClick={() => setOn((v) => !v)} className="font-mono text-[10px] opacity-80 hover:opacity-100">
          {on ? "hide" : "show"}
        </button>
      </div>

      {on && (
        <div className="p-5">
          {insufficient ? (
            <p className="text-sm text-muted">{chem.overall_read || "Insufficient public data on one party for a chemistry read."}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-5">
                <div>
                  <div className="font-serif text-5xl leading-none text-accent">{chem.chemistry_score.toFixed(1)}</div>
                  <div className="font-mono text-[9px] text-muted">/10 · heuristic</div>
                </div>
                <p className="min-w-0 flex-1 text-[15px] leading-snug">{chem.overall_read}</p>
              </div>

              {chem.mbti_compat?.them_type && (
                <div className="mt-3 inline-block rounded-full bg-panel px-3 py-1 font-mono text-[10px] text-muted">
                  {chem.mbti_compat.me_type} × {chem.mbti_compat.them_type} — {chem.mbti_compat.read} · {chem.mbti_compat.label}
                </div>
              )}

              <Block title="Shared ground">
                {chem.shared_interests.map((s, i) => (
                  <li key={i} className="mb-2 leading-snug">
                    {s.point}
                    <span className="mt-0.5 block font-mono text-[11px] text-muted">
                      ↳ you: {s.me_evidence} · them: {s.them_evidence}
                    </span>
                  </li>
                ))}
              </Block>

              <Block title="Complementary">
                {chem.complementary_traits.map((c, i) => (
                  <li key={i} className="mb-2 leading-snug">
                    <span className="font-medium">{c.trait}</span> — {c.why_it_helps}
                    <span className="mt-0.5 block font-mono text-[11px] text-muted">↳ you: {c.me_signal} · them: {c.them_signal}</span>
                  </li>
                ))}
              </Block>

              <Block title="Potential friction">
                {chem.potential_friction.map((f, i) => (
                  <li key={i} className="mb-2 leading-snug">
                    {f.point} — <span className="italic">{f.how_to_navigate}</span>
                  </li>
                ))}
              </Block>

              {chem.interaction_simulation?.opening_30s && (
                <div className="mt-4 bg-panel p-4 text-sm">
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">How to click</div>
                  <p className="mt-1"><b>First 30s:</b> {chem.interaction_simulation.opening_30s}</p>
                  <p className="mt-1"><b>Arc:</b> {chem.interaction_simulation.likely_arc}</p>
                  {chem.interaction_simulation.where_it_could_stall && <p className="mt-1"><b>Could stall:</b> {chem.interaction_simulation.where_it_could_stall}</p>}
                  {chem.interaction_simulation.how_to_adapt && <p className="mt-1"><b>Adapt:</b> {chem.interaction_simulation.how_to_adapt}</p>}
                </div>
              )}
            </>
          )}
          <p className="mt-4 font-mono text-[10px] italic text-muted">directional · public-signal-based · swap-tested · not a relationship prediction</p>
        </div>
      )}
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children : [children];
  if (!arr.length || arr.every((c) => !c)) return null;
  return (
    <div className="mt-4">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{title}</div>
      <ul className="list-none">{children}</ul>
    </div>
  );
}
