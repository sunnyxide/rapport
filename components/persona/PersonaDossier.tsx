import type { Persona } from "@/lib/types";
import { ActivityTimeline } from "./ActivityTimeline";
import { BehavioralRead } from "./BehavioralRead";
import { EvidenceList } from "./Evidence";
import { Photo } from "./Photo";
import { buildRefIndex, Ref } from "./refs";

// Editorial dossier. Single reading column. serif display + sans body + mono micro.
// Order: header → the-one-thing (pull-quote) → snapshot/whats_new → sales playbook
// (framed) → top moves → non-obvious → quotes → behavioral aside → timeline →
// honest gaps → numbered references.
export function PersonaDossier({ persona }: { persona: Persona }) {
  const index = buildRefIndex(persona);
  const p = persona;
  const limited = p.status === "limited_data";

  return (
    <article className="font-sans text-ink">
      {/* HEADER BAND */}
      <header className="flex items-start gap-5 border-b-2 border-ink pb-5">
        <Photo identity={p.identity} />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-4xl leading-[1.05] tracking-tight">{p.identity.name}</h1>
          <div className="mt-1 text-sm text-muted">{[p.identity.title, p.identity.company, p.identity.location].filter(Boolean).join(" · ")}</div>
          <div className="mt-1.5 font-mono text-[11px] text-muted">
            confidence {fmtPct(p.identity.confidence)} · coverage {fmtPct(p.coverage_confidence)}
            {limited && <span className="ml-2 rounded-full bg-panel px-2 py-0.5 text-accent">limited public data</span>}
          </div>
        </div>
      </header>

      {/* THE ONE MOVE — ruled pull-quote hero */}
      {p.the_one_thing && (
        <section className="my-6 border-y border-hair py-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">The one move</div>
          <p className="mt-1.5 font-serif text-2xl leading-snug">{p.the_one_thing}</p>
        </section>
      )}

      {/* SNAPSHOT + whats_new */}
      {(p.snapshot || p.whats_new) && (
        <section className="mb-6">
          {p.snapshot && <p className="text-[15px] leading-relaxed">{p.snapshot}</p>}
          {p.whats_new && (
            <p className="mt-3 text-sm leading-relaxed">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">What changed </span>
              {p.whats_new}
            </p>
          )}
        </section>
      )}

      {/* SALES PLAYBOOK — framed box, never collapsed (Tier 1) */}
      <section className="mb-7 border border-ink p-5">
        <h2 className="font-serif text-xl">Sales playbook</h2>
        {p.sales_playbook.best_hook?.point && (
          <div className="mt-3">
            <Label>Best hook</Label>
            <p className="leading-snug">
              {p.sales_playbook.best_hook.point}
              <Ref id={p.sales_playbook.best_hook.source_id} index={index} />
            </p>
            {p.sales_playbook.best_hook.evidence && <p className="font-mono text-[11px] text-muted">↳ {p.sales_playbook.best_hook.evidence}</p>}
          </div>
        )}
        <PlaybookBlock title="What they care about" items={p.sales_playbook.what_they_care_about} index={index} />
        <PlaybookBlock title="Do" items={p.sales_playbook.approach_do} index={index} />
        <PlaybookBlock title="Avoid" items={p.sales_playbook.approach_avoid} index={index} />
        {p.sales_playbook.shared_hooks?.length > 0 && <PlaybookBlock title="Shared hooks" items={p.sales_playbook.shared_hooks} index={index} />}
        {p.sales_playbook.likely_objections?.length > 0 && (
          <div className="mt-4">
            <Label>Likely objections</Label>
            <ul className="list-none">
              {p.sales_playbook.likely_objections.map((o, i) => (
                <li key={i} className="mb-2 leading-snug">
                  <span className="font-medium">{o.objection}</span> → {o.counter}
                  <Ref id={o.source_id} index={index} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* TOP MOVES ×3 — visible chain fact → inference → move */}
      {p.top_moves?.length > 0 && (
        <section className="mb-7">
          <h2 className="font-serif text-xl">Top meeting-changers</h2>
          <ol className="mt-3 list-none">
            {[...p.top_moves]
              .sort((a, b) => (b.importance_score ?? 0) - (a.importance_score ?? 0))
              .map((m, i) => (
                <li key={i} className="mb-4 border-l-2 border-accent pl-4">
                  <div className="font-mono text-[10px] text-muted">
                    {m.trait} · weight {fmtPct(m.importance_score)}
                  </div>
                  <p className="leading-snug">
                    <span className="text-muted">{m.fact}</span>
                    <Ref id={m.source_id} index={index} /> <span className="text-hair">→</span> <span className="italic">{m.inference}</span>{" "}
                    <span className="text-hair">→</span> <span className="font-medium">{m.move}</span>
                  </p>
                </li>
              ))}
          </ol>
        </section>
      )}

      {/* NON-OBVIOUS — editor's note */}
      {p.non_obvious?.insight && (
        <section className="mb-7 bg-panel p-5">
          <Label>The non-obvious detail</Label>
          <p className="mt-1 font-serif text-lg italic leading-snug">
            {p.non_obvious.insight}
            <Ref id={p.non_obvious.source_id} index={index} />
          </p>
        </section>
      )}

      {/* NOTABLE QUOTES */}
      {p.notable_quotes?.length > 0 && (
        <section className="mb-7">
          <h2 className="font-serif text-xl">In their own words</h2>
          {p.notable_quotes.map((q, i) => (
            <blockquote key={i} className="mt-3 border-l-2 border-hair pl-4">
              <p className="font-serif text-lg leading-snug">
                “{q.quote}”<Ref id={q.source_id} index={index} />
                {q.original_lang && <span className="ml-1 font-mono text-[9px] not-italic text-muted">(원문/original)</span>}
              </p>
              {q.why_it_matters && <p className="mt-0.5 text-[12px] text-muted">{q.why_it_matters}</p>}
            </blockquote>
          ))}
        </section>
      )}

      {/* BEHAVIORAL READ / MBTI */}
      <BehavioralRead read={p.behavioral_read} index={index} />

      {/* ACTIVITY TIMELINE */}
      <ActivityTimeline persona={p} index={index} />

      {/* HONEST GAPS */}
      {p.honest_gaps?.length > 0 && (
        <section className="mb-7">
          <Label>Honest unknowns</Label>
          <ul className="mt-1 list-disc pl-5 text-sm text-muted">
            {p.honest_gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </section>
      )}

      {/* SOURCES — numbered reference list (signature element) */}
      {p.sources?.length > 0 && (
        <section className="mb-4 border-t border-hair pt-5">
          <h2 className="font-serif text-xl">References</h2>
          <ol className="mt-3 list-none font-mono text-[11px]">
            {p.sources.map((s, i) => (
              <li key={s.id} id={`ref-${i + 1}`} className="mb-1.5 leading-snug">
                <span className="text-accent">[{i + 1}]</span>{" "}
                <a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-hair underline-offset-2 hover:decoration-ink">
                  {s.title || s.url}
                </a>{" "}
                <span className="text-muted">
                  · {hostOf(s.url)}
                  {s.date ? ` · ${s.date}` : ""} · <RelationBadge relation={s.relation_to_target} />
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </article>
  );
}

function PlaybookBlock({ title, items, index }: { title: string; items: Persona["sales_playbook"]["approach_do"]; index: Map<string, number> }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <Label>{title}</Label>
      <EvidenceList items={items} index={index} />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{children}</div>;
}

function RelationBadge({ relation }: { relation: string }) {
  const map: Record<string, string> = { by_target: "self", about_target: "about", third_party: "3rd-party", unrelated: "unrelated" };
  return <span className="not-italic">{map[relation] || relation}</span>;
}

function fmtPct(n?: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
