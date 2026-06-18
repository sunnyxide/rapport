import type { GateReport, Persona, SourceHit } from "../types";
import { normalizeForVerify } from "./util";

// Gate ③ QUOTE SUBSTRING-VERIFY. A quote ships only if it appears near-verbatim
// (cross-script normalized) in some fetched source snippet. Miss → drop.
export function gateQuotes(persona: Persona, fetched: SourceHit[], report: GateReport): Persona {
  const corpus = fetched.map((s) => normalizeForVerify(s.snippet)).filter(Boolean);
  if (corpus.length === 0) {
    if (persona.notable_quotes.length) report.quotesDropped.push(...persona.notable_quotes.map((q) => q.quote.slice(0, 40)));
    return { ...persona, notable_quotes: [] };
  }

  const kept = persona.notable_quotes.filter((q) => {
    const needle = normalizeForVerify(q.quote);
    if (!needle || needle.length < 8) return false;
    const found = corpus.some((c) => c.includes(needle));
    if (!found) report.quotesDropped.push(q.quote.slice(0, 40));
    return found;
  });

  return { ...persona, notable_quotes: kept };
}
