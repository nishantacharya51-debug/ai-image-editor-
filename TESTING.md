# Verification report

Executed in the Arena Linux sandbox on **2026-10-14**, using Node 22.22.3 and Chromium 153 supplied by the dev-only `@sparticuz/chromium` package. No real Gemini credential was available. No cloud deployment was performed.

## Results

| Check                                   | Result                                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm install` / dependency installation | Dependencies installed; npm lockfile included                                                            |
| `npm run typecheck`                     | PASS, no TypeScript errors                                                                               |
| `npm run lint`                          | PASS, no ESLint errors                                                                                   |
| `npm test`                              | PASS, 38 tests across two files                                                                          |
| `npm run build`                         | PASS, Vite production build; lazy route chunks + dedicated grading worker                                |
| `npm audit`                             | PASS, 0 known vulnerabilities in the installed dependency tree                                           |
| Full Playwright workflow suite          | PASS, 7/7 workflow tests in one run (4.7 minutes)                                                        |
| Additional alpha/WebP/multi-upload test | PASS, 1/1 in a targeted run (17.7 seconds)                                                               |
| Public bundle secret sentinel scan      | PASS, a deliberately fake server-only `GEMINI_API_KEY` value was absent from every `dist` file           |
| Development server                      | Running on `0.0.0.0:5173`; same-origin API proxy verified                                                |
| Optional backend without API key        | `/api/health` reports unconfigured; confirmed photo request returns a useful 503, local tools still work |

There are **8 passing browser tests total**, with the first seven run together and the additional format test run separately. The standard `npm run test:e2e` command includes all eight.

## Unit coverage

- Identity grading preserves pixels/alpha and exposure uses stops.
- Monochrome channel equality and deterministic grain.
- All 20 built-in recipes change pixels; recipes are unique.
- Structured adjustments clamp numeric ranges, drop unknown/non-finite values, reject invalid shapes.
- Measured luminance/clipping and low-light adaptation.
- Fifteen product recommendations exclude portrait/headshot categories.
- Offline warm/soft/rich prompt handling; negative subject-darkening intent; refusal of unsupported/generative requests and unknown phrases.
- AI boundary rejects malformed JSON and empty structured responses even on HTTP 200, handles quota errors without retries, and clamps a valid simulated response.

## Browser workflows exercised

1. Homepage, Editor, Explore, Presets, Projects, History, Compare, Pricing, Settings, Help, Privacy, Terms, `/404`, and unknown-route fallback, at **1440 px, 768 px, and 390 px**. No horizontal document overflow or uncaught page errors during this route sweep.
2. Upload of an actual bundled JPEG file; image displayed and decoded into the editor.
3. All 24 light/detail/color numerical controls changed preview pixel hashes, followed by restoring their neutral values.
4. Actual application of all 20 preset recipes; measured analysis UI; manually selected product context yields 15 non-portrait suggestions.
5. Undo/redo restored expected pixel hashes, original keyboard toggle, keyboard-operated split slider, reset to original, save and page-reload persistence.
6. Offline prompt preview/cancel/apply, unchanged original after cancel, persistent applied settings, and unsupported generative-request feedback.
7. Square crop, 90-degree rotation, both flips, text overlay, manual smoothing and background blur controls. JPEG and PNG exports were downloaded, decoded again by the browser, and verified at **768 × 768** (correct full-resolution square crop for the 1376 × 768 source).
8. Malformed JPEG and unsupported text-file rejection; missing-key AI path; simulated rate-limit and invalid-JSON failures; local analysis remains usable.
9. Local project duplicate/rename/favorite, cancel/delete confirmation, custom preset/favorite persistence, saved split/side-by-side comparison.
10. Mobile menu keyboard navigation, keyboard-adjusted exposure, bottom-sheet close/reopen, and canvas bounds verified to stay above the tool panel.
11. Generated transparent PNG and WebP uploaded together as two projects. Unedited PNG exported and decoded at **96 × 64** with a fully transparent corner preserved. The WebP project reopened successfully.

## Fixes made during verification

- An initial Vite hot-reload cache saw a transient package file during dependency installation; restarted the server after installation.
- Explicitly preserved the frontend Host header in the Vite proxy so the server's origin validation works correctly.
- Corrected mobile drawer spacing to use viewport-derived height instead of percentage padding (which resolves against width).
- Made invalid HTTP-200 AI JSON a hard error rather than accepting empty default fields.
- Added file signature checks in addition to declared MIME and decoder validation.
- Prevented a stale AI response from a replaced photo from being applied to the new source.
- Ensured manual smoothing and background blur compose as separate operations rather than silently choosing one.
- Adjusted the sandbox test browser away from single-process mode, which crashed between Playwright contexts. This was a test-runner issue, not an app production setting.

## Not verified / remaining risks

- **Live Gemini** request success, real model availability, quota values, Google account regions, provider-side data behavior, and live authentication failures. These require a genuine server-side credential and network access. Simulated responses do not establish provider compatibility.
- Real iOS Safari, Firefox, mobile hardware, color-profile handling across devices, or assistive-technology/screen-reader certification. Responsive and keyboard tests used desktop Chromium viewports.
- Exhaustive performance/stress testing at the 40 MP / 30 MB upload limits, deliberately exhausted browser storage, or real out-of-memory conditions. Browser storage/memory can still fail.
- Full EXIF orientation fixture coverage, every MIME mismatch permutation, corrupted-file fuzzing, arbitrary rapid concurrent upload races, long-duration use, and all touch/pan gesture combinations.
- Automated WCAG contrast certification and a full accessibility audit.
- Public deployment, distributed rate limiting, production reverse-proxy configuration, security penetration testing, or abuse resistance under anonymous public traffic.
- Every optional composition/mask positioning value is not exhaustively tested. Crop/rotation/flip/text/manual effects are exercised in a composite workflow; full engine arithmetic is not a professional color-science certification.

Run the committed tests locally after dependency, browser, or deployment changes. Do not treat a clean build or this report as a guarantee of production suitability for every environment.

## API-key setup follow-up

Added the Settings API-key form and protected server-memory configuration endpoint. Verification for this change:

- `npm run test:server`: **7/7 pass**. Real local HTTP endpoint tests cover admin-code authentication, safe status responses with no key/code disclosure, strict input validation, clearing/disconnection, restoration of an environment key, disabled setup, and 5-attempt rate limiting. All credentials in these tests are deliberately fake; no request is sent to Google.
- `tests/gemini-settings.spec.ts`: **3/3 Playwright tests pass**. The browser tests use mocked configuration responses to verify masking/show-hide, correct request shape, saved status, session-key clearing, no credential storage in localStorage/sessionStorage/IndexedDB preferences, useful auth failures with input clearing, disabled submission when the server is unavailable, and mobile dialog layout.
- Typecheck, lint, and production build pass for this change. No real user API key was added or verified.
- The previous attempt to rerun all eight original browser tests was **stopped by the user after the first three passed**. It is not recorded as a completed full run. Earlier full and targeted results above remain historical verification, not a claim that the interrupted run finished.

The browser suite now contains 11 tests. API-key setup tests use fake responses in the UI and actual HTTP requests to isolated test servers for backend verification. They do not establish real Gemini provider connectivity.

## Acharya Stdio rebrand

- Updated the public name to **Acharya Stdio**, with a custom angular A monogram for navigation, footer, editor, preview toolbar, and favicon. Export filenames now end in `-acharya-stdio`.
- Kept the original IndexedDB identifier and server credential protocol unchanged to preserve saved projects and Gemini configuration. The running AI server was not restarted for this visual change, so an existing session key is not intentionally cleared.
- Typecheck, ESLint, production build, 38 unit tests, and all 7 server tests pass after the branding changes.
- Both `tests/branding.spec.ts` browser tests pass: new brand/title/logo rendering and no horizontal overflow at 1440/768/390/360 px; no former product name visible in the checked homepage/settings/terms; matching SVG favicon; editor mark; persisted project reload using the existing database; and a real download named `alpine-acharya-stdio.jpg`.
- The complete browser suite now contains 13 tests. Only the two new branding tests were run for this branding-only update; earlier workflow results above are recorded separately.
