# Acharya Stdio

**Designed and developed by Nishant Acharya.** The latest version includes a fantasy-inspired A crest, an animated first-workspace Gemini welcome, optional Supabase email accounts with encrypted per-user API keys, portable project backups, import/export editing recipes, and measured one-click Auto Balance.

**Publishing:** see [DEPLOYMENT.md](DEPLOYMENT.md) for the GitHub Pages workflow and the required owner action. The connected integration cannot enable Pages (HTTP 403), and no public deployment is claimed until the deploy job succeeds. **Online accounts require your own configured free Supabase project**; follow [supabase/README.md](supabase/README.md). Local editing is fully usable without that backend.

A working, local-first photo editing application built from this repository's original README-only starting point. React 19, TypeScript, Vite, Canvas, a pixel-processing Web Worker, IndexedDB, and an **optional** Express/Gemini service. No paid service is needed for local editing.

## Run locally

Use Node **22.22+** and npm.

```sh
npm ci
npm run dev
# Open the Vite address (normally http://localhost:5173).
```

The dev server binds to `0.0.0.0` and supports Arena's preview host. Frontend API requests are relative `/api/...` URLs; Vite proxies them to port 3001 without changing the host.

For optional AI, run this in a second terminal:

```sh
cp .env.example .env
# Edit .env privately. Do not put credentials in chat or source files.
npm run server
```

Production, with or without the optional API:

```sh
npm run build
NODE_ENV=production npm run server
# Express serves dist plus /api on port 3001 (or PORT).
```

Static-only production preview: `npm run preview`. It intentionally does not include an AI server.

## What works

- JPEG, PNG, WebP upload via picker, drag/drop, and image clipboard paste. Up to eight files create individual local projects. MIME, magic-byte signature, decoding, 30 MB size and 40 MP dimension checks. Browser EXIF orientation handling.
- Original image blobs are preserved. Changes are typed parameters, always rendered from the original; previews are capped at 1400 px. Preset thumbnails use 240 px previews. CPU-intensive per-pixel grading runs in a dedicated worker and preview updates are debounced.
- Exposure (stops), brightness, contrast, saturation, vibrance, temperature, tint, highlights, shadows, whites, blacks, gamma, hue, RGB balance, split toning, sharpness, blur, fade, vignette, procedural grain and approximate clarity.
- 20 distinct, editable presets, category/search/sort/favorite controls, intensity, user-saved recipes, and 15 measurement-adapted recommendations. A manually chosen photo type controls offline relevance; local statistics **do not classify subjects**.
- Measured brightness, luminance deviation (contrast), saturation, clipping and red/blue balance. Observations are carefully distinguished from visual AI judgments.
- Offline **rule-based** prompt interpreter with preview/apply/cancel. It recognizes a limited vocabulary, not arbitrary natural language. Optional Gemini supports broader instructions and visual observations.
- Manual feathered elliptical smoothing and outside-ellipse background blur; position and radius controls. These are **not face detection or segmentation**.
- Repositionable aspect-ratio crops, 90° rotation, horizontal/vertical flips, editable text overlay.
- Undo/redo (up to 80 snapshots), step restoration, before toggle, split comparison, zoom/pan/fit, reset current tool/all, local copy/paste adjustments.
- Full-resolution PNG/JPEG download, adjustable JPEG quality, smaller export sizes without upscaling, export preview, actual dimensions/file size after encoding. PNG keeps alpha; JPEG uses a white matte.
- IndexedDB projects: original + thumbnail blobs, editable settings and history, save/reopen, rename, duplicate, delete confirmation, favorites, search and sort. Project imports are saved immediately; **later edits require Save**. A dirty indicator and browser-unload warning help avoid accidental loss.
- Responsive marketing pages and a charcoal editor with mobile bottom-sheet tools, semantic controls, keyboard access, focus styles, modal focus handling, reduced motion and error/success notifications.

### Routes

| Route                    | Purpose                                                                       |
| ------------------------ | ----------------------------------------------------------------------------- |
| `/`                      | Marketing homepage, real interactive before/after example, style gallery, FAQ |
| `/editor`                | Upload/empty workspace                                                        |
| `/editor/:projectId`     | Restore an editable local project                                             |
| `/explore`               | Searchable, categorized style collection and detail previews                  |
| `/presets`               | Built-in/custom recipes and favorites                                         |
| `/projects`              | Local project management                                                      |
| `/history`               | Recent saved projects with step counts; open a project to restore a step      |
| `/compare`               | Split or side-by-side comparison of a project's saved edit                    |
| `/pricing`               | Honest free local tier and external quota explanation                         |
| `/settings`              | Export/motion preferences, AI status, clear local data                        |
| `/help`                  | Practical guide, limitations and shortcuts                                    |
| `/privacy`, `/terms`     | Local-data and third-party disclosures                                        |
| `/404`, any unknown path | Custom not-found screen                                                       |

Explore and Presets deliberately share the central library component, with different headings and custom/favorite workflows. There is no fake authentication. The optional Supabase account and key-storage integration needs a deployed backend; photo projects remain local.

### Shortcuts

