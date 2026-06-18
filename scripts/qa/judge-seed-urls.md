# 한투 (Korea Investment) judge seed URLs — HANDOFF to main session

> Producer/QA research output (2026-06-18). Goal: seed verified LinkedIn `/in/<handle>`
> so the identity gate (`lib/identity.ts`) resolves these judges **deterministically**
> (seeded handle always wins). **A wrong URL is worse than none** — it would deterministically
> resolve to the wrong person on stage. Three of five are deliberately left blank.
>
> **Action for main session:** apply the two VERIFIED urls below to `data/demo_targets.json`
> (the `linkedin` field, currently `TBD`) and/or the cache seed. Hold the three TBDs.

## ✅ Verified — safe to seed (2)

| Name | Org | Seed `linkedin` | Conf | Display notes |
|:--|:--|:--|:--|:--|
| **SoonOuk Jung** | Korea Investment **Partners (KIP)** | `https://www.linkedin.com/in/soon-ouk-jung-08398264/` | 0.88 | Real title = **Executive Director** (전무/이사급), not "투자이사". **Do NOT display Korean name** — 정순옥 spelling is unconfirmed (only romanization in sources). SNU 1997–2004; ex-IBK. |
| **Dongwon Sung** | Korea Investment **Partners (KIP)** | `https://www.linkedin.com/in/dsung92/` | 0.90 | **Principal, Venture Group 2** (AI/Digital focus), goes by **"Ellie"**. UIUC (Statistics/Econ), ex-SK data scientist. Roster "팀장" ≈ group-lead, close enough. |

Corroboration: The Org (KIP management team / org-chart), Equilar, RocketReach/ContactOut, and Dongwon's own `/posts/dsung92_…("At KIP we are committed…")`.

## ⚠️ Stay TBD — identity known, URL NOT verified (3)

| Name | Org | Status | What we know / blocker |
|:--|:--|:--|:--|
| **Donghun Yu** | KIAC | NO seed | **Korean name correction: 유동헌 (NOT 유동훈).** Verified 투자본부장 appointed **2026-04-01** (deep-tech: 반도체/소부장/차량전장; ex-Kingsley Ventures 전무, SNU M.S.). Candidate `https://www.linkedin.com/in/donghunyu` exists but still shows the *old* Kingsley role and LinkedIn blocks fetch (HTTP 999) → unconfirmed. **Human eyeball before seeding.** (English KIAC page is a stale cache — ignore.) |
| **Sangil Nam** | KIAC | NO seed | Identity verified (**남상일, 수석팀장**, Investment Division) via KIAC's own TEAM page. Only LinkedIn hit is a *different* person (과장 at EUKLID KOREA). No URL to seed. |
| **Seo Ji-young (서지영)** | KIAC? | 🔴 CONFLICT | The only 서지영 found at this org is **사업운영실 대리 (Business Operations), NOT an investor/심사역** — conflicts with the "심사위원" roster label. Common name; a surfaced "Ji Young Seo" LinkedIn is an unrelated Citibank analyst. **Confirm with event organizer which 서지영 / which role before seeding anything.** |

## Demo implication

- **Live cold-run target stays Yeop Lee** (`/in/yeoplee927`) — the 한투 names are higher-risk; use them as **cache** seeds only, and only the 2 verified ones.
- For the 3 TBDs, identity is solid enough that an **unseeded** input should land on `needs_disambiguation` (correct, honest behavior) rather than a wrong resolve — acceptable on stage if we don't pick them.
- If we want a VC live moment for the 40% business angle, **SoonOuk Jung or Dongwon Sung (both KIP, verified)** are the safe picks. Confirm title wording on the slide (Executive Director / Principal-Ellie), not the guessed Korean names.
