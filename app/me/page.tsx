"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import type { ReportSummary } from "@/lib/cache";

// /me — your profile. It becomes the left-hand side of every chemistry read.
// Self-Q&A (no web needed) → cached me-<slug>. Set as active "me" via localStorage,
// which the landing search passes as me_slug to enable chemistry.
export default function MePage() {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const [meSlugs, setMeSlugs] = useState<ReportSummary[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setActive(localStorage.getItem("rapport_me"));
    fetch("/api/reports")
      .then((r) => r.json())
      .then((d) => setMeSlugs((d.reports || []).filter((r: ReportSummary) => r.slug.startsWith("me-"))))
      .catch(() => {});
  }, []);

  function setAsMe(slug: string) {
    localStorage.setItem("rapport_me", slug);
    setActive(slug);
    setMsg(`Active “me” set → ${slug}. Chemistry will now compare against you.`);
  }

  async function build() {
    if (!name.trim() || !about.trim() || busy) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, about }),
      });
      const d = await res.json();
      if (d.slug) {
        setAsMe(d.slug);
        const list = await fetch("/api/reports").then((r) => r.json());
        setMeSlugs((list.reports || []).filter((r: ReportSummary) => r.slug.startsWith("me-")));
      } else {
        setMsg(d.error || "Could not build profile.");
      }
    } catch {
      setMsg("Could not build profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header right={<Link href="/" className="hover:text-ink">Search another</Link>} />
      <main className="mx-auto max-w-reading px-6 pb-24 pt-10">
        <h1 className="font-serif text-3xl">Your profile</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
          Rapport compares <em>you</em> against everyone you meet — that&apos;s the chemistry read. Describe yourself once;
          it&apos;s cached as your &ldquo;me&rdquo; and stays private to this device.
        </p>

        {meSlugs.length > 0 && (
          <section className="mt-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Saved profiles</div>
            <ul className="mt-2 divide-y divide-hair border-y border-hair">
              {meSlugs.map((m) => (
                <li key={m.slug} className="flex items-center justify-between py-2.5">
                  <span>
                    <span className="font-serif text-[15px]">{m.name}</span>
                    {m.company && <span className="ml-2 text-[11px] text-muted">{m.company}</span>}
                    {active === m.slug && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] text-paper">active</span>}
                  </span>
                  <span className="flex gap-3 font-mono text-[11px]">
                    <Link href={`/r/${m.slug}`} className="text-muted hover:text-ink">view</Link>
                    {active !== m.slug && <button onClick={() => setAsMe(m.slug)} className="text-accent hover:underline">set active</button>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8 rounded border border-hair bg-white p-5">
          <div className="font-serif text-xl">Build your profile</div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className="rounded border border-hair px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="rounded border border-hair px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <textarea
            className="mt-3 w-full resize-none rounded border border-hair px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
            rows={6}
            placeholder="What do you build? What do you care about? How do you work and communicate? Recent focus, background, what makes you tick…"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
          />
          <button onClick={build} disabled={busy || !name.trim() || !about.trim()} className="mt-3 rounded bg-ink px-5 py-2.5 text-sm text-paper hover:bg-accent disabled:opacity-40">
            {busy ? "Building…" : "Build & set as me"}
          </button>
          {msg && <p className="mt-3 font-mono text-[11px] text-accent">{msg}</p>}
        </section>
      </main>
    </>
  );
}
