# Gabay sa PhilHealth P3 — embedded flipchart review packet

This PR adds three charts and nine illustrated patient cards from the approved P1 storyboard. Each card has a Filipino and English caption, descriptive image text, separate bilingual BHW notes, claim IDs, and links to the PhilHealth sources recorded in P1. The illustrations are original, text-free SVGs generated from `scripts/gabay-illustrations.mjs`.

## Review and access

- The versioned source is `src/lib/flipcharts/gabay-charts.ts`. Every chart has `review: "draft"` and `reviewedAt: null`.
- Admins can open `/admin/gabay-flipcharts` even while the general flipchart feature is off, preview all pages, and compare the BHW notes to the patient view. The route and preview require an authenticated admin.
- BHWs cannot open a Gabay chart while its review state is draft. The main flipchart list and Gabay course show links only after the chart is marked approved and the flipchart feature flag is on. This PR does not approve any chart or change a feature flag.
- Before any approval change, the admin should check wording and images, recheck the high-change PhilHealth claims and current official provider/channel pages, set a content review date, and request PhilHealth review when available. Approval and release need a separate reviewed change.

## Field use

The reader starts with a patient card. The BHW switches to private speaker notes and back, chooses Filipino or English, and moves through three pages. Source links and the review label appear only with BHW notes. The registration chart directs detailed membership application and record correction to an official PhilHealth channel; the BHW does not collect a password or one-time code.

“Prepare for visit” explicitly caches the current chart page and all three illustrations in the existing PWA cache. The existing service worker caches visited Next.js assets and serves cached navigation when the network fails. The reader reports success only after the chart and illustrations save. Signed-out devices clear the same cache through the existing sign-out flow. Source links and live details such as clinic accreditation or medicine stock require a current online check.

## Verification

`npm run typecheck`, targeted ESLint, and the two Gabay flipchart tests check structure, artwork presence, source traceability, view separation, language switching, and page navigation. This PR does not run a loader or write to Supabase.
