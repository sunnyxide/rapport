import type { GateReport, Persona, SourceHit } from "../types";

// Gate ② SOURCE-GROUNDING. Reconcile persona.sources against fetched ground truth:
// drop invented sources, overwrite url/relation/author_handle from fetch. Any claim
// citing a source_id not in the fetched set → relabel inferred. No unsourced guess
// presented as fact.
export function gateGrounding(persona: Persona, fetched: SourceHit[], report: GateReport): Persona {
  const byId = new Map(fetched.map((s) => [s.id, s]));
  const validIds = new Set(byId.keys());

  const sources = persona.sources
    .filter((s) => validIds.has(s.id))
    .map((s) => {
      const g = byId.get(s.id)!;
      return {
        id: g.id,
        url: g.url,
        title: s.title || g.title,
        date: s.date || g.date,
        relation_to_target: g.relation_to_target,
        author_handle: g.author_handle,
        used_for: s.used_for || "",
      };
    });

  const groundedIds = new Set(sources.map((s) => s.id));

  const fixEvidence = <T extends { source_id: string; basis: "stated" | "inferred" }>(items: T[]): T[] =>
    (items || []).map((it) => {
      if (it.source_id && !groundedIds.has(it.source_id)) {
        report.unsourcedLabeled.push(it.source_id);
        return { ...it, basis: "inferred" as const };
      }
      return it;
    });

  const pb = persona.sales_playbook;
  const sales_playbook: Persona["sales_playbook"] = {
    best_hook:
      pb.best_hook?.source_id && !groundedIds.has(pb.best_hook.source_id)
        ? { ...pb.best_hook, basis: "inferred" }
        : pb.best_hook,
    what_they_care_about: fixEvidence(pb.what_they_care_about),
    likely_objections: pb.likely_objections || [],
    approach_do: fixEvidence(pb.approach_do),
    approach_avoid: fixEvidence(pb.approach_avoid),
    shared_hooks: fixEvidence(pb.shared_hooks),
  };

  const skills_expertise = fixEvidence(persona.skills_expertise);

  return { ...persona, sources, sales_playbook, skills_expertise };
}
