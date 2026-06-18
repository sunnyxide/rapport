import type { Emit } from "../events";
import type { GateReport, Persona, ResolvedIdentity, SourceHit } from "../types";
import { gateAttribution } from "./attribution";
import { gateGrounding } from "./grounding";
import { gateQuotes } from "./quotes";
import { applyHandleMatch } from "./util";

function emptyReport(): GateReport {
  return { sourcesDropped_misattributed: [], claimsDemoted_about: [], quotesDropped: [], unsourcedLabeled: [], notes: [] };
}

// applyGates: ① disambiguation (pre-synth, in pipeline) → ② source-grounding →
// ③ quote substring → ④ ATTRIBUTION → confidence/limited_data.
export async function applyGates(
  persona: Persona,
  id: ResolvedIdentity,
  sourcesRaw: SourceHit[],
  emit: Emit,
): Promise<Persona> {
  const report = emptyReport();

  // Stage-1 deterministic handle-match (Gate ④ prerequisite; feeds grounding badges).
  const sources = applyHandleMatch(sourcesRaw, id.resolved_handle);

  let p = gateGrounding(persona, sources, report); // ②
  p = gateQuotes(p, sources, report); // ③
  p = await gateAttribution(p, sources, id, report, emit); // ④
  p = adjustConfidence(p, report, emit);

  return p;
}

// Recompute coverage honestly after gate drops; flag limited_data when thin.
function adjustConfidence(persona: Persona, report: GateReport, emit: Emit): Persona {
  const pb = persona.sales_playbook;
  const playbookItems = [...pb.what_they_care_about, ...pb.approach_do, ...pb.approach_avoid];
  const evidenceTied = playbookItems.filter((i) => i.basis === "stated").length;

  const thin =
    persona.top_moves.length === 0 ||
    (evidenceTied < 2 && persona.notable_quotes.length === 0 && persona.sources.length < 3);

  let status = persona.status;
  if (thin && status === "ok") {
    status = "limited_data";
    emit({ stage: "gate", status: "info", gate: 5, message: "thin evidence after gates → limited_data" });
  }

  if (report.quotesDropped.length)
    emit({ stage: "gate", status: "info", gate: 3, message: `${report.quotesDropped.length} unverified quote(s) dropped` });
  if (report.unsourcedLabeled.length)
    emit({ stage: "gate", status: "info", gate: 2, message: `${report.unsourcedLabeled.length} claim(s) relabeled inferred (unsourced)` });

  const total = playbookItems.length + persona.notable_quotes.length || 1;
  const grounded = evidenceTied + persona.notable_quotes.length;
  const coverage = Math.max(0.1, Math.min(1, grounded / total));

  return { ...persona, status, coverage_confidence: Number(coverage.toFixed(2)) };
}
