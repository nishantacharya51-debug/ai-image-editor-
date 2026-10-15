# Free accounts + encrypted personal Gemini keys

The static GitHub Pages frontend cannot store secrets or run authentication servers. This optional backend provides real **Supabase Auth** login and a verified-user Edge Function. Local editing remains available without it. No Supabase project was created or deployed by the coding session; you must own and configure one.

## Quick start: login and signup only

Use your **existing Supabase project**. Its GitHub integration does not automatically inject configuration into this static website. Authentication does **not** require our Gemini tables, SQL migration, or Edge Function.

1. In **Project Settings → API Keys**, find the Project URL and **publishable** key. Put only these public values in the local, ignored `.env`:
   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLIC_KEY
   ```
   Never use a secret/service-role key, database connection string/password, or Gemini key. The build rejects known Supabase secret/service-role keys.
2. In **Authentication → Providers**, enable Email, keep email confirmation enabled, and set a minimum password length of **8 or stronger**. The app validates matching passwords; Supabase must enforce the actual password policy server-side.
3. In **Authentication → URL Configuration**, set Site URL to:
   ```text
   https://nishantacharya51-debug.github.io/ai-image-editor-/
   ```
   Add these two allowed redirect URLs:
   ```text
   https://nishantacharya51-debug.github.io/ai-image-editor-/#/auth/callback
   https://nishantacharya51-debug.github.io/ai-image-editor-/#/auth/callback?next=reset
   ```
   For local development use the equivalent `/auth/callback` and `/auth/callback?next=reset` URLs on the exact development origin. If you enable the SDK's optional PKCE flow-ID redirect feature later, update your allowlist for its extra query parameter; this app does not enable that option.
4. Configure Auth email delivery for public users. The default Supabase mail sender is restricted; merely linking GitHub will not enable public email. No SMTP account was provisioned here. For an initial login test you can create a confirmed test user you control in Supabase Auth, without disabling confirmations for production.
5. Run `npm run publish:pages`, commit the generated root files, and push **`arena/928435d6-ai-image-editor`**. This deployment uses branch-root Pages; repository Actions variables alone will **not** change it. Restart Vite after editing `.env` for development.
6. Test signup → email confirmation → logout → login → reload, then forgot password → email link → update password. For standard PKCE emails, open the link in the **same browser/device** that requested it. If a link expires or browser storage was cleared, request a fresh link. The app removes one-time callback data from the address bar before rendering and allows only internal account/recovery destinations.

The app supports signup confirmation resend, a 60-second UI email cooldown (not a replacement for Supabase server rate limits), password visibility and confirmation, safe error messages, session persistence, and recovery. A custom email template may send `token_hash` with `type=signup`, `email`, or `recovery` to the callback; these are verified with Supabase and can work across browsers. Default templates are not changed by this repository. Never log or share email verification tokens.

**Verification boundary:** automated browser tests use intercepted, fake Supabase responses and the real SDK. They do not create live accounts, prove SMTP delivery, or validate your project's settings. Public project configuration was deferred by the owner; no claim of live authentication activation is made.

The remaining sections describe the **optional encrypted Gemini-key backend**, which can be configured after login works.

## 1. Create a free project

Create a project in an organization on **Supabase Free**, without enabling a paid plan. Record its project reference. In Project Settings → API find:

- Project URL (`https://<project-ref>.supabase.co`)
- **Public publishable key** (or legacy public anon key)

Those two frontend values may be public. Never use a service-role/secret key as the browser's publishable key.

## 2. Apply SQL

Run `supabase/migrations/202610140001_private_gemini_keys.sql` in the project's SQL Editor, or use Supabase CLI migrations after linking the project. This creates:

- `user_ai_credentials`: one ciphertext/IV/model record per Auth user.
- `ai_rate_windows`: server-side atomic per-user rate limiting.
- `consume_ai_rate`: callable only by the service role.

RLS is enabled and **all browser table privileges are revoked**. There are intentionally no anonymous or authenticated SELECT/INSERT policies. Only the Edge Function can access credentials using its server-only service-role key. It derives the record owner exclusively from `auth.getUser(bearerToken)`; client-supplied user IDs are not accepted.

## 3. Encryption secret and allowed origin

Generate a 32-byte random encryption secret locally:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Save this **privately** as `API_KEY_ENCRYPTION_SECRET` in Supabase Edge Function Secrets. Never put it in Git, frontend env variables, or chat. Back it up securely: changing or losing it makes previously saved keys unreadable. A production rotation mechanism is not implemented; ask users to save their keys again after a deliberate rotation.

Set `APP_ORIGINS` to the exact allowed origins (no paths):

```text
https://nishantacharya51-debug.github.io
```

For development, append exact origins separated by commas, e.g. `http://localhost:5173`. Do not use a wildcard. An Arena preview requires its exact HTTPS origin if you want live account requests there.

Supabase automatically provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions. They are server-only. Do not expose the service-role key anywhere in the frontend.

## 4. Deploy the Edge Function

