import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EntryForm } from "@/components/kb/entry-form";
import { getFeatureFlags } from "@/lib/flags/get-flags";
import type { KbEntry } from "@/lib/kb/types";
import { createClient } from "@/lib/supabase/server";

const BASE_COLUMNS =
  "id, category_id, question_fil, question_en, answer_fil, answer_en, keywords, image_url, status, owner_user_id, review_due_on, updated_at";

export default async function EditKbEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Same reasoning as the content_id select in /api/chat (INC-17b): asking
  // PostgREST for a column that does not exist is a hard error, so an
  // unconditional select would turn "migration not yet applied on this
  // project" into a 500 on the KB editor. The flag is off until the migration
  // lands, so gating on it makes the two impossible to get out of step.
  //
  // With the flag off an already-AI-drafted entry loses its review banner and
  // its confirm control — but rpc_kb_entry_update still refuses to publish it,
  // and mapKbRpcError turns that refusal into a plain explanation. Retiring
  // the feature must not turn an unreviewed AI draft into a publishable one.
  const flags = await getFeatureFlags(supabase);
  const entryColumns = flags.ai_gap_draft
    ? `${BASE_COLUMNS}, ai_drafted_at, ai_draft_confirmed_at`
    : BASE_COLUMNS;

  const [{ data: entry }, { data: categories }, { data: owners }] = await Promise.all([
    supabase.from("kb_entries").select(entryColumns).eq("id", id).maybeSingle(),
    supabase.from("kb_categories").select("id, name_fil, name_en, slug, sort_order").order("sort_order"),
    supabase.from("users").select("id, full_name, username").eq("role", "admin").order("full_name"),
  ]);

  if (!entry) {
    notFound();
  }

  // The select string is computed, so postgrest-js cannot infer the row shape
  // from it and falls back to a ParserError. Same cast the chat route uses for
  // its own flag-gated column list; there is no generated Database type in this
  // repo, so row shapes are hand-written per call site regardless.
  const kbEntry = entry as unknown as KbEntry;

  const t = await getTranslations("admin.kbEntries");
  const tCrumbs = await getTranslations("breadcrumbs");

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: tCrumbs("home"), href: "/home" },
          { label: t("heading"), href: "/admin/kb/entries" },
          { label: kbEntry.question_en },
        ]}
      />
      <EntryForm mode="edit" entry={kbEntry} categories={categories ?? []} owners={owners ?? []} />
    </div>
  );
}
