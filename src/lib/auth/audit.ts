import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

// Fixed Phase 1 taxonomy (delivery-plan.md §5.6) — only the events this
// increment produces. The rest of the list (user.created, kb.*, gap.*, ...)
// gets written starting with the increments that produce them.
export type AuditEventType =
  | "auth.login"
  | "auth.login_failed"
  | "auth.lockout"
  | "user.consent_given";

interface RecordAuditEventInput {
  actorUserId: string | null;
  eventType: AuditEventType;
  metadata?: Record<string, unknown>;
  plainSummaryFil: string;
  plainSummaryEn: string;
}

export async function recordAuditEvent(input: RecordAuditEventInput): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("audit_events").insert({
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
    plain_summary_fil: input.plainSummaryFil,
    plain_summary_en: input.plainSummaryEn,
  });

  if (error) {
    console.error("Failed to record audit event", input.eventType, error);
  }
}
