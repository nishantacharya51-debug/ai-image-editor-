import { test, expect } from "@playwright/test";
test.skip(
  process.env.RUN_CLOUD_MOCKS !== "1",
  "Requires the mock-configured Vite server, not a real Supabase project.",
);

test("configured Supabase UI signs up, logs in/out, restores session and reuses only the current account key (mock services)", async ({
  page,
}) => {
  const first = "11111111-1111-4111-8111-111111111111",
    second = "22222222-2222-4222-8222-222222222222";
  const users = new Map([
    [first, { id: first, email: "first@example.test" }],
    [second, { id: second, email: "second@example.test" }],
  ]);
  const keys = new Map<string, { model: string; updatedAt: string }>();
  const user = (id: string) => ({
    ...users.get(id),
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { display_name: "Test Creator" },
    created_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
  });
  const jwt = (id: string) =>
    `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })).toString("base64url")}.FAKE_TEST_SIGNATURE`;
  const headers = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "content-type": "application/json",
  };
  await page.route("https://test-acharya.supabase.co/**", async (r) => {
    const url = new URL(r.request().url()),
      method = r.request().method();
    if (method === "OPTIONS") return r.fulfill({ status: 204, headers });
    const auth = r.request().headers()["authorization"]?.split(" ")[1];
    let id = first;
    try {
      id = JSON.parse(
        Buffer.from(auth!.split(".")[1], "base64url").toString(),
      ).sub;
    } catch {
      /* Password login is not authenticated yet. */
    }
    if (url.pathname === "/auth/v1/signup")
      return r.fulfill({ json: { user: user(first) }, headers });
    if (url.pathname === "/auth/v1/token") {
      const body = r.request().postDataJSON();
      id = body.email === "second@example.test" ? second : first;
      return r.fulfill({
        json: {
          access_token: jwt(id),
          refresh_token: `fake-refresh-${id}`,
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: user(id),
        },
        headers,
      });
    }
    if (url.pathname === "/auth/v1/user")
      return r.fulfill({ json: user(id), headers });
    if (url.pathname === "/auth/v1/logout")
      return r.fulfill({ status: 204, headers });
    if (url.pathname === "/functions/v1/ai-gateway") {
      expect(users.has(id)).toBe(true);
      const body = r.request().postDataJSON();
      if (body.action === "save-key") {
        expect(body.apiKey).toBe("fake-personal-gemini-key-no-provider");
        keys.set(id, {
          model: body.model,
          updatedAt: new Date().toISOString(),
        });
      } else if (body.action === "delete-key") keys.delete(id);
      else expect(body.action).toBe("key-status");
      return r.fulfill({
        json: {
          configured: keys.has(id),
          model: keys.get(id)?.model || "gemini-2.5-flash",
          updatedAt: keys.get(id)?.updatedAt ?? null,
        },
        headers,
      });
    }
    throw new Error(`Unexpected mock request ${url.pathname}`);
  });
  await page.goto("/signup");
  await page.getByLabel("Your name", { exact: true }).fill("Test Creator");
  await page.getByLabel("Email address").fill("first@example.test");
  await page.getByLabel("Password", { exact: true }).fill("fake-password-123");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("fake-password-123");
  await page
    .getByRole("button", { name: "Create free account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  async function login(email: string) {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("fake-password-123");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(/account/);
    await expect(page.locator(".personal-key")).toBeVisible();
  }
  await login("first@example.test");
  await expect(page.locator(".personal-key")).toContainText(
    "No personal key connected",
  );
  await page
    .getByLabel("Personal Gemini API key")
    .fill("fake-personal-gemini-key-no-provider");
  await page.getByRole("button", { name: "Save key to my account" }).click();
  await expect(page.locator(".personal-key")).toContainText(
    "Your Gemini key is saved",
  );
  await expect(page.getByLabel("Personal Gemini API key")).toHaveValue("");
  await page.reload();
  await expect(page.locator(".account-summary")).toContainText(
    "first@example.test",
  );
  await expect(page.locator(".personal-key")).toContainText(
    "Your Gemini key is saved",
  );
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage })),
  ).not.toContain("fake-personal-gemini-key-no-provider");
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await login("second@example.test");
  await expect(page.locator(".personal-key")).toContainText(
    "No personal key connected",
  );
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await login("first@example.test");
  await expect(page.locator(".personal-key")).toContainText(
    "Your Gemini key is saved",
  );
  await page
    .getByRole("button", { name: "Delete saved key", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete my saved key", exact: true })
    .click();
  await expect(page.locator(".personal-key")).toContainText(
    "No personal key connected",
  );
});
