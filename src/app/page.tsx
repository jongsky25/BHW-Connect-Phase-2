import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("home");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {t("heading")}
      </h1>
      <p className="max-w-xl text-lg text-ink/70">{t("body")}</p>
      <a
        href="/login"
        className="rounded-md bg-primary px-4 py-2 font-medium text-canvas"
      >
        {t("loginCta")}
      </a>
    </div>
  );
}
