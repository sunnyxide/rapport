import type { Persona } from "@/lib/types";
import { Ref } from "./refs";

interface Row {
  year: number | null;
  label: string;
  detail: string;
  source_id?: string;
  kind: "career" | "activity";
}

// Defensive year parse: first 4-digit run; "present"/"now" → current sentinel.
function parseYear(s: string): number | null {
  if (!s) return null;
  if (/present|current|now/i.test(s)) return 9999;
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? parseInt(m[0], 10) : null;
}

// Merge career_arc + dated recent_activity. Newest-first; undated rows drop to the
// bottom rail (never date-faked, never dropped silently).
export function ActivityTimeline({ persona, index }: { persona: Persona; index: Map<string, number> }) {
  const rows: Row[] = [];

  for (const c of persona.career_arc || []) {
    rows.push({ year: parseYear(c.period), label: `${c.role}${c.org ? ` · ${c.org}` : ""}`, detail: c.what_they_built || "", source_id: c.source_id, kind: "career" });
  }
  for (const a of persona.recent_activity || []) {
    rows.push({ year: parseYear(a.date), label: a.what, detail: a.date || "", source_id: a.source_id, kind: "activity" });
  }
  if (rows.length === 0) return null;

  const dated = rows.filter((r) => r.year != null).sort((a, b) => (b.year as number) - (a.year as number));
  const undated = rows.filter((r) => r.year == null);

  return (
    <section className="mb-7 border-t border-hair pt-5">
      <h2 className="font-serif text-xl">Activity timeline</h2>
      <ul className="mt-3 list-none border-l border-hair pl-4">
        {dated.map((r, i) => (
          <li key={i} className="relative mb-3">
            <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${r.kind === "career" ? "bg-accent" : "border border-accent bg-paper"}`} />
            <div className="font-mono text-[10px] text-muted">{r.year === 9999 ? "present" : r.year}</div>
            <div className="leading-snug">
              {r.label}
              <Ref id={r.source_id} index={index} />
            </div>
            {r.detail && r.kind === "career" && <div className="text-[12px] text-muted">{r.detail}</div>}
          </li>
        ))}
        {undated.map((r, i) => (
          <li key={`u${i}`} className="relative mb-2 text-muted">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-hair bg-paper" />
            <span className="font-mono text-[10px]">— </span>
            {r.label}
            <Ref id={r.source_id} index={index} />
          </li>
        ))}
      </ul>
    </section>
  );
}
