# Publish Acharya Stdio for free

Developer: **Nishant Acharya**

## GitHub Pages frontend

The repository is public and the frontend is configured for this target address:

`https://nishantacharya51-debug.github.io/ai-image-editor-/`

## Current publishing mode: branch root

GitHub Pages is enabled for branch `arena/928435d6-ai-image-editor`, folder `/` (repository root). The root now contains the **compiled production website**, not the Vite/TypeScript source entry. `.nojekyll` keeps Pages from processing these static assets.

To update the public website:

```sh
npm ci
npm run publish:pages
git add .
git commit -m "Update published website"
git push origin arena/928435d6-ai-image-editor
```

GitHub automatically runs **pages build and deployment** when this source branch changes. Confirm that run succeeds before treating a new version as live.

- Editable HTML template: `web/index.html`
- React source: `src/`
- Generated root HTML, `assets/`, `fonts/`, and `images/`: deployment artifacts; do not hand-edit.
- `scripts/publish-pages.mjs`: builds with the correct `/ai-image-editor-/` base, copies the static build to the publishing root, and tracks generated files in `.pages-files.json`.
- `npm run dev` still runs the source app using `web/index.html`.

The optional `.github/workflows/pages.yml` workflow is now manual-only to avoid racing the branch-based publisher. You do **not** need to switch Pages to GitHub Actions for the current deployment.

The compiled frontend uses hash routes (`#/editor`, `#/account`) so direct links and reloads work without a backend server.

## Activate online accounts and per-user Gemini keys

The frontend does not create a Supabase project by itself. Follow **`supabase/README.md`** to apply the SQL migration, configure email authentication and delivery, set the server-only encryption secret and allowed origin, and deploy the `ai-gateway` Edge Function.

Then put these **public** values in your local untracked `.env` before running `npm run publish:pages` again (or use Actions variables if you intentionally switch to the optional workflow):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never add a Gemini key, Supabase service-role key, or encryption secret to a `VITE_` variable. Until this setup is complete, account screens explicitly explain that authentication is not configured and do not submit passwords. Local editing is still available.

## Limits checked October 14, 2026

GitHub Pages is available for public repositories on GitHub Free. Published sites have a 1 GB size limit, a soft 100 GB monthly bandwidth limit, and deployment timeouts after 10 minutes. This application is well below the artifact size limit. Pages is a static host, not a backend, and its usage policy does not permit using it primarily as a commercial SaaS/e-commerce service. Review the provider's policies before turning this independent free project into a commercial service.

Sources:

- https://github.com/github/docs/blob/main/data/reusables/gated-features/pages.md
- https://github.com/github/docs/blob/main/content/pages/getting-started-with-github-pages/github-pages-limits.md

Supabase's free quotas and SMTP caveats are documented separately in `supabase/README.md`. No paid hosting or provider billing was enabled.