`Ctrl/⌘ Z` undo · `Ctrl/⌘ Shift Z` redo · `Ctrl/⌘ S` save · `B` original toggle · `Esc` cancel preview/exit comparison · image clipboard paste via `Ctrl/⌘ V`.

## Gemini configuration and safety

### Add a key from the application

1. Start `npm run server`, then open **Settings → Optional Gemini connection → Add Gemini API key**. The editor's AI Analysis tool also links to this screen in a new tab, so your edit stays open.
2. Enter your Gemini key in the masked field, choose a supported Gemini model ID, and enter the **server setup code**.
3. In development the server prints a random setup code at startup. It is an admin credential: keep it private. In production (`NODE_ENV=production`), browser setup is disabled unless you set a unique **`PIXORA_SETUP_TOKEN` of at least 24 characters** in the server environment. Do not expose this token with a `VITE_` prefix.
4. Click **Save key to server**. The form sends credentials only to the same-origin server over HTTPS (localhost is allowed for development). It does not save them in IndexedDB, localStorage, or sessionStorage. The key field is cleared after submission, including errors.
5. The key is held **only in server-process memory** until restart. Use **Update Gemini API key** to replace it, or **Clear session key** to remove the override. Clearing it restores an environment key if one exists; otherwise it disconnects Gemini.

Saving a key **does not call Google, verify the credential, enable billing, or send a photo**. Health responses expose only presence, model, and storage source, never the key or setup code. Configuration changes require the admin setup code, same-origin validation, strict input validation, and are limited to five attempts per IP per 15 minutes. Sessions are shared by all users of that server; only connect a key to a server you trust. Static-only hosting cannot save a key this way. Use server environment secrets for persistent deployment; never commit a real key.

### Persistent server configuration

1. Obtain a Gemini API key under your own Google account, within a free quota if available in your region. **Do not enable billing just for this application.** Free quota is not unlimited and can change.
2. For persistence across restarts, put `GEMINI_API_KEY` only in the server's environment or untracked `.env`. **Never use a `VITE_`-prefixed key**: those variables are bundled into public JavaScript.
3. `GEMINI_MODEL` is configurable; the example uses `gemini-2.5-flash` with Google's REST `generateContent` interface. Confirm that the configured model is supported in your own account. The sandbox cannot verify Google connectivity or model availability, and no credential was supplied.
4. In production set `APP_ORIGIN` to your exact frontend origin. Behind a reverse proxy, set `TRUST_PROXY_HOPS` to the **correct number of trusted hops**, not an arbitrary permissive value.
5. Open Settings → Check server configuration. This reveals configuration presence/model only; it **does not** validate the key, quota, or network access.
6. In the editor, Ask Gemini (or enable Gemini prompt mode) and explicitly confirm sending a reduced JPEG. Nothing is sent just by uploading, typing a prompt, or checking a box.

The browser sends at most a 768 px JPEG plus prompt/settings. The server has a 1 MB JSON limit, 10 requests/minute/IP, origin checks, a 30-second upstream timeout, schema validation, finite-number checks, safe ranges, generic upstream errors, and no automatic retry. API output is never evaluated as code or injected as HTML. The client validates it again. Failed requests never disable local tools.

**Before a public AI deployment:** the included in-memory IP limiter is a low-budget baseline, not a distributed abuse-control or authentication system. Add access control/Turnstile or equivalent and shared rate limits before exposing a valuable key to anonymous traffic. Origin checks are not authentication. Multiple instances have independent quotas. Use HTTPS and provider-side quota controls. The server intentionally does not log image bodies, but host/provider network logs may exist. Google's free-tier data terms may permit uses unsuitable for sensitive photographs.

### What Gemini does not do

This integration suggests color parameters; it is not an image-generation service. Object removal/addition, automatic background removal/replacement, hair-edge refinement, face-aware relighting, semantic masks, blemish repair, and red-eye correction are **not implemented**. No paid or hidden inference service is substituted.

## Free static deployment (no AI secret needed)

A static deployment provides the complete local editor, projects, presets, prompt rules, and export. The optional Express service is **not** executed by static hosting.

### Cloudflare Pages Free

Verified from Cloudflare's public documentation repository on October 14, 2026: the Free plan lists **500 builds/month, 1 build at a time, 20,000 files/site, 25 MiB maximum per asset, and a 20-minute build timeout**. This small app is below those artifact limits. Provider terms and quotas can change; verify them in your dashboard before deployment. No account, hosting resource, or billing configuration has been created by this implementation.

Sources:

- [Pages limits](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/pages/platform/limits.mdx)
- [React deployment guide](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/pages/framework-guides/deploy-a-react-site.mdx)

