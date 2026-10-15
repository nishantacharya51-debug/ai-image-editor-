import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs/promises";
async function openPhoto(page: Page) {
  await page.goto("/editor");
  await page
    .locator("input[type=file]")
    .setInputFiles("public/images/alpine.jpg");
  await expect(page.locator('img[alt="Edited photo preview"]')).toBeVisible({
    timeout: 20000,
  });
  await page.waitForFunction(
    () => !document.querySelector(".canvas-toolbar .spinner"),
  );
}
async function ready(page: Page) {
  await page.waitForTimeout(180);
  await page.waitForFunction(
    () => !document.querySelector(".canvas-toolbar .spinner"),
  );
}
async function hash(page: Page) {
  await ready(page);
  return page
    .locator('img[alt="Edited photo preview"]')
    .evaluate(async (image: HTMLImageElement) => {
      await image.decode();
      const c = document.createElement("canvas");
      c.width = 60;
      c.height = 40;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(image, 0, 0, 60, 40);
      return c.toDataURL();
    });
}
async function reset(page: Page) {
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Reset all edits" }).click();
  await ready(page);
}
test("all public routes render their own content and fit desktop, tablet, mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const paths = [
    "/",
    "/editor",
    "/explore",
    "/presets",
    "/projects",
    "/history",
    "/compare",
    "/pricing",
    "/settings",
    "/help",
    "/privacy",
    "/terms",
    "/404",
    "/not-real",
  ];
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of paths) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("body")).not.toBeEmpty();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${path} at ${width}px overflow`,
      ).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
test("real upload, 24 basic sliders, presets, comparison, undo redo, reset and persistence", async ({
  page,
}) => {
  // This stress test intentionally renders dozens of full-size adjustments.
  test.setTimeout(240000);
  await openPhoto(page);
  const original = await hash(page);
  await page.getByRole("button", { name: "Adjustments", exact: true }).click();
  for (const key of [
    "Exposure",
    "Brightness",
    "Contrast",
    "Highlights",
    "Shadows",
    "Whites",
    "Blacks",
    "Gamma",
    "Saturation",
    "Vibrance",
    "Sharpness",
    "Clarity",
    "Blur",
    "Fade",
    "Vignette",
    "Grain",
  ]) {
    const number = page.getByRole("spinbutton", {
      name: `${key} value`,
      exact: true,
    });
    await number.fill(
      key === "Gamma"
        ? "1.5"
        : key === "Exposure"
          ? "0.5"
          : key === "Blur"
            ? "4"
            : "30",
    );
    expect(await hash(page), key).not.toBe(original);
    await number.fill(key === "Gamma" ? "1" : "0");
    await ready(page);
  }
  await page
    .getByRole("button", { name: "Color Grading", exact: true })
    .click();
  for (const key of [
    "Temperature",
    "Tint",
    "Hue",
    "Red",
    "Green",
    "Blue",
    "Shadow Tone",
    "Highlight Tone",
  ]) {
    const number = page.getByRole("spinbutton", { name: `${key} value` });
    await number.fill("35");
    expect(await hash(page), key).not.toBe(original);
    await number.fill("0");
    await ready(page);
  }
  await page.getByRole("button", { name: "Styles", exact: true }).click();
  await page
    .locator(".editor-preset")
    .first()
    .locator("button")
    .first()
    .click();
  const styled = await hash(page);
  expect(styled).not.toBe(original);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await hash(page)).toBe(original);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  expect(await hash(page)).toBe(styled);
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Before and after comparison" }),
  ).toBeVisible();
  await page
    .getByRole("slider", { name: "Before and after comparison" })
    .focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("slider", { name: "Before and after comparison" }),
  ).toHaveValue("51");
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page.keyboard.press("b");
  await expect(
    page.getByAltText("Original photo", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("b");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Project saved");
  const url = page.url();
  await page.reload();
  await expect(page.locator('img[alt="Edited photo preview"]')).toBeVisible({
    timeout: 20000,
  });
  expect(await hash(page)).toBe(styled);
  expect(page.url()).toBe(url);
  await reset(page);
  expect(await hash(page)).toBe(original);
});
test("all 20 presets apply; local analysis and confirmed prompts work", async ({
  page,
}) => {
  await openPhoto(page);
  const original = await hash(page);
  await page.getByRole("button", { name: "AI Analysis", exact: true }).click();
  await page.getByRole("button", { name: "Analyze locally" }).click();
  await expect(page.locator(".metric-grid")).toBeVisible();
  await page.getByLabel("Photo type").selectOption("Product");
  await page.getByRole("button", { name: "See 15 suggested styles" }).click();
  await expect(page.locator(".editor-preset")).toHaveCount(15);
  await expect(page.locator(".editor-presets")).not.toContainText(
    "Natural Portrait",
  );
  const names = [
    "Cinematic Greens",
    "Golden Hour",
    "Soft Editorial",
    "Modern Noir",
    "Natural Balance",
    "Clean Studio",
    "Natural Portrait",
    "Analog Days",
    "After Hours",
    "Pastel Haze",
    "Color Story",
    "Alpine Air",
    "Dark Luxury",
    "Quiet Light",
    "Sunday Table",
    "First Impression",
    "Desert Rose",
    "Silver Grain",
    "True Color",
    "Urban Muse",
  ];
  for (const name of names) {
    await page
      .getByRole("textbox", { name: "Search editor styles" })
      .fill(name);
    await page.locator(".editor-preset>button").first().click();
    expect(await hash(page), name).not.toBe(original);
  }
  await reset(page);
  await page
    .getByRole("textbox", { name: "Editing prompt" })
    .fill("Make it warmer with soft shadows and rich colors");
  await page.getByRole("button", { name: "Preview adjustments" }).click();
  await expect(page.locator(".proposal")).toContainText(
    "Offline interpretation",
  );
  const proposed = await hash(page);
  expect(proposed).not.toBe(original);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await hash(page)).toBe(original);
  await page.getByRole("button", { name: "Preview adjustments" }).click();
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  expect(await hash(page)).toBe(proposed);
  await expect(page.locator(".canvas-bottom")).toContainText("Prompt edit");
  await page
    .getByRole("textbox", { name: "Editing prompt" })
    .fill("Remove the person and replace the background");
  await page.getByRole("button", { name: "Preview adjustments" }).click();
  await expect(page.getByRole("alert")).toContainText("not available");
});
test("crop, rotate, flip, text, manual masks and valid full-resolution exports", async ({
  page,
}) => {
  await openPhoto(page);
  const original = await hash(page);
  await page
    .getByRole("button", { name: "Crop & Transform", exact: true })
    .click();
  await page.getByLabel("Aspect ratio").selectOption("1:1");
  await page.getByRole("button", { name: "Rotate 90°" }).click();
  await page
    .getByRole("button", { name: "Flip horizontal", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Flip vertical", exact: true })
    .click();
  expect(await hash(page)).not.toBe(original);
  await page
    .getByRole("button", { name: "Text & Overlays", exact: true })
    .click();
  await page
    .getByLabel("Your text", { exact: true })
    .fill("A different perspective");
  await ready(page);
  for (const [tool, key] of [
    ["Portrait", "Smoothing"],
    ["Background", "Background Blur"],
  ]) {
    await page.getByRole("button", { name: tool, exact: true }).click();
    await page
      .getByRole("spinbutton", { name: `${key} value` })
      .fill(key === "Smoothing" ? "60" : "8");
    await ready(page);
  }
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(page.getByAltText("Export preview")).toBeVisible();
  for (const format of ["image/jpeg", "image/png"]) {
    await page.getByLabel("File format").selectOption(format);
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download photo" }).click();
    const download = await pending;
    const file = await download.path();
    const buffer = await fs.readFile(file!);
    expect(buffer.length).toBeGreaterThan(10000);
    const dims = await page.evaluate(
      async ({ data, type }) => {
        const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type }));
        const result = [bitmap.width, bitmap.height];
        bitmap.close();
        return result;
      },
      { data: buffer.toString("base64"), type: format },
    );
    expect(dims).toEqual([768, 768]);
    await expect(page.locator(".export-result")).toContainText(
      "Downloaded 768 × 768",
    );
  }
});
test("invalid files and missing API fail safely; simulated quota and invalid JSON handled", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("not a photo"),
  });
  await expect(page.getByRole("alert")).toContainText("could not be decoded");
  await page.locator("input[type=file]").setInputFiles({
    name: "note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("alert")).toContainText("JPEG, PNG, or WebP");
  await page
    .locator("input[type=file]")
    .setInputFiles("public/images/alpine.jpg");
  await expect(page.getByAltText("Edited photo preview")).toBeVisible({
    timeout: 20000,
  });
  await page.getByRole("button", { name: "AI Analysis", exact: true }).click();
  await page.getByRole("button", { name: "Ask Gemini" }).click();
  await expect(page.getByRole("dialog")).toContainText("Google Gemini");
  await page.getByRole("button", { name: "Send preview & continue" }).click();
  await expect(page.getByRole("alert")).toContainText("not configured");
  await page.getByRole("button", { name: "Analyze locally" }).click();
  await expect(page.locator(".metric-grid")).toBeVisible();
  for (const response of [
    {
      status: 429,
      body: JSON.stringify({
        error: "Gemini quota reached. Continue locally.",
      }),
    },
    { status: 200, body: "not JSON" },
  ]) {
    await page.route("**/api/ai", (r) =>
      r.fulfill({ contentType: "application/json", ...response }),
    );
    await page.getByRole("button", { name: "Ask Gemini" }).click();
    await page.getByRole("button", { name: "Send preview & continue" }).click();
    await expect(page.getByRole("alert")).toContainText(
      response.status === 429 ? "quota reached" : "invalid JSON",
    );
    await page.unroute("**/api/ai");
  }
});
test("project management, custom presets and comparison routes persist", async ({
  page,
}) => {
  await openPhoto(page);
  await page.getByRole("button", { name: "More options" }).click();
  await page.getByRole("button", { name: "Save as preset" }).click();
  await page.getByLabel("Preset name").fill("My look");
  await page.getByRole("button", { name: "Save preset", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("link", { name: "Back to projects" }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Duplicate alpine" }).click();
  await expect(page.locator(".project-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Rename alpine", exact: true })
    .click();
  await page.getByLabel("Project name").fill("My mountain");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator(".project-card")).toContainText([
    "alpine — copy",
    "My mountain",
  ]);
  await page.getByRole("button", { name: "Favorite My mountain" }).click();
  await page.getByRole("button", { name: "Favorites", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Delete My mountain" }).click();
  await page.getByRole("button", { name: "Keep project" }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.goto("/presets");
  await page.getByRole("textbox", { name: "Search styles" }).fill("My look");
  await expect(page.locator(".preset-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Favorite My look", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: /Favorites/ }).click();
  await expect(page.locator(".preset-card")).toHaveCount(1);
  await page.goto("/compare");
  await expect(
    page.getByRole("slider", { name: "Before and after comparison" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Side by side" }).click();
  await expect(page.getByAltText("Saved edited photo")).toBeVisible();
  await page.goto("/projects");
  await page.getByRole("button", { name: "Delete My mountain" }).click();
  await page
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(1);
});
test("mobile editor leaves canvas usable and menu navigation is keyboard accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await page
    .locator(".main-nav")
    .getByRole("link", { name: "Explore styles" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/explore/);
  await openPhoto(page);
  const image = page.getByAltText("Edited photo preview");
  const bounds = await image.boundingBox();
  const panel = await page.locator(".editor-panel").boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(panel!.y + 1);
  await page.getByRole("button", { name: "Close tool panel" }).click();
  await expect(page.locator(".editor-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "Adjustments", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Exposure", exact: true }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "Exposure", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("spinbutton", { name: "Exposure value" }),
  ).toHaveValue("0.05");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("PNG alpha, WebP uploads, multiple-file project creation and clean PNG export", async ({
  page,
}) => {
  await page.goto("/editor");
  const files = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#cc7722";
    ctx.fillRect(24, 16, 48, 32);
    return {
      png: c.toDataURL("image/png").split(",")[1],
      webp: c.toDataURL("image/webp").split(",")[1],
    };
  });
  await page.locator("input[type=file]").setInputFiles([
    {
      name: "transparent.png",
      mimeType: "image/png",
      buffer: Buffer.from(files.png, "base64"),
    },
    {
      name: "small.webp",
      mimeType: "image/webp",
      buffer: Buffer.from(files.webp, "base64"),
    },
  ]);
  await expect(page.getByAltText("Edited photo preview")).toBeVisible({
    timeout: 20000,
  });
  await ready(page);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByLabel("File format").selectOption("image/png");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download photo" }).click();
  const download = await pending;
  const buffer = await fs.readFile((await download.path())!);
  const details = await page.evaluate(async (data) => {
    const image = await createImageBitmap(
      new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], {
        type: "image/png",
      }),
    );
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    const pixel = ctx.getImageData(0, 0, 1, 1).data;
    image.close();
    return { width: c.width, height: c.height, alpha: pixel[3] };
  }, buffer.toString("base64"));
  expect(details).toEqual({ width: 96, height: 64, alpha: 0 });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("link", { name: "Back to projects" }).click();
  await expect(page.locator(".project-card")).toHaveCount(2);
  await page.getByRole("heading", { name: "small", exact: true }).click();
  await expect(page.getByAltText("Edited photo preview")).toBeVisible({
    timeout: 20000,
  });
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("acharya-welcome-v2:guest", "done"),
  );
});
