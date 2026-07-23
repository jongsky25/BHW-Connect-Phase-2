# Mockups

Visual, click-through prototypes for stakeholder presentations. These are
standalone HTML files — **not** part of the Next.js app. Open them directly in a
browser, or view the hosted Artifact link.

## `ttcf-demo.html` — Chat Guide + Training walkthrough

A guided, clickable prototype that walks an audience through what BHW Connect can
do, using the **Timed & Targeted Care for Families (ttCF)** program in Eastern
Visayas as the sample scenario (12 structured home visits across the first 1,000
days of a child's life).

**How to view**

- Open `mockups/ttcf-demo.html` in any modern browser, or
- Use the hosted Artifact link (added to the PR description).

**Controls**

- **Next / Back** (or ← → arrow keys) and the dot strip to move between scenes.
- **Wika / Language** toggle — the whole demo switches Filipino ⇄ English live.
- **App theme** toggle — flips the *in-app screens* between light and dark mode
  (a real product feature), while the presentation stage stays constant.

**What it shows**

1. **Chat Guide** (live in Phase 1) — a BHW asks ttCF questions in Taglish and
   gets Knowledge-Base answers, with typo/code-switch tolerance and a graceful
   "no answer yet" fallback.
2. **Gap-detection loop** (live) — the unanswered question surfaces in the admin
   gap-triage queue → "Create KB entry from this" → publish → the same question
   is now answered. The system learns from what BHWs ask.
3. **Training + certification** (roadmap concept) — a ttCF e-learning course
   mapped to the 12 home visits, a quiz, an assessor grading an in-person skills
   demo, and a QR-verified certificate.

Scenes are tagged **LIVE** (built in Phase 1) or **ROADMAP** (concept) so an
internal audience can tell what ships today from what's envisioned.

**Design fidelity** — the in-frame screens mirror the shipped app's design tokens
(`src/styles/tokens.css`), Chat Guide markup, admin dashboard, and bilingual copy
(`messages/{fil,en}.json`), so the mockup looks like the real product.

> **Sample content notice:** ttCF health specifics (visit schedule, Q&A, quiz,
> skills checklist) are realistic *sample* content for demonstration — not sourced
> from an authoritative DOH / World Vision protocol. Verify exact figures before
> any external showing.

**Self-contained** — no external requests (CSP-safe): all CSS/JS inline, no fonts
or scripts fetched from a CDN.
