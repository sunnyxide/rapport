"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";

// "Ask {person}" — grounded follow-up chat. Answers ONLY from the gathered
// sources/cache, cites [n], says "not in public data" otherwise. Streams via the
// Vercel AI SDK (/api/ask enforces the grounding).
export function AskPanel({ slug, name }: { slug: string; name: string }) {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ask", body: { slug } }),
  });
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  function submit() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    sendMessage({ text });
  }

  const suggestions = ["What should I open with?", "What do they care about most right now?", "Any risks to avoid?"];

  return (
    <section className="no-print mb-7 border-t border-hair pt-5">
      <h2 className="font-serif text-xl">Ask about {name.split(" ")[0]}</h2>
      <p className="mt-0.5 text-[12px] text-muted">Grounded in the gathered sources only — it will say when something isn&apos;t in the public data.</p>

      <div className="mt-3 space-y-3">
        {messages.map((m) => {
          const text = m.parts.filter((p) => p.type === "text").map((p) => (p as { text: string }).text).join("");
          if (!text) return null;
          return (
            <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
              <span
                className={
                  m.role === "user"
                    ? "inline-block max-w-[85%] rounded-lg bg-ink px-3 py-2 text-left text-sm text-paper"
                    : "inline-block max-w-[90%] rounded-lg bg-panel px-3 py-2 text-left text-sm leading-relaxed"
                }
              >
                {text}
              </span>
            </div>
          );
        })}
        {busy && <div className="font-mono text-[11px] text-muted">…thinking</div>}
      </div>

      {messages.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage({ text: s })}
              className="rounded-full border border-hair px-3 py-1 text-[12px] text-muted hover:border-accent hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded border border-hair bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder={`Ask anything about ${name.split(" ")[0]}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit} disabled={busy || !input.trim()} className="rounded bg-ink px-4 py-2 text-sm text-paper hover:bg-accent disabled:opacity-40">
          Ask
        </button>
      </div>
    </section>
  );
}
