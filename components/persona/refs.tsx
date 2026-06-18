import type { Persona } from "@/lib/types";

// Build source_id → reference number (1-based) from persona.sources order.
export function buildRefIndex(p: Persona): Map<string, number> {
  const m = new Map<string, number>();
  p.sources.forEach((s, i) => m.set(s.id, i + 1));
  return m;
}

// Clickable numbered reference. Out-of-range source_id renders nothing (no broken link).
export function Ref({ id, index }: { id?: string; index: Map<string, number> }) {
  if (!id) return null;
  const n = index.get(id);
  if (!n) return null;
  return (
    <a href={`#ref-${n}`} className="ref" aria-label={`reference ${n}`}>
      [{n}]
    </a>
  );
}
