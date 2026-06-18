"use client";

import { useState } from "react";
import { parseSeed } from "@/lib/parseSeed";
import type { OutputLang } from "@/lib/types";
import type { Seed } from "./useStream";

// paste-anything search: one box for name / LinkedIn URL / email, an optional
// meeting-context line, and an output-language toggle (single language, no mix).
export function SearchForm({ busy, onRun }: { busy: boolean; onRun: (seed: Seed) => void }) {
  const [paste, setPaste] = useState("");
  const [meeting, setMeeting] = useState("");
  const [lang, setLang] = useState<OutputLang>("en");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [company, setCompany] = useState("");

  function submit() {
    const parsed = parseSeed(paste);
    if (!parsed.name) return;
    onRun({
      name: parsed.name,
      company: company.trim() || parsed.company,
      linkedin_url: parsed.linkedin_url,
      meeting_context: meeting.trim() || undefined,
      output_lang: lang,
    });
  }

  return (
    <div className="text-sm">
      <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Who are you meeting?</label>
      <textarea
        className="w-full resize-none rounded border border-hair bg-white px-3 py-2.5 leading-relaxed outline-none focus:border-accent"
        rows={2}
        placeholder="Paste a name, a LinkedIn URL, or an email — e.g. “Yeop Lee, Anthropic” or linkedin.com/in/yeoplee927"
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
      />

      {showAdvanced && (
        <input
          className="mt-2 w-full rounded border border-hair bg-white px-3 py-2 outline-none focus:border-accent"
          placeholder="Company (optional — improves disambiguation)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      )}

      <textarea
        className="mt-2 w-full resize-none rounded border border-hair bg-white px-3 py-2 leading-relaxed outline-none focus:border-accent"
        rows={2}
        placeholder="Meeting context (optional) — what's the goal? e.g. “We're pitching a startup partnership / Claude adoption.”"
        value={meeting}
        onChange={(e) => setMeeting(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={submit}
          disabled={busy || !paste.trim()}
          className="rounded bg-ink px-5 py-2.5 font-medium text-paper transition hover:bg-accent disabled:opacity-40"
        >
          {busy ? "Building…" : "Build dossier →"}
        </button>

        <div className="inline-flex overflow-hidden rounded border border-hair font-mono text-[11px]">
          {(["en", "ko"] as OutputLang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={lang === l ? "bg-accent px-2.5 py-1 text-paper" : "px-2.5 py-1 text-muted hover:text-ink"}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        <button onClick={() => setShowAdvanced((v) => !v)} className="font-mono text-[11px] text-muted hover:text-ink">
          {showAdvanced ? "− company" : "+ company"}
        </button>
        <span className="font-mono text-[10px] text-muted">⌘↵ to run</span>
      </div>
    </div>
  );
}
