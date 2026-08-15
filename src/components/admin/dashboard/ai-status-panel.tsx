import { getTranslations } from "next-intl/server";
import { providerCeilings } from "@/lib/ai/config";
import { getGeminiApiKey } from "@/lib/ai/env";
import type { ProviderId } from "@/lib/ai/types";
import { createClient } from "@/lib/supabase/server";

type UsageRow = {
  provider: string;
  used_today: number;
  used_this_week: number;
  paused_until: string | null;
  paused_reason: string | null;
};

// free-ai-leverage-plan.md §2 requires the breaker state to be admin-visible.
// Usage comes from the RPC (ai_usage has no RLS policies by design); ceilings
// come from src/lib/ai/config.ts, so the panel and the guard can never
// disagree about what the limit is. Whether a key is configured is read here
// rather than stored, because "unconfigured" is a supported state and there is
// nothing in the database to record it.
export async function AiStatusPanel() {
  const supabase = await createClient();
  const t = await getTranslations("admin.dashboard.ai");

  // The house convention for a `returns table(...)` RPC: call it plainly and
  // cast, the same way the chat-guide dashboard consumes its dashboard RPCs.
  // There is no generated Database type in this repo, so row shapes are
  // hand-written per call site.
  const { data } = await supabase.rpc("rpc_ai_usage_summary");
  const rows = (data ?? []) as UsageRow[];

  const keyConfigured: Record<ProviderId, boolean> = {
    gemini: getGeminiApiKey() !== null,
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{t("heading")}</h2>
      <p className="text-sm text-ink/70">{t("intro")}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const ceilings = providerCeilings[row.provider as ProviderId];
          const paused = row.paused_until !== null && new Date(row.paused_until) > new Date();
          const configured = keyConfigured[row.provider as ProviderId] ?? false;

          return (
            <div key={row.provider} className="flex flex-col gap-1 rounded-md border border-ink/10 p-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink/70">
                {row.provider}
              </span>
              <span className="text-2xl font-semibold tracking-tight text-ink">
                {t("usedOfCeiling", {
                  used: row.used_today,
                  ceiling: ceilings?.perDay ?? 0,
                })}
              </span>
              <span className="text-sm text-ink/70">
                {t("usedThisWeek", {
                  used: row.used_this_week,
                  ceiling: ceilings?.perWeek ?? 0,
                })}
              </span>
              {paused ? (
                <span role="alert" className="text-sm font-medium text-danger">
                  {t("paused")}
                </span>
              ) : null}
              {!configured ? <span className="text-sm text-ink/70">{t("noKey")}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
