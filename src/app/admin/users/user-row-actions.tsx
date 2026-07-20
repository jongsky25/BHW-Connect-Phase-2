"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetPassword, setStatus, type SimpleActionState } from "./actions";

const initialState: SimpleActionState = {};

function ActionButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm text-secondary hover:underline disabled:opacity-60"
    >
      {label}
    </button>
  );
}

export function UserRowActions({
  userId,
  status,
}: {
  userId: string;
  status: "invited" | "active" | "deactivated";
}) {
  const t = useTranslations("admin");
  const [resetState, resetAction] = useActionState(resetPassword, initialState);
  const [statusState, statusAction] = useActionState(setStatus, initialState);
  const nextStatus = status === "active" ? "deactivated" : "active";

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-3">
        <form action={resetAction}>
          <input type="hidden" name="userId" value={userId} />
          <ActionButton label={t("resetPassword")} />
        </form>
        <form
          action={statusAction}
          onSubmit={(event) => {
            if (nextStatus === "deactivated" && !window.confirm(t("confirmDeactivate"))) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="status" value={nextStatus} />
          <ActionButton label={nextStatus === "deactivated" ? t("deactivate") : t("reactivate")} />
        </form>
      </div>
      {resetState.tempPassword ? (
        <p className="rounded bg-celebration px-2 py-1 text-xs font-medium text-celebration-ink">
          {t("tempPasswordLabel")}: {resetState.tempPassword}
        </p>
      ) : null}
      {resetState.error ? <p className="text-xs text-danger">{t(`errors.${resetState.error}`)}</p> : null}
      {statusState.error ? <p className="text-xs text-danger">{t(`errors.${statusState.error}`)}</p> : null}
    </div>
  );
}
