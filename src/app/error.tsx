"use client";

import * as Sentry from "@sentry/nextjs";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errorBoundary");

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
      <p className="text-ink/70">{t("body")}</p>
      <button
        type="button"
        onClick={reset}
        className="min-h-[44px] rounded-md bg-primary px-4 py-2 text-sm font-medium text-canvas"
      >
        {t("retryAction")}
      </button>
    </div>
  );
}
