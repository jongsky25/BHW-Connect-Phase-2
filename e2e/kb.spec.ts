import { existsSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const hasSupabaseConfig = existsSync(path.join(process.cwd(), ".env.local"));

test.describe("INC-3 KB authoring (live fixture: admin.stable)", () => {
  test.skip(!hasSupabaseConfig, "requires a linked Supabase project (.env.local)");

  test("admin authors and publishes a bilingual entry with an image; unpublished entries stay invisible to a BHW; publish without an owner is blocked", async ({
    page,
  }) => {
    const question = `E2E question ${Date.now()}`;

    await page.goto("/login");
    await page.locator('input[name="username"]').fill("admin.stable");
    await page.locator('input[name="password"]').fill("StableAdmin123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL("/");

    await page.goto("/admin/kb/entries");

    await page.locator('input[name="questionFil"]').fill(question);
    await page.locator('input[name="questionEn"]').fill(`${question} (EN)`);
    await page.locator('textarea[name="answerFil"]').fill("Sagot sa Filipino.");
    await page.locator('textarea[name="answerEn"]').fill("Answer in English.");
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(process.cwd(), "e2e", "fixtures", "test-image.png"));
    await expect(page.locator("img[alt='']")).toBeVisible();

    await page.getByRole("button", { name: "Ilathala" }).click();

    const row = page.locator("tr", { hasText: question });
    await expect(row).toBeVisible();
    await expect(row.getByText("Nailathala")).toBeVisible();

    // There's no BHW-facing KB browse UI yet (that lands in INC-5/INC-6), so
    // the "invisible to a BHW" and "publish without an owner is blocked"
    // guards are verified at the data layer directly.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    await supabase.auth.signInWithPassword({
      email: "admin.stable@bhw.local",
      password: "StableAdmin123",
    });
    const { data: categories } = await supabase.from("kb_categories").select("id").limit(1);
    const categoryId = categories?.[0]?.id;

    const { error: publishWithoutOwnerError } = await supabase.from("kb_entries").insert({
      category_id: categoryId,
      question_fil: `no-owner-${Date.now()}`,
      question_en: "no owner",
      answer_fil: "x",
      answer_en: "x",
      status: "published",
    });
    expect(publishWithoutOwnerError).not.toBeNull();

    const { data: draftEntry } = await supabase
      .from("kb_entries")
      .insert({
        category_id: categoryId,
        question_fil: `draft-${Date.now()}`,
        question_en: "draft",
        answer_fil: "x",
        answer_en: "x",
        status: "draft",
      })
      .select("id")
      .single();
    await supabase.auth.signOut();

    await supabase.auth.signInWithPassword({
      email: "bhw.stable@bhw.local",
      password: "StablePilot123",
    });
    const { data: visibleToBhw } = await supabase
      .from("kb_entries")
      .select("id")
      .eq("id", draftEntry?.id);
    expect(visibleToBhw).toEqual([]);
    await supabase.auth.signOut();
  });
});
