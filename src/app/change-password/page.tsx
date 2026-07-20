import { useTranslations } from "next-intl";
import { ChangePasswordForm } from "./change-password-form";

export default function ChangePasswordPage() {
  const t = useTranslations("changePassword");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-16 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="text-ink/70">{t("body")}</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
