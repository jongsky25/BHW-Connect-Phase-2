import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { STABLE_ADMIN, STABLE_BHW, getAccessToken, restGet } from "./fixtures/auth";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TINY_PNG = path.join(__dirname, "fixtures", "tiny.png");

test("admin authors a bilingual Q&A entry with an image, publish is blocked without an owner, and it stays hidden from BHWs until published", async ({
  page,
  request,
}) => {
  const marker = `e2e.kb.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/admin/kb/entries/new");

  await page.getByLabel("Tanong (Filipino)").fill(`Ilang beses dapat magpa-checkup? ${marker}`);
  await page.getByLabel("Tanong (English)").fill(`How many checkups are needed? ${marker}`);
  await page.getByLabel("Sagot (Filipino)").fill("Hindi bababa sa apat na beses.");
  await page.getByLabel("Sagot (English)").fill("At least four times.");
  await page.getByLabel("Mga Keyword").fill("checkup, prenatal");

  // Publishing without an owner must be blocked (DoD).
  await page.getByRole("button", { name: "Ilathala" }).click();
  await expect(page.locator('p[role="alert"]')).toHaveText(
    "Kailangan ng may-ari bago mailathala ang entry na ito.",
  );
  await expect(page).toHaveURL("/admin/kb/entries/new");

  await page.getByLabel("May-ari").selectOption({ index: 1 });

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(TINY_PNG);
  await expect(page.getByRole("img", { name: "" })).toBeVisible({ timeout: 15_000 });

  const [createResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("rpc_kb_entry_create")),
    page.getByRole("button", { name: "Ilathala" }).click(),
  ]);
  const createBody = (await createResponse.json()) as Array<{ entry_id: string }>;
  const entryId = createBody[0]?.entry_id;
  expect(entryId).toBeTruthy();

  await expect(page).toHaveURL("/admin/kb/entries", { timeout: 10_000 });
  const row = page.getByRole("row", { name: new RegExp(marker) });
  await expect(row).toBeVisible();
  await expect(row.getByText("Nailathala")).toBeVisible();

  // A published entry is now readable by a BHW (RLS: status = 'published').
  const bhwToken = await getAccessToken(request, STABLE_BHW.username, STABLE_BHW.password);
  const publishedRows = await restGet(request, bhwToken, `kb_entries?id=eq.${entryId}`);
  expect(publishedRows).toHaveLength(1);

  // Unpublishing (draft) makes it invisible to BHWs again.
  await row.getByRole("link", { name: "I-edit" }).click();
  await expect(page).toHaveURL(`/admin/kb/entries/${entryId}`);
  await page.getByRole("button", { name: "I-save bilang Draft" }).click();
  await expect(page).toHaveURL("/admin/kb/entries", { timeout: 10_000 });

  const draftRows = await restGet(request, bhwToken, `kb_entries?id=eq.${entryId}`);
  expect(draftRows).toHaveLength(0);
});
