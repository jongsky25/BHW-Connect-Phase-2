"use client";

import { createContext, useContext, type ReactNode } from "react";

// RFT B2 (docs/role-feature-toggles-plan.md §6 B2): whether the current
// request is an admin previewing another user type. Fed once from the
// `x-app-preview` header forwarded by middleware (src/app/layout.tsx), so
// every write action anywhere in the tree can disable itself without its
// own header read.
const PreviewContext = createContext(false);

export function PreviewProvider({ isPreview, children }: { isPreview: boolean; children: ReactNode }) {
  return <PreviewContext.Provider value={isPreview}>{children}</PreviewContext.Provider>;
}

export function usePreview(): boolean {
  return useContext(PreviewContext);
}
