"use client";

import { useState } from "react";

// Accuracy feedback — the stage killer. A judge clicks "Accurate" on their own
// dossier = live self-verification. Posts to /api/feedback (data/feedback.jsonl).
export function FeedbackWidget({ slug }: { slug: string }) {
  const [verdict, setVerdict] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  async function post(payload: Record<string, unknown>) {
    try {
      await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, ...payload }) });
    } catch {
      // demo: never block on a write error
    }
  }

  function choose(v: string) {
    setVerdict(v);
    post({ verdict: v });
  }

  return (
    <section className="no-print mb-7 rounded border border-hair bg-white p-5">
      <div className="font-serif text-lg">Is this accurate?</div>
      <p className="mt-0.5 text-[12px] text-muted">Your feedback trains Rapport. If this is about you, tell us how we did.</p>

      <div className="mt-3 flex gap-2">
        {[
          { v: "correct", label: "✓ Accurate" },
          { v: "partial", label: "~ Partly" },
          { v: "wrong", label: "✗ Off" },
        ].map((o) => (
          <button
            key={o.v}
            onClick={() => choose(o.v)}
            className={
              verdict === o.v
                ? "rounded border border-accent bg-accent px-3 py-1.5 text-sm text-paper"
                : "rounded border border-hair px-3 py-1.5 text-sm text-ink hover:border-accent"
            }
          >
            {o.label}
          </button>
        ))}
      </div>

      {verdict && !sent && (
        <div className="mt-3">
          <textarea
            className="w-full resize-none rounded border border-hair bg-paper px-3 py-2 text-sm outline-none focus:border-accent"
            rows={2}
            placeholder="Anything we got right or wrong? (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={() => {
              post({ verdict, note });
              setSent(true);
            }}
            className="mt-2 rounded bg-ink px-4 py-1.5 text-sm text-paper hover:bg-accent"
          >
            Send feedback
          </button>
        </div>
      )}
      {sent && <p className="mt-3 font-mono text-[11px] text-accent">Thanks — logged. This is how Rapport learns.</p>}
    </section>
  );
}
