# BHW Connect Phase 2

A web app for Barangay Health Workers (BHWs) in the Philippines. See `docs/` for
the product vision, the increment-by-increment build contract, and the free-AI
leverage plan — start there before touching code.

## Status

**INC-0 — Scaffold & foundations** (see `docs/delivery-plan.md` §7). Next.js +
TypeScript app, design tokens, i18n skeleton, base layout shell, Supabase
client wiring, and CI. No feature UI yet.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase project values when available
npm run dev
```

The app runs without Supabase credentials configured — auth wiring lands in
INC-1.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` / `npm run test:watch` | Vitest unit tests |
| `npm run e2e` | Playwright E2E (builds and serves automatically) |
| `npx lhci autorun` | Performance budget check (needs a running build; see `lighthouserc.js`) |

## Design tokens

`src/styles/tokens.css` is the single source of truth for color — no other
file should contain a hex value. Tailwind consumes it via `@theme` in
`src/app/globals.css`.

## i18n

UI strings live in `messages/fil.json` and `messages/en.json` (Filipino is the
default locale). The language toggle in the header sets a `BHW_LOCALE` cookie
read by `src/i18n/request.ts`.
