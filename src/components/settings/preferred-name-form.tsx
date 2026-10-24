"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function PreferredNameForm({ initialName, loadFailed = false }: { initialName: string | null; loadFailed?: boolean }) {
  const t = useTranslations("greetingName");
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || loadFailed) return;
    const value = name.trim();
    setError(null); setSaved(false);
    if ([...value].length > 80 || [...value].some(char => char.codePointAt(0)! < 32 || char.codePointAt(0) === 127)) { setError(t("invalid")); return; }
    setPending(true);
    try {
      const result = await createClient().rpc("rpc_set_my_greeting_name", { p_preferred_name: value || null });
      if (result.error || (result.data !== null && typeof result.data !== "string")) {
        setError(t(result.error?.code === "22023" ? "invalid" : "saveError")); return;
      }
      setName(result.data ?? ""); setSaved(true); router.refresh();
    } catch { setError(t("saveError")); }
    finally { setPending(false); }
  }

  return <section aria-labelledby="greeting-name-heading" className="min-w-0 space-y-3 rounded-lg border border-ink/20 p-4 sm:p-5">
    <h2 id="greeting-name-heading" className="text-lg font-semibold">{t("heading")}</h2>
    <p id="greeting-name-help" className="text-sm text-ink/80">{t("help")}</p>
    {loadFailed && <div role="alert" className="space-y-2">
      <p>{t("loadError")}</p>
      <button type="button" onClick={() => router.refresh()} className="min-h-11 underline">{t("reload")}</button>
    </div>}
    <form onSubmit={save} className="space-y-3">
      <label htmlFor="greeting-name" className="block font-medium">{t("label")}</label>
      <input id="greeting-name" name="preferred_name" autoComplete="nickname" type="text" maxLength={80}
        value={name} disabled={pending || loadFailed} aria-describedby="greeting-name-help" aria-invalid={Boolean(error)}
        onChange={event => { setName(event.target.value); setSaved(false); setError(null); }}
        className="min-h-11 w-full rounded-md border border-ink/25 bg-canvas px-3 py-2 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60" />
      <button type="submit" disabled={pending || loadFailed}
        className="min-h-11 rounded-md bg-primary px-4 py-2 font-medium text-on-primary disabled:opacity-60">{t(pending ? "saving" : "save")}</button>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">{t("saved")}</p>}
    </form>
    <Link prefetch={false} href="/home" className="inline-flex min-h-11 items-center underline">{t("viewHome")}</Link>
  </section>;
}
