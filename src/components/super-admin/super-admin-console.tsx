"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createPersona, resetPersona, switchToPersona } from "@/app/actions/super-admin";
import { EmptyState } from "@/components/empty-state";
import { OrgUnitPicker } from "@/components/org-unit-picker";
import { ROLE_LEVELS, type OrgUnitNode } from "@/lib/org-units";
import {
  PERSONA_ROLES,
  type PersonaResetResult,
  type PersonaRole,
  type SuperAdminPersona,
} from "@/lib/super-admin/types";

type Props = {
  personas: SuperAdminPersona[];
  /** The super admin's own org unit: personas can be placed there or below. */
  rootOrgUnit: OrgUnitNode;
};

const inputClass = "rounded-md border border-ink/20 bg-canvas px-3 py-2 text-ink";

export function SuperAdminConsole({ personas, rootOrgUnit }: Props) {
  const t = useTranslations("superAdmin");
  const router = useRouter();
  const [role, setRole] = useState<PersonaRole>("bhw");
  const [orgUnit, setOrgUnit] = useState<OrgUnitNode>(rootOrgUnit);
  const placementValid = ROLE_LEVELS[role].includes(orgUnit.level);
  const [fullName, setFullName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setCreating(true);
    try {
      const result = await createPersona({ role, orgUnitId: orgUnit.id, fullName });
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      setFullName("");
      setNotice(t("createdNotice", { username: result.data.username }));
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setCreating(false);
    }
  }

  async function handleSwitch(persona: SuperAdminPersona) {
    setError(null);
    setNotice(null);
    setBusyId(persona.persona_user_id);
    try {
      const result = await switchToPersona(persona.persona_user_id);
      if (!result.ok) {
        setError(t(result.error));
        setBusyId(null);
        return;
      }
      window.location.assign("/home");
    } catch {
      setError(t("genericError"));
      setBusyId(null);
    }
  }

  async function handleReset(persona: SuperAdminPersona) {
    setError(null);
    setNotice(null);
    setBusyId(persona.persona_user_id);
    try {
      const result = await resetPersona(persona.persona_user_id);
      if (!result.ok) {
        setError(t(result.error));
        return;
      }
      setConfirmingId(null);
      setNotice(resetSummary(persona.username, result.data));
      router.refresh();
    } catch {
      setError(t("genericError"));
    } finally {
      setBusyId(null);
    }
  }

  function resetSummary(username: string, r: PersonaResetResult) {
    return t("resetNotice", {
      username,
      courses: r.course_progress_cleared,
      tests: r.test_attempts_cleared,
      assessments: r.assessments_cleared,
      certificates: r.certificates_cleared,
      enrollments: r.enrollments_cleared,
      surveys: r.survey_responses_cleared,
      notifications: r.notifications_cleared,
      released: r.assessments_released,
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{t("heading")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink/70">{t("description")}</p>
      </div>

      {notice ? (
        <div className="flex items-start justify-between gap-4 rounded-md bg-celebration px-4 py-3 text-celebration-ink">
          <p role="status" className="text-sm">
            {notice}
          </p>
          <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-sm font-medium underline">
            {t("dismiss")}
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">{t("personasHeading")}</h2>
        {personas.length === 0 ? (
          <EmptyState message={t("empty")} />
        ) : (
          <ul className="flex flex-col gap-3">
            {personas.map((persona) => {
              const busy = busyId === persona.persona_user_id;
              const confirming = confirmingId === persona.persona_user_id;
              const active = persona.status === "active";
              return (
                <li
                  key={persona.persona_user_id}
                  className="flex flex-col gap-3 rounded-md border border-ink/10 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-ink">
                      {persona.username}{" "}
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/80">
                        {t(`role.${persona.role}`)}
                      </span>
                      {!active ? <span className="ml-2 text-xs text-danger">{t("inactive")}</span> : null}
                    </div>
                    <div className="text-xs text-ink/60">
                      {persona.full_name} · {persona.org_unit_name} ({persona.org_unit_level})
                    </div>
                    <div className="text-xs text-ink/70">
                      {t("stats", {
                        courses: persona.course_progress_count,
                        tests: persona.test_attempt_count,
                        assessments: persona.assessment_count,
                        certificates: persona.certificate_count,
                        surveys: persona.survey_response_count,
                      })}
                      {" · "}
                      {persona.onboarding_completed_at ? t("onboardingDone") : t("onboardingNotDone")}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    {confirming ? (
                      <>
                        <p role="alert" className="max-w-xs text-xs text-danger">
                          {t("resetWarning")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleReset(persona)}
                            className="rounded-md bg-danger px-3 py-1 text-sm font-medium text-canvas disabled:opacity-60"
                          >
                            {busy ? t("resetting") : t("resetConfirmAction")}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmingId(null)}
                            className="rounded-md border border-ink/20 px-3 py-1 text-sm font-medium text-ink"
                          >
                            {t("cancelAction")}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId !== null || !active}
                          onClick={() => handleSwitch(persona)}
                          className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-on-primary disabled:opacity-60"
                        >
                          {busy ? t("switching") : t("switchToAction")}
                        </button>
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => setConfirmingId(persona.persona_user_id)}
                          className="rounded-md border border-ink/20 px-3 py-1 text-sm font-medium text-ink hover:bg-ink/5 disabled:opacity-60"
                        >
                          {t("resetAction")}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">{t("createHeading")}</h2>
        <p className="max-w-3xl text-sm text-ink/70">{t("createDescription")}</p>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("roleLabel")}
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value as PersonaRole);
                setOrgUnit(rootOrgUnit);
              }}
              className={inputClass}
            >
              {PERSONA_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`role.${r}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1 text-sm font-medium text-ink sm:row-span-2">
            {t("orgUnitLabel")}
            <OrgUnitPicker
              key={role}
              root={rootOrgUnit}
              maxLevel={role === "assessor" ? "city_municipal" : "barangay"}
              onChange={setOrgUnit}
            />
            {placementValid ? null : <span className="text-xs font-normal text-danger">{t("placementLevelError")}</span>}
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            {t("fullNameLabel")}
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("fullNamePlaceholder")}
              className={inputClass}
            />
          </label>
          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={creating || !placementValid}
              className="rounded-md bg-primary px-4 py-2 font-medium text-on-primary disabled:opacity-60"
            >
              {creating ? t("creating") : t("createAction")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
