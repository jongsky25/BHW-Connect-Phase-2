import { useTranslations } from "next-intl";
import { LoginForm } from "@/components/login-form";

type Reason = "idle_timeout" | "deactivated";

function isReason(value: string | undefined): value is Reason {
  return value === "idle_timeout" || value === "deactivated";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 sm:px-6">
      <LoginPageBody reason={isReason(reason) ? reason : undefined} />
    </div>
  );
}

function LoginPageBody({ reason }: { reason?: Reason }) {
  const t = useTranslations("login");

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
      {reason && (
        <p className="w-full max-w-sm rounded-lg bg-info/10 px-4 py-3 text-sm text-ink">
          {t(reason === "idle_timeout" ? "reasonIdleTimeout" : "reasonDeactivated")}
        </p>
      )}
      <LoginForm />
    </>
  );
}
