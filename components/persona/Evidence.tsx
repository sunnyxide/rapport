import type { EvidenceItem } from "@/lib/types";
import { Ref } from "./refs";

// EVIDENCE-TIED-OR-CUT item: point + (≤15w observed datum) + ref.
// Inferred basis → italic muted (honest labeling).
export function Evidence({ item, index }: { item: EvidenceItem; index: Map<string, number> }) {
  const inferred = item.basis === "inferred";
  return (
    <li className="mb-2 leading-snug">
      <span className={inferred ? "italic text-muted" : ""}>{item.point}</span>
      <Ref id={item.source_id} index={index} />
      {item.evidence && (
        <span className="mt-0.5 block font-mono text-[11px] text-muted">
          ↳ {item.evidence}
          {inferred && <span className="ml-1 not-italic">· inferred</span>}
        </span>
      )}
    </li>
  );
}

export function EvidenceList({ items, index }: { items: EvidenceItem[]; index: Map<string, number> }) {
  if (!items?.length) return null;
  return (
    <ul className="list-none">
      {items.map((it, i) => (
        <Evidence key={i} item={it} index={index} />
      ))}
    </ul>
  );
}
