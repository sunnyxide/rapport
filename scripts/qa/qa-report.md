# QA report — Rapport live shell (producer/QA session)

> Point-in-time smoke pass against `http://localhost:3000`, **2026-06-18 ~14:46**.
> ⚠️ Shell is **mid-build** (main session actively editing — dev server observed bouncing).
> Report-only: **core fixes belong to the main session.** Full adversarial pass (per
> `adversarial-inputs.md`) is deferred until a stable checkpoint to avoid noise.

## Smoke pass — demo backbone

| Sev | Area | Finding | Evidence | Owner |
|:--|:--|:--|:--|:--|
| ✅ | Landing | Renders clean: H1 "Rapport" + tagline + value-prop, full search form (Name/Company/LinkedIn/Meeting-context + Chemistry-vs-me toggle), example gallery (Yeop ★LIVE, Wookjae, Jooneun, Sunwoo Ju). | snapshot | — |
| 🔵 noise | Console | 8× `webpack-hmr` WebSocket `ERR_CONNECTION_REFUSED`. **NOT a product bug** — dev server restarted under the open page (HMR can't reconnect). Will vanish on a fresh load of a stable server. | console | — (dev only) |
| 🟢 low | Branding | `GET /favicon.ico → 404`. Cosmetic; app uses `app/icon.svg`. 1-min fix: add `app/favicon.ico` (or ignore). | console | main (app/) |
| 🟡 note | Gallery UX | Example card **prefills the form** (Name/Company/LinkedIn) + enables "Build persona" — it does NOT instant-replay a dossier. SPEC **S2** described card → `replay(slug)` 즉시 도시에. Confirm whether prefill-then-build is the intended demo flow (one extra click on stage). | snapshot | main (decide) |
| 🟠 OPEN (mine) | Demo cache | `data/cache/` exists but is **EMPTY** → no instant-replay backbone yet. Not a defect — it's the **P3 cache-seeding task (my lane)**. Mechanism: a successful build auto-writes `data/cache/<slug>.json` (`lib/cache.ts writeReport`). Seeding = drive one build per demo target once the pipeline is green. | `ls data/cache`, `lib/cache.ts` | **producer (me)** |
| ⏳ verify | Pipeline | Live `Build persona` end-to-end (identity → fan-out → synth → 4 gates → sourced dossier) **not yet validated** — server was restarting; deferred to stable checkpoint. This is the #1 demo-path check. | — | producer to run |

## Next (when main session signals a stable build)
1. Drive `Build persona` for **Yeop Lee** → validate full pipeline + clickable sources + 4-gate behavior.
2. Run **A1→A2** (Wookjae collision) + **E1** (Jooneun honesty) from `adversarial-inputs.md`.
3. **Seed demo cache** (P3): build each demo target → confirm `data/cache/*.json` written → instant replay works → stage fallback secured.
4. Full adversarial battery + language-consistency sweep; append issues here.
