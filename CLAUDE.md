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

### Dynamic content: events + gallery

Customer sites fetch events and gallery data **client-side** from their venyou instance's public API. This means customers can update their own events and photos without any code changes or rebuilds.

Each customer site has a `.env` file with `PUBLIC_API_URL` pointing at their venyou instance's public API (e.g. `https://motif.venyou.app/api/public`). Astro inlines this at build time via `import.meta.env.PUBLIC_API_URL`.

Two Astro components handle the fetching:
- `src/components/EventList.astro` — fetches `GET /events`, renders upcoming public events
- `src/components/GalleryGrid.astro` — fetches `GET /gallery`, renders published gallery images

Both render loading skeletons server-side and replace them with live data on page load. If the API is unreachable or returns empty, they silently show an empty state — no errors on the public site.

The venyou-side public API lives at `src/app/api/public/{events,gallery}/route.ts` — read-only, rate-limited, CORS-restricted to the customer's domain. Customers toggle events and gallery items as public via the venyou admin dashboard.

## When adding a new customer

1. `cp -r sites/motif sites/<new-customer>` and strip placeholder copy.
2. Update `astro.config.mjs` `site:` URL and `package.json` `name` + `deploy` project name.
3. Set `PUBLIC_API_URL` in `sites/<new-customer>/.env` to the customer's venyou public API URL.
4. `dig` the customer's current domain to inventory existing records **before** touching Cloudflare. Note MX, TXT (SPF/DKIM/DMARC), and any CNAMEs for mail services (autodiscover, selector._domainkey, etc.).
5. Follow the 4-phase migration pattern above. Do not skip the preview-subdomain step — it's what lets the client approve the new site without any downtime risk to their current one.
