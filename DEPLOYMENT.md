# Publish Acharya Stdio for free

Developer: **Nishant Acharya**

## GitHub Pages frontend

The repository is public and the frontend is configured for this target address:

`https://nishantacharya51-debug.github.io/ai-image-editor-/`

This address is a deployment target, **not proof that publishing has finished**. On October 14, 2026, the connected GitHub integration returned HTTP 403 (`Resource not accessible by integration`) when asked to enable Pages. No Pages site was reported by the subsequent status lookup.

The workflow is `.github/workflows/pages.yml` and publishes from the fixed working branch `arena/928435d6-ai-image-editor`.

### Owner's one-time action

1. Open https://github.com/nishantacharya51-debug/ai-image-editor-/settings/pages
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. Open the repository's **Actions** tab, select **Publish Acharya Stdio**, and rerun the latest workflow from `arena/928435d6-ai-image-editor` if the first run failed before Pages was enabled.
4. Wait for the deploy job to succeed. GitHub will show the confirmed site URL in Settings → Pages and in the deployment job.

Alternatively, reconnect GitHub in Arena with the Pages and repository administration permissions needed to enable this site. Do not paste GitHub access tokens into chat.

The Pages build uses `/ai-image-editor-/` as its asset base and hash routing (`#/editor`, `#/login`, etc.) so direct links and reloads work without a custom server. All local editing, backups, recipes, analysis, and exports work independently of the cloud backend.

## Activate online accounts and per-user Gemini keys

The frontend does not create a Supabase project by itself. Follow **`supabase/README.md`** to apply the SQL migration, configure email authentication and delivery, set the server-only encryption secret and allowed origin, and deploy the `ai-gateway` Edge Function.

Then add these **public** GitHub repository Actions variables and rebuild:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Never add a Gemini key, Supabase service-role key, or encryption secret to a `VITE_` variable. Until this setup is complete, account screens explicitly explain that authentication is not configured and do not submit passwords. Local editing is still available.

## Limits checked October 14, 2026

GitHub Pages is available for public repositories on GitHub Free. Published sites have a 1 GB size limit, a soft 100 GB monthly bandwidth limit, and deployment timeouts after 10 minutes. This application is well below the artifact size limit. Pages is a static host, not a backend, and its usage policy does not permit using it primarily as a commercial SaaS/e-commerce service. Review the provider's policies before turning this independent free project into a commercial service.

Sources:

- https://github.com/github/docs/blob/main/data/reusables/gated-features/pages.md
- https://github.com/github/docs/blob/main/content/pages/getting-started-with-github-pages/github-pages-limits.md

Supabase's free quotas and SMTP caveats are documented separately in `supabase/README.md`. No paid hosting or provider billing was enabled.
