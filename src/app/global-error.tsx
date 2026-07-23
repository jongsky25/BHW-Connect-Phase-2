"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Only fires when the root layout itself throws, so it can't rely on
// next-intl's provider (that's part of the layout that just crashed) —
// plain hardcoded bilingual text instead of a translation lookup.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", fontFamily: "sans-serif", textAlign: "center", padding: "1rem" }}>
        <h1>Something went wrong / May naganap na problema</h1>
        <p>Please try again. / Pakisubukan muli.</p>
        <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0.5rem 1rem", borderRadius: 6 }}>
          Try again / Subukan muli
        </button>
      </body>
    </html>
  );
}
