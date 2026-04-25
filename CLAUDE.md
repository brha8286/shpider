# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`shpider` is a **customer-onboarding factory** for startup organizers — specifically sound-system collectives. The goal is to make designing, producing, hosting, and maintaining a customer's marketing site and supporting IT as close to zero-effort as possible, so that [venyou](../subculture/venyou) (the internal event-ops app at `~/subculture/venyou`) can be sold as a paid add-on service on top.

Concretely, each customer gets:
1. A branded landing/marketing site under `sites/<customer>/` (this repo).
2. DNS, email, and hosting wiring consolidated onto Cloudflare.
3. Their own independent venyou instance with its own Postgres database (lives in the venyou repo, not here).

The first dogfood customer is **Motif** (sound collective in Lubbock TX, domain `motifmovement.com` at GoDaddy). Treat `sites/motif/` as the reference implementation that later customers will be forked from.

## Architecture

### One Astro project per customer

Each customer site is a fully self-contained Astro 5 + Tailwind v4 project inside `sites/<customer>/`. There is intentionally **no shared component library or monorepo tooling yet** — duplication across sites is fine until patterns stabilize. When a new customer comes in, copy an existing site directory and edit in place rather than prematurely abstracting a template.

Stack per site:
- **Astro 5** static SSG with file-based routing in `src/pages/`
- **Tailwind v4** via `@tailwindcss/vite` (not the PostCSS plugin) — theme tokens live in `src/styles/global.css` under `@theme { ... }`, imported once from `src/layouts/Layout.astro`
- **Wrangler** for `astro build && wrangler pages deploy dist --project-name=<customer>` to Cloudflare Pages

### Hosting model: all-Cloudflare, customer-owned domain

Customers keep their registrar (typically GoDaddy — GoDaddy's DNS API was killed for small accounts in 2024, so we delegate nameservers to Cloudflare rather than trying to manage records at the registrar). Cloudflare becomes authoritative DNS + hosts Pages. Brandon hands the two CF nameserver hostnames to the client, client pastes them into the registrar.

**Migration pattern for live domains** (critical — most customers will already have a live site + email attached to their domain):
1. Add zone to CF and **pre-stage every existing DNS record** (A/AAAA, MX, TXT/SPF/DKIM/DMARC, CNAMEs) exactly as it exists today — use `dig` to inventory first.
2. Have the client flip nameservers at the registrar. Nothing changes for users because CF is serving the same records.
3. Deploy the new site to a **preview subdomain** (e.g. `preview.customer.com`) on CF Pages. Iterate with client on preview.
4. Only on client signoff, swap the apex/www records to point at Pages. Fix any misconfigured email auth records (SPF/DKIM/DMARC) in the same cutover.

**Never flip nameservers before pre-staging records.** Forgetting a single MX record will take the customer's email offline.

### Cloudflare credentials

The CF API token is kept outside the repo at `~/.config/shpider/cloudflare.env` (chmod 600). Source it before running API calls:

```sh
set -a; . ~/.config/shpider/cloudflare.env; set +a
curl -s https://api.cloudflare.com/client/v4/user/tokens/verify \
  -H "Authorization: Bearer $CF_API_TOKEN"
```

Token scopes needed for end-to-end automation: Account → Zone → Edit, Account → Cloudflare Pages → Edit, Account → Workers Scripts → Edit, Zone → DNS → Edit, Zone → Zone → Read. If a `POST /zones` call returns `"Requires permission com.cloudflare.api.account.zone.create"`, the token is missing **Account → Zone → Edit** (not the Zone-level one) — this is a common footgun.

### Relationship to venyou

`~/subculture/venyou` is a separate Next.js 15 / Prisma / Postgres app deployed on Railway. shpider sites do not import from it. The integration point is a public booking-inquiry endpoint (to be built in venyou) that customer contact forms POST to — the form lives in `sites/<customer>/src/pages/contact.astro` and the backend lives in venyou. Each customer gets their own venyou Postgres DB.

## Commands

All commands run inside a specific site directory (`sites/<customer>/`), not at the repo root:

```sh
cd sites/motif
npm install           # first time only
npm run dev           # local dev server
npm run build         # static build into dist/
npm run preview       # serve dist/ locally
npm run deploy        # build + wrangler pages deploy (requires wrangler login)
```

There is no repo-root `package.json`, no shared lint/test config, and no CI yet. Add those only when a second or third site starts sharing real code.

### Content admin: events + gallery

Each customer site ships a self-contained content admin at `/admin`. It is password-protected and backed entirely by **Cloudflare KV** — no external service required. Customers log in and manage their own events and gallery photos without any code changes or rebuilds.

**How it works:**
- `functions/api/events.ts` — CRUD for events stored in KV under key `"events"`
- `functions/api/gallery.ts` — CRUD for gallery items; uploaded images stored as binary blobs under `image:<uuid>`, thumbnails under `image:<uuid>-thumb`
- `functions/api/image/[id].ts` — serves binary images from KV with immutable cache headers
- `functions/api/auth.ts` + `functions/api/_auth.ts` — cookie-based auth; password set via `ADMIN_PASSWORD` env var in CF Pages
- `src/pages/admin.astro` — the admin UI (events + gallery tabs, image upload with client-side thumbnail generation)
- `src/components/EventList.astro` — fetches `GET /api/events`, renders upcoming public events with skeleton loading
- `src/components/GalleryGrid.astro` — fetches `GET /api/gallery`, renders public gallery images (uses `thumbUrl` for display, links to full-res)

**Customer-specific constants (must update per site):**
- `functions/api/_auth.ts`: `COOKIE_NAME` → `<slug>_admin`, `DEFAULT_PASSWORD` → placeholder
- `wrangler.toml`: `name` and `[[kv_namespaces]] id` — each customer needs their own KV namespace
- CF Pages env vars: `ADMIN_PASSWORD` set for both Production and Preview environments

**Bulk upload utility:** `scripts/upload-gallery.mjs` — uploads local images to KV via the admin API. `scripts/generate-thumbs.mjs` — retroactively generates thumbnails for existing gallery items (requires `npm install sharp` at repo root).

## When adding a new customer

Use the `customer-site-scaffolder` agent — it handles steps 1–3 mechanically. Manual steps after scaffolding:

1. **Scaffold:** run `customer-site-scaffolder` with slug, domain, display name, location.
2. **KV namespace:** create a new namespace in CF dashboard → Workers & Pages → KV. Paste the ID into `sites/<slug>/wrangler.toml`.
3. **Admin password:** set `ADMIN_PASSWORD` in CF Pages → Settings → Environment Variables for both Production and Preview. Never ship the `change-me` default to a client.
4. **DNS inventory:** `dig` the customer's current domain before touching Cloudflare. Note MX, TXT (SPF/DKIM/DMARC), and any CNAMEs for mail services.
5. **Migration:** follow the 4-phase pattern above. Do not skip the preview-subdomain step.
