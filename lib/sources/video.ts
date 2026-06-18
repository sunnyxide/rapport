import { env } from "../env";
import type { Emit } from "../events";
import type { ResolvedIdentity, SourceHit } from "../types";
import { runActor } from "./apify";
import { toSourceHit } from "./util";

// Video transcript track (the moat): youtube-search discovers interviews/talks,
// then the transcript actor pulls captions (no API key, no Whisper/ASR). The
// captions become substring-verifiable notable_quotes — stage wow. by_target
// (the target's own spoken words).
// One transcript keeps the moat (verbatim quotes) without the latency of many.
const MAX_VIDEOS = 1;

interface YtVideo {
  id?: string;
  videoId?: string;
  title?: string;
  channelName?: string;
  date?: string;
  url?: string;
}

interface Transcript {
  text?: string;
  transcript?: Array<{ text: string }> | string;
}

function transcriptText(item: Transcript): string {
  if (typeof item.transcript === "string") return item.transcript;
  if (Array.isArray(item.transcript)) return item.transcript.map((t) => t.text).join(" ");
  return item.text || "";
}

export async function videoTrack(id: ResolvedIdentity, emit: Emit): Promise<SourceHit[]> {
  if (!env("APIFY_API_TOKEN")) return [];
  emit({ stage: "transcript", status: "start" });

  const found = await runActor<YtVideo>(
    "scraper_one~youtube-search-scraper",
    { search: `${id.name}${id.company ? " " + id.company : ""} interview OR podcast OR talk`, maxItems: MAX_VIDEOS + 2 },
    13000,
  );
  if (!found || found.length === 0) return [];

  const videos = found.filter((v) => v.id || v.videoId).slice(0, MAX_VIDEOS);
  const hits: SourceHit[] = [];

  await Promise.allSettled(
    videos.map(async (v) => {
      const vid = v.videoId || v.id!;
      const url = v.url || `https://www.youtube.com/watch?v=${vid}`;
      const tr = await runActor<Transcript>("topaz_sharingan~youtube-transcript-scraper-1", { videoUrls: [url] }, 16000);
      const text = tr ? transcriptText(tr[0] || {}) : "";
      if (!text) return;
      const h = toSourceHit({
        url,
        title: v.title || `Video — ${id.name}`,
        date: v.date || "",
        snippet: text.slice(0, 6000),
        type: "youtube",
        relation_to_target: "by_target", // the target's own spoken words
        author_handle: id.resolved_handle || "",
      });
      hits.push(h);
      emit({ stage: "transcript", status: "hit", host: h.host, title: h.title, quotes: Math.round(text.length / 400) });
    }),
  );

  emit({ stage: "transcript", status: "done" });
  return hits;
}
