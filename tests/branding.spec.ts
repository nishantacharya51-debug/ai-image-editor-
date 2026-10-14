import { test, expect } from "@playwright/test";

test("Acharya Stdio name and monogram appear across the app without responsive overflow", async ({
  page,
}) => {
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page).toHaveTitle("Acharya Stdio — Your vision. Refined.");
    const logo = page.locator(".site-header .logo");
    await expect(logo).toHaveAccessibleName("Acharya Stdio home");
    await expect(logo).toContainText("ACHARYA");
    await expect(logo).toContainText("STDIO");
    await expect(logo.locator("img")).toHaveAttribute(
      "src",
      "/acharya-mark.svg",
    );
    expect(
      await logo
        .locator("img")
        .evaluate(
          (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
        ),
    ).toBe(true);
    await expect(page.locator(".site-footer .logo")).toHaveAccessibleName(
      "Acharya Stdio home",
    );
    await expect(
      page.getByRole("button", { name: "Is Acharya Stdio really free?" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("body")).not.toContainText(/pixora|picora/i);
  }
  const favicon = await page.request.get("/favicon.svg?v=acharya");
  expect(favicon.ok()).toBe(true);
  expect(await favicon.text()).toContain("Acharya Stdio — enchanted A crest");
  await page.goto("/terms");
  await expect(page.locator(".prose")).toContainText(
    "Acharya Stdio is a local-first photo editor",
  );
  await page.goto("/settings");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/pixora|picora/i);
});

test("editor uses the new mark and export suffix while retaining the existing project database", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(
    page.getByAltText("Acharya Stdio logo", { exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .setInputFiles("public/images/alpine.jpg");
  await expect(page.getByAltText("Edited photo preview")).toBeVisible();
  await page.waitForFunction(
    () => !document.querySelector(".canvas-toolbar .spinner"),
  );
  const databases = await page.evaluate(async () =>
    (await indexedDB.databases()).map((db) => db.name),
  );
  expect(databases).toContain("pixora-studio");
  expect(databases).not.toContain("acharya-stdio");
  const projectURL = page.url();
  await page.reload();
  await expect(page.getByAltText("Edited photo preview")).toBeVisible();
  expect(page.url()).toBe(projectURL);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const nextDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download photo" }).click();
  const downloaded = await nextDownload;
  expect(downloaded.suggestedFilename()).toBe("alpine-acharya-stdio.jpg");
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("acharya-welcome-v2:guest", "done"),
  );
});
