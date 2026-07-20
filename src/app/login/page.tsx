import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ timeout?: string }>;
}) {
  const t = await getTranslations("login");
  const { timeout } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="max-w-sm text-lg text-ink/70">{t("subheading")}</p>
      </div>
      <LoginForm timedOut={timeout === "1"} />
    </div>
  );
}
