import { expect, test, type Page } from "@playwright/test";
import { STABLE_ADMIN, STABLE_BHW } from "./fixtures/auth";

test("home page renders the foundation shell in Filipino by default", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "fil");
  await expect(page.getByRole("heading", { name: "Maligayang pagdating sa BHW Connect" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Patakaran sa Privacy" })).toBeVisible();
});

test("language toggle switches the sample string to English", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "English" }).click();

  await expect(page.getByRole("heading", { name: "Welcome to BHW Connect" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("privacy link navigates to the privacy placeholder page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Patakaran sa Privacy" }).click();

  await expect(page).toHaveURL("/privacy");
  await expect(page.getByRole("heading", { name: "Patakaran sa Privacy" })).toBeVisible();
});

test("the header app name stays on the public landing page for a signed-out visitor", async ({ page }) => {
  await page.goto("/privacy");

  await page.getByRole("link", { name: "BHW Connect" }).click();

  await expect(page).toHaveURL("/");
});

test("a signed-in BHW's header app name goes to /home, not the public landing page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/settings");
  await page.getByRole("link", { name: "BHW Connect" }).click();

  await expect(page).toHaveURL("/home");
});

test("signing out from the header's user menu on a non-home page lands on /login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/settings");
  await page.getByRole("button", { name: /^Naka-login bilang/ }).click();
  await page.getByRole("button", { name: "Mag-sign out" }).click();

  await expect(page).toHaveURL("/login", { timeout: 10_000 });
});

// The header's two groups (app name / menu on the left, language toggle or
// bell + avatar on the right) share one row, and the app name is one line.
// Either wrapping is what made the header grow at 320px.
async function expectSingleRowHeader(page: Page, who: string) {
  const layout = await page.evaluate(() => {
    const row = document.querySelector("header > div")!;
    const [left, right] = Array.from(row.children).map((el) => el.getBoundingClientRect());
    const name = row.querySelector(":scope > div > a")!.getBoundingClientRect();
    return {
      centerGap: Math.abs(left.top + left.height / 2 - (right.top + right.height / 2)),
      nameHeight: name.height,
      nameLineHeight: parseFloat(getComputedStyle(row.querySelector(":scope > div > a")!).lineHeight),
    };
  });
  expect(layout.centerGap, `${who}: header groups wrapped onto separate rows`).toBeLessThan(2);
  expect(layout.nameHeight, `${who}: app name wrapped onto two lines`).toBeLessThanOrEqual(layout.nameLineHeight + 1);
}

test("the header stays a single row at a 320px viewport, for a visitor and every role", async ({ page, browser }) => {
  await page.setViewportSize({ width: 320, height: 640 });

  await page.goto("/");
  await expectSingleRowHeader(page, "visitor (fil)");

  // English's "Language" label is longer than "Wika".
  const enContext = await browser.newContext({ viewport: { width: 320, height: 640 } });
  await enContext.addCookies([{ name: "BHW_LOCALE", value: "en", url: new URL(page.url()).origin }]);
  const enPage = await enContext.newPage();
  await enPage.goto("/");
  await expect(enPage.locator("html")).toHaveAttribute("lang", "en");
  await expectSingleRowHeader(enPage, "visitor (en)");
  await enContext.close();

  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });
  await expectSingleRowHeader(page, "bhw");
  const bhwHeight = await page.locator("header").boundingBox().then((box) => box?.height);

  // /home has its own inline sign-out action too, so go to a page without
  // one first to keep the header's "Mag-sign out" unambiguous.
  await page.goto("/settings");
  await page.getByRole("button", { name: /^Naka-login bilang/ }).click();
  await page.getByRole("button", { name: "Mag-sign out" }).click();
  await expect(page).toHaveURL("/login", { timeout: 10_000 });

  await page.getByLabel("Username").fill(STABLE_ADMIN.username);
  await page.getByLabel("Password").fill(STABLE_ADMIN.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });
  await expectSingleRowHeader(page, "admin");
  const adminHeight = await page.locator("header").boundingBox().then((box) => box?.height);

  expect(adminHeight).toBe(bhwHeight);
});

test("breadcrumbs let a signed-in BHW navigate back up from a nested page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(STABLE_BHW.username);
  await page.getByLabel("Password").fill(STABLE_BHW.password);
  await page.getByRole("button", { name: "Mag-login" }).click();
  await expect(page).toHaveURL("/home", { timeout: 10_000 });

  await page.goto("/kb");
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb).toBeVisible();

  await breadcrumb.getByRole("link", { name: "← Home" }).click();

  await expect(page).toHaveURL("/home");
});