Install the Supabase CLI or use its dashboard deployment workflow. Authenticate the CLI directly, not in chat, then:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy ai-gateway --no-verify-jwt
```

`verify_jwt=false` in `supabase/config.toml` is intentional: the function itself verifies the user's JWT through `auth.getUser` before every action. It does **not** accept an anonymous or unverified session. This supports modern publishable keys without relying on the legacy gateway JWT check.

## 5. Configure Auth

Enable **Email** authentication in Supabase Auth settings. Keep email confirmation enabled for a public deployment. Configure:

- Site URL: `https://nishantacharya51-debug.github.io/ai-image-editor-/`
- Use the two `#/auth/callback` URLs in the quick start above. The app explicitly exchanges PKCE codes, handles recovery, and scrubs callback data from the browser URL.
- For development, allow the corresponding exact frontend URLs.

Supabase's built-in email sender is restricted to authorized addresses and low rate limits. **Public sign-up, confirmation, and recovery require a suitable SMTP provider** configured in Supabase Auth. Use a free tier you verify with its provider, or use test users you control for initial validation. No email service was silently provisioned, and no unlimited free delivery is promised. You can create a confirmed test user from the Supabase Auth dashboard to test login without sending confirmation mail. Do not weaken production email confirmation to bypass setup.

## 6. Connect the frontend

**Current branch-root publishing:** add the two public values below to your local untracked `.env`, run `npm run publish:pages`, then commit and push the generated site on `arena/928435d6-ai-image-editor`. GitHub Pages automatically redeploys this branch. The Actions-variable method below is an alternative only if you switch Pages to the optional Actions workflow.

In GitHub repository Settings → Secrets and variables → Actions → **Variables**, add:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

Re-run the “Publish Acharya Stdio” workflow on the session branch. For local development, put these public values in the untracked `.env`, then restart Vite. The public project URL must use HTTPS on a `*.supabase.co` host.

## 7. Verify before inviting other people

1. Sign up and confirm email, or log in with your confirmed test user.
2. Open Account and save a Gemini API key. The form clears the key after submitting it.
3. Log out, then log in again. The key status should still say saved; the actual key must never appear in an HTTP response.
4. Sign in as a second user and verify they cannot see or use the first user's key. Direct browser reads of `user_ai_credentials` must be denied.
5. Explicitly confirm an AI request. Only then is a reduced photo preview sent through the Edge Function to Google.
6. Delete the saved key; subsequent AI requests should instruct you to reconnect.
7. Test password-reset email delivery and callback exchange from the deployed site, not only localhost.

## Security and quotas

- Keys use AES-256-GCM with a random 12-byte IV per write. User ID is authenticated as additional data: ciphertext copied to another user's row will not decrypt.
- This is **server-side encryption**, not zero-knowledge/end-to-end encryption. The operator controls both the service role and encryption secret.
- No key is deliberately logged, returned by status, or stored with browser photo projects. The browser retains Supabase auth tokens to support login persistence; these are not Gemini keys.
- A key is reused for its verified owner only. Logging out retains the encrypted key. Delete it using Account to remove its active database record; provider backups may remain according to retention policy.
- Every key/status action is limited to 5/minute/user; AI to 10/minute/user. Quota failures do not retry. Gemini has additional account-specific limits.
- The input body is capped at 1 MB, the reduced JPEG preview at 950,000 encoded characters, and upstream calls at 30 seconds. Models and adjustment JSON are validated; unknown numeric settings are dropped and supported values clamped.
- Failed authentication, email confirmation, CORS, or storage setup prevents credential operations. Edge errors do not expose raw upstream responses.
- This is a production-minded starting point, not an audited hosted service. Test the migration, RLS, recovery callbacks, SMTP, provider availability, and security controls in your actual project.

## Free-tier facts checked October 14, 2026

Supabase's official documentation lists two Free projects, 500 MB database/project, 50,000 monthly active users, 1 GB storage, 5 GB egress, and 500,000 Edge Function invocations in the included quota. Free projects can be paused. Provider limits may change; check your dashboard before deploying. Photos remain local, so this application does not consume hosted photo storage.

Source: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/platform/billing-on-supabase.mdx

## Local verification

```sh
npx deno check supabase/functions/ai-gateway/index.ts
npx deno test supabase/functions/ai-gateway/crypto.test.ts
```

These verify TypeScript and the pure encryption boundary. They do not deploy the backend or validate a live Supabase project.

### Account browser tests (no live service)

In a separate terminal, start a test-only Vite process (do not save these values to `.env` and do not publish this test build):

```sh
VITE_SUPABASE_URL=https://test-acharya.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fake_test_only npm run dev -- --port 5174
```

Then run:

```sh
RUN_CLOUD_MOCKS=1 TEST_BASE_URL=http://127.0.0.1:5174 npx playwright test tests/auth-flows.spec.ts tests/cloud-auth.spec.ts
```

In the Arena sandbox, prefix that test command with `SANDBOX_CHROMIUM=1`. All requests to the fake Supabase host are intercepted by Playwright. For production hash-route verification, build with `VITE_APP_BASE=/ai-image-editor-/ VITE_GITHUB_PAGES=true` plus the same fake values, serve `dist` using `vite preview`, and run **only** `tests/auth-flows.spec.ts` with `TEST_AUTH_PAGES=1`, `RUN_CLOUD_MOCKS=1`, and the preview's `TEST_BASE_URL`. Rebuild without test values before publishing. The normal unconfigured production site must not contain `test-acharya.supabase.co` or the fake publishable key.