1. In Cloudflare's Workers & Pages dashboard, create a **Pages** project and import this repository.
2. Choose the working branch you intend to publish (this session's work is on `arena/928435d6-ai-image-editor`).
3. Build command: `npm run build`; output directory: `dist`; Node version: `22.22.3` or compatible Node 22+.
4. Leave all Gemini secrets **unset** for this static-only deployment. `public/_redirects` provides the SPA rewrite for direct route loads. Deploy at the origin root, not under a subdirectory.
5. Verify `/editor`, `/explore`, and a direct `/projects` reload at the deployed hostname.

Alternatively build locally and use the provider's static-asset upload workflow for `dist`.

To enable Gemini on a hosted deployment, run the included Node server behind HTTPS on infrastructure you control and proxy `/api` on the same origin, or deliberately port the small endpoint to a suitable serverless runtime with secret bindings and quota protection. **This repository does not claim that an Express process runs in Pages Functions unchanged.** There is no paid-hosting requirement, and no serverless adapter has been silently added.

## Architecture and changed files

```text
src/
  App.tsx, main.tsx           Routing, lazy routes, app entry
  styles.css                 Shared design tokens, responsive marketing/editor UI
  components/
    UI.tsx                   Brand, navigation, footer, toasts, modal
    Photo.tsx                Real preset previews and accessible comparison slider
    EditorControls.tsx       Typed sliders and export dialog
    EditorToolPanel.tsx      Tool-specific controls
    GeminiSettings.tsx       Secure API-key setup/update/clear UI
  hooks/useEditor.ts         Editor state, history, source lifecycle, prompts, save
  engine/
    types.ts                 Typed state, defaults, safe numeric ranges
    pixels.ts, worker.ts     Pure grading and transferable pixel worker
    render.ts                Crop/transform/compositing, render and export utilities
    analysis.ts              Objective statistics, recommendations, local prompt rules
  data/presets.ts             Central library of actual editing recipes
  lib/
    config.ts                Configurable brand
    images.ts                Validated decoding
    storage.ts               IndexedDB projects and preferences
    ai.ts                    Validated client/server boundary
  pages/                     Home, Editor, Library, Projects, Compare, Info routes
server/index.mjs             Optional same-origin Gemini proxy + production server
server/gemini-config.mjs     Admin-protected, server-memory API-key configuration
public/images/               Locally bundled AI-generated demo photographs
public/fonts/                Self-hosted Manrope/DM Mono with OFL licenses
public/_redirects            Static-host SPA routing fallback
.env.example                Placeholders only; real .env is ignored
vite.config.ts              Vite and same-origin dev proxy
playwright.config.ts        Browser verification config
src/**/*.test.ts            Engine, prompts, measurement, and AI-boundary unit tests
tests/app.spec.ts           End-to-end workflow tests
```

Fonts are open-source OFL-licensed; their licenses are bundled. React, Vite, Lucide, idb, Zod, and Express are open source. Example photographs are AI-generated demonstration assets, not customer images or paid stock.

## Validation commands

```sh
npm run typecheck
npm run lint
npm test
npm run test:server
npm run build
npm audit

# With dev and optional server running in other terminals:
npx playwright install chromium
npm run test:e2e
```

The restricted Arena environment cannot download browsers from Playwright's normal CDN. For this sandbox, the dev-only `@sparticuz/chromium` package supplies the browser via npm:

```sh
SANDBOX_CHROMIUM=1 npm run test:e2e
```

That switch extracts Chromium's Linux support libraries into `/tmp`; it is for the sandbox, not production. Browser binaries, test traces, node_modules, and build output are ignored and not committed. See `TESTING.md` for actual executed results and untested conditions.

## Known limits and honest next steps

- Not a RAW editor. No RAW/HEIC/SVG uploads, ICC-managed workflow, HDR, curves editor, arbitrary-angle straightening, draggable freehand crop, true layers, or reorderable effect stack.
- Contrast/brightness and hue are practical approximations in 8-bit sRGB. Sharpness/clarity use unsharp masking; local smoothing is feathered Gaussian blur, not edge-aware skin retouching. Preview/export detail effects may differ slightly by scale.
- Browser memory and GPU capabilities vary. 40 MP decoding/export can still fail on low-memory devices. No cross-browser claim is made from Chromium-only tests. No heavy client segmentation model is downloaded.
- Preset previews show color grading on the source image, not every crop/text overlay. Presets replace adjustments; they do not destroy the original. Undo allows recovery.
- Saved projects are browser/origin-specific. They are not encrypted by this app and are not synced or backed up. Private browsing, site-data clearing, storage eviction, or changing hosts can lose access. Export important work.
- Uploads save the original, but later changes need Save. The back-to-projects control and browser unload warn about dirty work; other in-app links are not a comprehensive route blocker.
- Offline prompts are intentionally limited. Gemini quota, model availability, live analysis, and provider errors require testing with a real server-side key and network access before calling that integration production-verified.
- No deployment or live third-party AI request was performed. No claim of full production certification, automatic remote deletion, or unlimited API use is made.

## Acharya Stdio branding

The display name, wordmark suffix, vector-logo path, and export filename suffix live in `src/lib/config.ts`. The app uses a custom angular **A monogram** in charcoal and soft lime, with matching navigation, editor, and favicon assets. The brand is spelled **Acharya Stdio**, as requested.

The existing `pixora-studio` IndexedDB ID and `PIXORA_SETUP_TOKEN` / `x-pixora-setup-token` configuration identifiers are deliberately retained for compatibility. Existing projects, saved preferences, and server-key configuration do not need migration. These are internal legacy identifiers, not the public product name.
