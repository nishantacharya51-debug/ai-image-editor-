import { test, expect } from "@playwright/test";
test.skip(
  process.env.RUN_PAGES_SMOKE !== "1",
  "Requires the GitHub Pages production build served at port 4173.",
);
test("Pages subdirectory build loads all assets, handles deep links and edits a real photo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/ai-image-editor-/");
  await expect(page.locator("h1")).toContainText("Good photos");
  await expect(page.locator(".footer-bottom")).toContainText("Nishant Acharya");
  expect(
    await page
      .locator(".site-header .logo img")
      .evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0),
  ).toBe(true);
  for (const route of [
    "explore",
    "presets",
    "login",
    "signup",
    "account",
    "setup",
    "settings",
    "privacy",
    "terms",
  ]) {
    await page.goto(`/ai-image-editor-/#/${route}`);
    await expect(page.locator("h1")).toBeVisible();
    await page.reload();
    await expect(page.locator("h1")).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ai-image-editor-/#/editor");
  await expect(page.locator(".welcome-dialog")).toBeVisible();
  await page.screenshot({ path: "/home/user/acharya-welcome.png" });
  await page
    .getByRole("button", { name: "Continue with free local tools" })
    .click();
  await page
    .locator("input[type=file]")
    .setInputFiles("public/images/alpine.jpg");
  await expect(page.getByAltText("Edited photo preview")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
