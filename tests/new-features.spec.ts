import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test("first workspace shows animated, optional Gemini welcome and honest account setup", async ({
  page,
}) => {
  await page.goto("/projects");
  const welcome = page.getByRole("dialog", {
    name: "A little magic. Entirely yours.",
  });
  await expect(welcome).toBeVisible();
  await expect(welcome).toContainText("Nishant Acharya");
  await expect(welcome).toContainText("A key is not a login password");
  await page
    .getByRole("button", { name: "Create account & connect Gemini" })
    .click();
  await expect(page).toHaveURL(/signup/);
  await expect(
    page.getByRole("button", { name: "Create free account", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".auth-card")).toContainText(
    "Account service is not configured",
  );
  await page.goto("/editor");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Choose a photo" }),
  ).toBeEnabled();
});
test("mobile welcome is keyboard-dismissible, respects reduced motion, and stays inside viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/editor");
  await expect(page.locator(".welcome-dialog")).toBeVisible();
  expect(
    await page
      .locator(".magic-orbit")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
  ).toBeLessThan(0.1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(".welcome-dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Choose a photo" }),
  ).toBeVisible();
});
test("project backups round-trip the original and settings; recipes import and export safely", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("acharya-welcome-v2:guest", "done"),
  );
  await page.goto("/editor");
  await page
    .locator("input[type=file]")
    .setInputFiles("public/images/alpine.jpg");
  await expect(page.getByAltText("Edited photo preview")).toBeVisible();
  await page.getByRole("button", { name: "AI Analysis", exact: true }).click();
  await page
    .getByRole("button", { name: "Auto balance light & color" })
    .click();
  await expect(page.locator(".canvas-bottom")).toContainText("Auto Balance");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  await page.getByRole("link", { name: "Back to projects" }).click();
  const nextBackup = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Back up alpine", exact: true })
    .click();
  const backup = await nextBackup;
  const bytes = await fs.readFile((await backup.path())!);
  expect(bytes.length).toBeGreaterThan(10000);
  await page
    .getByLabel("Restore project backup")
    .setInputFiles({
      name: "saved.acharya",
      mimeType: "application/zip",
      buffer: bytes,
    });
  await expect(page.locator(".project-card")).toHaveCount(2);
  await page
    .getByRole("heading", { name: "alpine — restored", exact: true })
    .click();
  await expect(page.getByAltText("Edited photo preview")).toBeVisible();
  await expect(page.locator(".canvas-bottom")).toContainText("Auto Balance");
  await page.goto("/presets");
  await page
    .getByRole("button", { name: "View Cinematic Greens", exact: true })
    .click();
  const nextRecipe = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download editing recipe" }).click();
  const recipe = await nextRecipe;
  const json = await fs.readFile((await recipe.path())!);
  expect(JSON.parse(json.toString()).format).toBe("acharya-look");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByLabel("Import editing recipe")
    .setInputFiles({
      name: "look.json",
      mimeType: "application/json",
      buffer: json,
    });
  await expect(page.getByRole("dialog")).toContainText("Cinematic Greens");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await expect(page.locator(".preset-card")).toHaveCount(1);
});
