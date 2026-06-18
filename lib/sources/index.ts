import { dataLayer } from "../env";
import type { Emit } from "../events";
import type { ResolvedIdentity, SourceHit } from "../types";
import { enrichWithApify } from "./apify";
import { cseTrack } from "./cse";
import { linkedInPostsTrack } from "./linkedin";
import { dedupeSources } from "./util";
import { videoTrack } from "./video";
import { webTrack } from "./web";

// Parallel fan-out across data tracks (Promise.allSettled — one failed track
// never crashes the run). web_search is the always-on floor; cse + LinkedIn +
// video layer on for the rich (`cse`) data layer.
export async function fanOut(id: ResolvedIdentity, emit: Emit): Promise<SourceHit[]> {
  emit({ stage: "fanout", status: "start" });
  const layer = dataLayer();

  const tracks: Promise<SourceHit[]>[] = [webTrack(id, emit)];
  if (layer === "cse") {
    tracks.push(cseTrack(id, emit), linkedInPostsTrack(id, emit), videoTrack(id, emit));
  }

  const settled = await Promise.allSettled(tracks);
  const all: SourceHit[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") all.push(...s.value);
    else emit({ stage: "gate", status: "info", gate: 0, message: `track failed: ${String(s.reason)}` });
  }

  // Renumber to contiguous s1..sN after dedupe so synthesis + gates work with a
  // clean, predictable id set (the global fetch counter is non-contiguous).
  let deduped = dedupeSources(all).map((s, i) => ({ ...s, id: `s${i + 1}` }));

  // Apify deepen (rich layer only) — full body for top web sources → quote 0-drop.
  if (layer === "cse") deduped = await enrichWithApify(deduped, emit);

  emit({ stage: "fanout", status: "done", count: deduped.length });
  return deduped;
}
