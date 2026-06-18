"use client";

import { useEffect, useRef, useState } from "react";
import type { LogLine, MacroStage } from "./useStream";

const STEPS: { key: MacroStage; label: string }[] = [
  { key: "resolving", label: "Identify" },
  { key: "fetching", label: "Fan-out" },
  { key: "synth", label: "Synthesize" },
  { key: "done", label: "Dossier" },
];
const ORDER: MacroStage[] = ["idle", "resolving", "fetching", "synth", "chemistry", "done"];

export function ResearchLog({
  log,
  macro,
  nSources,
  nSites,
  elapsed,
  busy,
}: {
  log: LogLine[];
  macro: MacroStage;
  nSources: number;
  nSites: number;
  elapsed: number;
  busy: boolean;
}) {
  const done = macro === "done" && !busy;
  const [open, setOpen] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!done) bottom.current?.scrollIntoView({ block: "end" });
  }, [log, done]);
  useEffect(() => {
    if (done) setOpen(false);
  }, [done]);

  const curIdx = ORDER.indexOf(macro);

  return (
    <div className="no-print">
      <div className="mb-2 flex items-center gap-1 text-[11px]">
        {STEPS.map((step) => {
          const idx = ORDER.indexOf(step.key);
          const state = curIdx > idx ? "done" : curIdx === idx || (step.key === "synth" && macro === "chemistry") ? "active" : "pending";
          return (
            <div key={step.key} className="flex items-center gap-1">
              <span
                className={
                  state === "active"
                    ? "rounded bg-accent px-2 py-0.5 font-mono text-paper"
                    : state === "done"
                      ? "rounded bg-ink px-2 py-0.5 font-mono text-paper"
                      : "rounded border border-hair px-2 py-0.5 font-mono text-muted"
                }
              >
                {step.label}
              </span>
              {step.key !== "done" && <span className="text-hair">—</span>}
            </div>
          );
        })}
        <span className="ml-auto font-mono text-muted">
          {nSources} src · {nSites} sites · {elapsed.toFixed(1)}s
        </span>
      </div>

      {done ? (
        <button onClick={() => setOpen((v) => !v)} className="mb-1 font-mono text-[11px] text-muted hover:text-ink">
          {open ? "▾" : "▸"} research log ({log.length} lines)
        </button>
      ) : null}
      {open && (
        <pre className="max-h-72 overflow-auto rounded bg-ink p-3 font-mono text-[11px] leading-relaxed text-paper">
          {log.map((l, i) => (
            <div
              key={i}
              className={
                l.kind === "error"
                  ? "text-red-300"
                  : l.kind === "gate"
                    ? "text-amber-300"
                    : l.kind === "hit"
                      ? "text-blue-200"
                      : ""
              }
            >
              {l.text}
            </div>
          ))}
          <div ref={bottom} />
        </pre>
      )}
    </div>
  );
}
