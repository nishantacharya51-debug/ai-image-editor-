import { test, expect } from "@playwright/test";
const fakeKey = "test-only-gemini-key-not-a-real-credential";
const setup = "test-only-setup-code-not-a-real-secret";
const disconnected = {
  configured: false,
  model: "gemini-2.5-flash",
  keySource: "none",
  setupEnabled: true,
  environmentKeyPresent: false,
};
test("Settings securely adds, masks, updates status and clears a session key (mocked API)", async ({
  page,
}) => {
  let state = { ...disconnected };
  await page.route("**/api/health", (r) => r.fulfill({ json: state }));
  await page.route("**/api/gemini/config", async (r) => {
    expect(r.request().headers()["x-pixora-setup-token"]).toBe(setup);
    if (r.request().method() === "PUT") {
      expect(r.request().postDataJSON()).toEqual({
        apiKey: fakeKey,
        model: "gemini-2.5-flash",
      });
      state = { ...state, configured: true, keySource: "session" };
    } else {
      expect(r.request().method()).toBe("DELETE");
      state = { ...disconnected };
    }
    await r.fulfill({
      json: {
        ...state,
        message: state.configured ? "Saved" : "Session key cleared.",
      },
    });
  });
  await page.goto("/settings");
  await page
    .getByText("Local developer server configuration", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add Gemini API key", exact: true })
    .click();
  const field = page.getByRole("textbox", {
    name: "Gemini API key",
    exact: true,
  });
  // Password controls do not expose the textbox role, so use their explicit label.
  const keyField = page.getByLabel("Gemini API key", { exact: true });
  await keyField.fill(fakeKey);
  await expect(keyField).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show API key", exact: true }).click();
  await expect(field).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide API key", exact: true }).click();
  await page.getByLabel("Server setup code").fill(setup);
  await page.getByRole("button", { name: "Save key to server" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".gemini-connection-card")).toContainText(
    "Saved for this server session",
  );
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("pixora-studio");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const prefs = await new Promise<unknown>((resolve, reject) => {
      const request = db
        .transaction("preferences")
        .objectStore("preferences")
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
      prefs,
    });
  });
  expect(stored).not.toContain(fakeKey);
  expect(stored).not.toContain(setup);
  await page.getByRole("button", { name: "Update Gemini API key" }).click();
  await expect(keyField).toHaveValue("");
  await expect(page.getByLabel("Server setup code")).toHaveValue("");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear session key", exact: true })
    .click();
  await page.getByLabel("Server setup code").fill(setup);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Clear session key", exact: true })
    .click();
  await expect(page.locator(".gemini-connection-card")).toContainText(
    "No API key connected",
  );
});
test("incorrect setup code displays useful feedback and clears the entered API key", async ({
  page,
}) => {
  await page.route("**/api/health", (r) => r.fulfill({ json: disconnected }));
  await page.route("**/api/gemini/config", (r) =>
    r.fulfill({
      status: 401,
      json: {
        error: "The server setup code is incorrect. No key was changed.",
      },
    }),
  );
  await page.goto("/settings");
  await page
    .getByText("Local developer server configuration", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add Gemini API key", exact: true })
    .click();
  await page.getByLabel("Gemini API key", { exact: true }).fill(fakeKey);
  await page.getByLabel("Server setup code").fill(setup);
  await page.getByRole("button", { name: "Save key to server" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "setup code is incorrect",
  );
  await expect(page.getByLabel("Gemini API key", { exact: true })).toHaveValue(
    "",
  );
});
test("unavailable configuration server prevents credential submission; mobile dialog fits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/health", (r) =>
    r.fulfill({ status: 503, json: { error: "Offline" } }),
  );
  await page.goto("/settings");
  await page
    .getByText("Local developer server configuration", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add Gemini API key", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save key to server" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("acharya-welcome-v2:guest", "done"),
  );
});
