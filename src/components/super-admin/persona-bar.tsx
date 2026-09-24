"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { returnToSuperAdmin, switchToPersona } from "@/app/actions/super-admin";
import type { PersonaSnapshot } from "@/lib/super-admin/types";

type Props = {
  currentUserId: string;
  snapshot: PersonaSnapshot;
};

// Shown on every page while the super admin is signed in as one of their
// test personas: who they are right now, a one-step switch to another
// persona, and the way back.
export function PersonaBar({ currentUserId, snapshot }: Props) {
  const t = useTranslations("superAdmin");
  const current = snapshot.personas.find((p) => p.id === currentUserId);
  const others = snapshot.personas.filter((p) => p.id !== currentUserId);
  const [target, setTarget] = useState(others[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => ReturnType<typeof returnToSuperAdmin>, destination: string) {
    setError(null);
    setPending(true);
    try {
      const result = await action();
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      // Full reload: every server-rendered page and cached route belongs to
      // the previous identity.
      window.location.assign(destination);
    } catch {
      setError(t("genericError"));
    } finally {
      setPending(false);
    }
  }

  if (!current) return null;

  return (
    <div role="region" aria-label={t("barLabel")} className="border-b border-warning/40 bg-warning/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
        <p className="text-ink">
          {t("barSignedInAs", { username: current.username, role: t(`role.${current.role}`) })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {others.length > 0 ? (
            <>
              <label htmlFor="persona-bar-target" className="sr-only">
                {t("switchToLabel")}
              </label>
              <select
                id="persona-bar-target"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                disabled={pending}
                className="rounded-md border border-ink/20 bg-canvas px-2 py-1 text-sm text-ink"
              >
                {others.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.username} ({t(`role.${p.role}`)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || !target}
                onClick={() => run(() => switchToPersona(target), "/home")}
                className="rounded-md border border-ink/20 px-3 py-1 font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
              >
                {t("switchAction")}
              </button>
            </>
          ) : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(returnToSuperAdmin, "/super-admin")}
            className="rounded-md bg-primary px-3 py-1 font-medium text-on-primary disabled:opacity-60"
          >
            {t("returnAction", { username: snapshot.owner })}
          </button>
        </div>
        {error ? (
          <p role="alert" className="w-full text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
