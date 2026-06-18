"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded border border-hair px-3 py-1 font-mono text-[11px] text-muted hover:text-ink">
      Save one-pager (PDF)
    </button>
  );
}
