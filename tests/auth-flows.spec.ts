import { test, expect, type Page } from "@playwright/test";

test.skip(
  process.env.RUN_CLOUD_MOCKS !== "1",
  "Requires a test-configured frontend; no real accounts or emails are created.",
);
const pages = process.env.TEST_AUTH_PAGES === "1";
const route = (path: string) => (pages ? `/ai-image-editor-/#${path}` : path);
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "creator@example.test",
  aud: "authenticated",
  role: "authenticated",
  user_metadata: { display_name: "Creator" },
  app_metadata: { provider: "email" },
  created_at: "2026-10-15T00:00:00Z",
};
const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: user.id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.TEST_ONLY`;
async function mockAuth(page: Page) {
  const requests: { path: string; body: any; redirect: string | null }[] = [];
  await page.route("https://test-acharya.supabase.co/**", async (r) => {
    const url = new URL(r.request().url());
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "content-type": "application/json",
      "x-supabase-api-version": "2024-01-01",
      "access-control-expose-headers": "x-supabase-api-version",
    };
    if (r.request().method() === "OPTIONS")
      return r.fulfill({ status: 204, headers });
    const body = r.request().postData() ? r.request().postDataJSON() : {};
    requests.push({
      path: url.pathname,
      body,
      redirect: url.searchParams.get("redirect_to"),
    });
    if (
      url.pathname.endsWith("/token") &&
      url.searchParams.get("grant_type") === "password"
    )
      return r.fulfill({
        status: 400,
        headers,
        json: { code: "invalid_credentials", msg: "Invalid login credentials" },
      });
    if (url.pathname.endsWith("/token") || url.pathname.endsWith("/verify"))
      return r.fulfill({
        headers,
        json: {
          access_token: token,
          refresh_token: "fake-refresh",
          token_type: "bearer",
          expires_in: 3600,
          user,
        },
      });
    if (url.pathname.endsWith("/signup"))
      return r.fulfill({ headers, json: { user } });
    if (url.pathname.endsWith("/user"))
      return r.fulfill({ headers, json: user });
    if (url.pathname.endsWith("/resend") || url.pathname.endsWith("/recover"))
      return r.fulfill({ headers, json: {} });
    if (url.pathname.endsWith("/ai-gateway"))
      return r.fulfill({
        headers,
        json: { configured: false, model: "gemini-2.5-flash", updatedAt: null },
      });
    if (url.pathname.endsWith("/logout"))
      return r.fulfill({ headers, status: 204 });
    throw new Error(`Unexpected mock request: ${url.pathname}`);
  });
  return requests;
}
function callbackUrl(redirect: string, code: string) {
  const url = new URL(redirect);
  url.searchParams.set("code", code);
  return url.href;
}

test("signup validates matching passwords, hides passwords, and confirms a PKCE link", async ({
  page,
}) => {
  const requests = await mockAuth(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(route("/signup"));
  await page.getByLabel("Your name", { exact: true }).fill("Creator");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("fake-password-123");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("different-password");
  await page
    .getByRole("button", { name: "Create free account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("do not match");
  expect(requests.filter((r) => r.path.endsWith("/signup"))).toHaveLength(0);
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("fake-password-123");
  await page
    .getByRole("button", { name: "Create free account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(
    page.getByLabel("Confirm password", { exact: true }),
  ).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Resend confirmation email" }),
  ).toBeDisabled();
  const signup = requests.find((r) => r.path.endsWith("/signup"))!;
  expect(signup.body.code_challenge_method).toBe("s256");
  expect(signup.redirect).toContain("/auth/callback");
  await page.goto(callbackUrl(signup.redirect!, "one-use-confirmation"));
  await expect(page).toHaveURL(/(?:#\/|\/)account$/);
  await expect(page.locator(".account-summary")).toContainText(user.email);
  const exchange = requests.filter((r) => r.path.endsWith("/token"));
  expect(exchange).toHaveLength(1);
  expect(exchange[0].body.auth_code).toBe("one-use-confirmation");
  expect(exchange[0].body.code_verifier).toBeTruthy();
  expect(page.url()).not.toContain("code=");
  await page.reload();
  await expect(page.locator(".account-summary")).toContainText(user.email);
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage })),
  ).not.toContain("fake-password-123");
  expect(errors).toEqual([]);
});

test("invalid login is honest, resend works independently, and email requests are throttled in the UI", async ({
  page,
}) => {
  const requests = await mockAuth(page);
  await page.goto(route("/login"));
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.getByRole("alert")).toContainText("Enter your email");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("");
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.getByRole("status")).toContainText(
    "a new email has been requested",
  );
  await expect(
    page.getByRole("button", { name: "Resend confirmation email" }),
  ).toBeDisabled();
  const resend = requests.find((r) => r.path.endsWith("/resend"))!;
  expect(resend.body.type).toBe("signup");
  expect(resend.body.email).toBe(user.email);
  expect(resend.redirect).toContain("/auth/callback");
});

test("password recovery exchanges the real SDK challenge and updates only an authenticated session", async ({
  page,
}) => {
  const requests = await mockAuth(page);
  await page.goto(route("/reset-password"));
  await expect(
    page.getByRole("button", { name: "Update password" }),
  ).toBeDisabled();
  await page.goto(route("/forgot-password"));
  await page.getByLabel("Email address").fill(user.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
  const recovery = requests.find((r) => r.path.endsWith("/recover"))!;
  expect(recovery.redirect).toContain("next=reset");
  await page.goto(callbackUrl(recovery.redirect!, "one-use-recovery"));
  await expect(
    page.getByRole("button", { name: "Update password" }),
  ).toBeEnabled();
  await page
    .getByLabel("New password", { exact: true })
    .fill("new-fake-password-456");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("new-fake-password-456");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  expect(
    requests.find((r) => r.path.endsWith("/user") && r.body.password)?.body
      .password,
  ).toBe("new-fake-password-456");
  await expect(page.getByLabel("New password", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByLabel("Confirm new password", { exact: true }),
  ).toHaveValue("");
  // Signed-in users can request a password change as well.
  await page.goto(route("/forgot-password"));
  await expect(
    page.getByRole("button", { name: "Send reset link" }),
  ).toBeVisible();
});

test("expired links, missing verifiers, and missing callback data fail safely on mobile", async ({
  page,
}) => {
  const requests = await mockAuth(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    route(
      "/auth/callback?error_code=otp_expired&error_description=private-data",
    ),
  );
  await expect(page.getByRole("alert")).toContainText("expired");
  expect(page.url()).not.toContain("private-data");
  expect(await page.locator("body").innerText()).not.toContain("private-data");
  await page.goto(route("/auth/callback?code=wrong-browser-code"));
  await expect(page.getByRole("alert")).toContainText("another browser");
  expect(requests.filter((r) => r.path.endsWith("/token"))).toHaveLength(0);
  await page.goto(route("/auth/callback"));
  await expect(page.getByRole("alert")).toContainText("missing");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("token-hash templates can confirm in a new browser without a PKCE verifier", async ({
  page,
}) => {
  const requests = await mockAuth(page);
  await page.goto(
    route(
      "/auth/callback?token_hash=fake-once&type=signup&next=https://evil.example",
    ),
  );
  await expect(page).toHaveURL(/(?:#\/|\/)account$/);
  await expect(page.locator(".account-summary")).toContainText(user.email);
  expect(requests.find((r) => r.path.endsWith("/verify"))?.body).toMatchObject({
    token_hash: "fake-once",
    type: "signup",
  });
});
