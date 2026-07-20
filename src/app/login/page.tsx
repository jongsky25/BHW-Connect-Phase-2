import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { reason } = await searchParams;
  const t = await getTranslations("login");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="text-ink/70">{t("body")}</p>
      </div>
      {reason === "timeout" && (
        <p className="rounded-md border border-info/30 bg-info/10 px-4 py-3 text-sm text-ink">
          {t("reasonTimeout")}
        </p>
      )}
      {reason === "deactivated" && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-ink">
          {t("reasonDeactivated")}
        </p>
      )}
      <LoginForm />
    </div>
  );
}
