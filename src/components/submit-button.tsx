"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingChildren,
}: {
  children: ReactNode;
  pendingChildren: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-primary px-5 py-3 text-base font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? pendingChildren : children}
    </button>
  );
}
