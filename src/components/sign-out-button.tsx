import { useTranslations } from "next-intl";
import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton() {
  const t = useTranslations("common");

  return (
    <form action={signOutAction}>
      <button type="submit" className="text-sm text-ink/70 hover:text-ink hover:underline">
        {t("signOut")}
      </button>
    </form>
  );
}
