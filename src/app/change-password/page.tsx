import { useTranslations } from "next-intl";
import { ChangePasswordForm } from "./change-password-form";

export default function ChangePasswordPage() {
  const t = useTranslations("changePassword");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t("heading")}
        </h1>
        <p className="max-w-sm text-lg text-ink/70">{t("subheading")}</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
