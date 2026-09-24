import { expect, test, type APIRequestContext } from "@playwright/test";
import {
  BARANGAY_BATONG_MALAKE_ID,
  STABLE_ADMIN,
  createThrowawayBhw,
  getAccessToken,
  onboardThroughLogin,
  restGet,
} from "./fixtures/auth";

const NEW_PASSWORD = "Fresh-Onboarding-2026";

type UserProgressRow = {
  onboarding_progress: Record<string, boolean>;
  onboarding_completed_at: string | null;
};

async function fetchProgress(request: APIRequestContext, token: string, username: string) {
  const [row] = (await restGet(
    request,
    token,
    `users?username=eq.${username}&select=onboarding_progress,onboarding_completed_at`,
  )) as UserProgressRow[];
  return row;
}

// INC-7 DoD: the checklist (set language -> try the Chat Guide -> visit a
// KB category) completes and never reappears.
test("a newly provisioned BHW sees the onboarding checklist and it disappears once every step is done", async ({
  page,
  request,
}) => {
  const adminToken = await getAccessToken(request, STABLE_ADMIN.username, STABLE_ADMIN.password);
  const fresh = await createThrowawayBhw(request, adminToken, BARANGAY_BATONG_MALAKE_ID);

  await onboardThroughLogin(page, fresh.username, fresh.tempPassword, NEW_PASSWORD);

  await expect(page.getByText("Magsimula sa BHW Connect")).toBeVisible();
  await expect(page.getByRole("link", { name: "Itakda ang iyong wika" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Subukan ang Chat Guide" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tingnan ang isang kategorya sa Knowledge Base" })).toBeVisible();

  const userToken = await getAccessToken(request, fresh.username, NEW_PASSWORD);
  let progress = await fetchProgress(request, userToken, fresh.username);
  expect(progress.onboarding_progress).toEqual({});
  expect(progress.onboarding_completed_at).toBeNull();

  // Step 1: set language, via the Settings screen.
  await page.getByRole("link", { name: "Itakda ang iyong wika" }).click();
  await expect(page).toHaveURL("/settings");
  await page.getByRole("button", { name: "I-save ang mga setting" }).click();
  await expect(
    page.getByText(/Na-save na ang iyong mga setting\.|Your settings have been saved\./),
  ).toBeVisible({ timeout: 10_000 });

  progress = await fetchProgress(request, userToken, fresh.username);
  expect(progress.onboarding_progress.language).toBe(true);
  expect(progress.onboarding_completed_at).toBeNull();

  // Step 2: try the Chat Guide, via any question.
  await page.goto("/chat");
  const input = page.getByLabel(/Ang iyong tanong|Your question/);
  await input.fill("test onboarding question");
  await Promise.all([page.waitForResponse((r) => r.url().includes("/api/chat")), input.press("Enter")]);

  // /api/chat records the onboarding step in after(), i.e. once the
  // response has already been sent, so wait for the write to land rather
  // than reading once the instant the response arrives.
  await expect
    .poll(async () => (await fetchProgress(request, userToken, fresh.username)).onboarding_progress.chat, { timeout: 10_000 })
    .toBe(true);
  progress = await fetchProgress(request, userToken, fresh.username);
  expect(progress.onboarding_completed_at).toBeNull();

  // Step 3: visit a KB category with real published content.
  await page.goto("/kb/mch");
  await expect(
    page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: /Knowledge Base/ }),
  ).toBeVisible();

  progress = await fetchProgress(request, userToken, fresh.username);
  expect(progress.onboarding_progress.kb).toBe(true);
  expect(progress.onboarding_completed_at).not.toBeNull();

  // The checklist must not reappear on /home, including after a reload.
  await page.goto("/home");
  await expect(page.getByText("Magsimula sa BHW Connect")).not.toBeVisible();
  await page.reload();
  await expect(page.getByText("Magsimula sa BHW Connect")).not.toBeVisible();
});
