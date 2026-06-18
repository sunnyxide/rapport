"use client";

import { useRef, useState } from "react";
import type { StageEvent } from "@/lib/events";
import type { Chemistry, IdentityCandidate, OutputLang, Persona } from "@/lib/types";

export type MacroStage = "idle" | "resolving" | "fetching" | "synth" | "chemistry" | "done";

export interface LogLine {
  text: string;
  kind: "info" | "hit" | "stage" | "gate" | "error";
}

export interface StreamState {
  log: LogLine[];
  macro: MacroStage;
  nSources: number;
  nSites: number;
  elapsed: number;
  persona: Persona | null;
  chemistry: Chemistry | null;
  slug: string | null;
  candidates: IdentityCandidate[] | null;
  busy: boolean;
  durationMs: number | null;
  cached: boolean;
}

const initial: StreamState = {
  log: [],
  macro: "idle",
  nSources: 0,
  nSites: 0,
  elapsed: 0,
  persona: null,
  chemistry: null,
  slug: null,
  candidates: null,
  busy: false,
  durationMs: null,
  cached: false,
};

export interface Seed {
  name: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  meeting_context?: string;
  output_lang?: OutputLang;
  me_slug?: string;
}

export function useStream() {
  const [s, setS] = useState<StreamState>(initial);
  const urls = useRef<Set<string>>(new Set());
  const hosts = useRef<Set<string>>(new Set());

  const patch = (p: Partial<StreamState>) => setS((prev) => ({ ...prev, ...p }));
  const push = (line: LogLine) => setS((prev) => ({ ...prev, log: [...prev.log, line] }));

  function onEvent(e: StageEvent) {
    switch (e.stage) {
      case "identity":
        if (e.status === "start") {
          patch({ macro: "resolving" });
          push({ text: `→ Resolving identity: ${e.candidateName ?? ""}`, kind: "stage" });
        } else if (e.status === "resolved") {
          push({ text: `✓ Resolved → ${e.candidateName} [${e.handle || "no handle"}] · conf ${pct(e.confidence)}`, kind: "stage" });
        } else if (e.status === "ambiguous") {
          push({ text: "⚠ Same-name collision — disambiguation required", kind: "stage" });
        }
        break;
      case "fanout":
        if (e.status === "start") {
          patch({ macro: "fetching" });
          push({ text: "→ Fan-out: searching public sources…", kind: "stage" });
        } else if (e.status === "track") {
          push({ text: `  track: ${e.track}`, kind: "info" });
        } else if (e.status === "hit" && e.url) {
          const key = e.url.replace(/[#?].*$/, "").replace(/\/$/, "");
          if (!urls.current.has(key)) {
            urls.current.add(key);
            if (e.host) hosts.current.add(e.host);
            patch({ nSources: urls.current.size, nSites: hosts.current.size });
            push({ text: `  • ${e.host} — ${trunc(e.title, 52)} [${e.type}${e.relation ? "," + relShort(e.relation) : ""}]`, kind: "hit" });
          }
        } else if (e.status === "done") {
          push({ text: `✓ ${e.count} unique sources`, kind: "stage" });
        }
        break;
      case "transcript":
        if (e.status === "start") push({ text: "  track: video transcripts", kind: "info" });
        else if (e.status === "hit") push({ text: `  ▶ captions: ${e.host} — ~${e.quotes ?? 0} quote candidates`, kind: "hit" });
        break;
      case "synth":
        if (e.status === "start") {
          patch({ macro: "synth" });
          push({ text: "⠋ Synthesizing (Opus 4.8, effort=high)…", kind: "stage" });
        } else if (e.status === "done") {
          push({ text: "✓ Synthesis complete", kind: "stage" });
        }
        break;
      case "chemistry":
        if (e.status === "start") {
          patch({ macro: "chemistry" });
          push({ text: "⠋ Computing chemistry (me × them)…", kind: "stage" });
        } else if (e.status === "done") {
          push({ text: `✓ Chemistry ${e.score?.toFixed(1) ?? ""}/10`, kind: "stage" });
        }
        break;
      case "gate":
        push({ text: `  ⊘ gate${e.gate}: ${e.message}`, kind: "gate" });
        break;
      case "needs_disambiguation":
        patch({ candidates: e.candidates, macro: "done" });
        break;
      case "done":
        patch({ persona: e.persona, chemistry: e.chemistry ?? null, slug: e.slug, durationMs: e.durationMs, cached: !!e.cached, macro: "done" });
        push({ text: `✓ Done in ${(e.durationMs / 1000).toFixed(1)}s · ${e.nSources} sources`, kind: "stage" });
        break;
      case "error":
        push({ text: `✗ ${e.message}`, kind: "error" });
        break;
    }
  }

  async function run(seed: Seed) {
    urls.current = new Set();
    hosts.current = new Set();
    setS({ ...initial, busy: true });
    const t0 = Date.now();
    const timer = setInterval(() => patch({ elapsed: Math.round((Date.now() - t0) / 100) / 10 }), 100);
    try {
      const res = await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seed),
      });
      if (!res.body) throw new Error("no stream body");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as StageEvent);
      }
    } catch (e) {
      push({ text: `✗ ${e instanceof Error ? e.message : String(e)}`, kind: "error" });
    } finally {
      clearInterval(timer);
      patch({ busy: false });
    }
  }

  function reset() {
    urls.current = new Set();
    hosts.current = new Set();
    setS(initial);
  }

  return { state: s, run, reset };
}

function pct(n?: number) {
  return n == null ? "—" : `${Math.round(n * 100)}%`;
}
function trunc(s?: string, n = 50) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function relShort(r: string) {
  return { by_target: "self", about_target: "about", third_party: "3rd", unrelated: "x" }[r] || r;
}
