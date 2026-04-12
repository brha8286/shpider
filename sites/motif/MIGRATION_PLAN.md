# motifmovement.com — DNS Migration Plan

_Generated 2026-04-11 by dns-migration-auditor. Updated 2026-04-11 after CF auto-scan caught 3 records the initial dig probes missed and the zone was pre-staged._

**Domain:** motifmovement.com
**Customer slug:** motif
**Current registrar:** GoDaddy (NS `ns73.domaincontrol.com` / `ns74.domaincontrol.com`, SOA `jomax.net`)
**Target NS provider:** Cloudflare
**Target host:** Cloudflare Pages project `motif` (to be created)

## Cloudflare zone state (post pre-stage)

- **Zone ID:** `e9993ae34c3cd639884977c7f8047fbc` (saved to `~/.config/shpider/cloudflare.env` as `MOTIF_ZONE_ID`)
- **Account ID:** `4d03132f6eb711e955d8514e84921385` (saved as `CF_ACCOUNT_ID`)
- **Status:** `pending` (awaiting nameserver delegation at GoDaddy)
- **CF-assigned nameservers:**
  - `leia.ns.cloudflare.com`
  - `leo.ns.cloudflare.com`
- **Records pre-staged:** 16 (all DNS-only / gray cloud)
- **Pre-stage method:** CF dashboard "Add a site" quick-scan + API PATCH to disable proxy on every record

---

## Section A — Current state snapshot

All records below are authoritative as of audit time. TTLs are shown normalized to the record's configured value (dig responses can show ticking-down values).

| # | Type  | Name                                | Value                                                             | TTL  | Purpose |
|---|-------|-------------------------------------|-------------------------------------------------------------------|------|---------|
| 1 | A     | `@`                                 | `76.223.105.230`                                                  | 3600 | Squarespace origin (apex) |
| 2 | A     | `@`                                 | `13.248.243.5`                                                    | 3600 | Squarespace origin (apex) |
| 3 | CNAME | `www`                               | `motifmovement.com.`                                              | 3600 | www alias to apex |
| 4 | MX    | `@`                                 | `motifmovement-com.mail.protection.outlook.com.` (priority 0)     | 3600 | Microsoft 365 inbound mail |
| 5 | TXT   | `@`                                 | `MS=ms32406118`                                                   | 3600 | Microsoft 365 tenant verification |
| 6 | TXT   | `@`                                 | `v=spf1 include:secureserver.net -all`                            | 3600 | SPF — **BROKEN** (points at GoDaddy, MX is Outlook) |
| 7 | CNAME | `autodiscover`                      | `autodiscover.outlook.com.`                                       | 3600 | M365 Outlook client autoconfig |
| 8 | CNAME | `sip`                               | `sipdir.online.lync.com.`                                         | 3600 | Skype for Business / Teams legacy |
| 9 | SRV   | `_sip._tls`                         | `100 1 443 sipdir.online.lync.com.`                               | 3600 | Skype for Business / Teams legacy |
| 10| SRV   | `_sipfederationtls._tcp`            | `100 1 5061 sipfed.online.lync.com.`                              | 3600 | Skype federation legacy |
| 11| CNAME | `email`                             | `emaildot.godaddy.com.`                                           | 3600 | GoDaddy email marketing (likely unused) |
| 12| CNAME | `_domainconnect`                    | `_domainconnect.gd.domaincontrol.com.`                            | 3600 | GoDaddy Domain Connect integration (becomes meaningless after NS flip) |
| 13| TXT   | `_dmarc`                            | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | 3600 | DMARC quarantine policy — rua points at GoDaddy reporting |
| 14| CNAME | `lyncdiscover`                      | `webdir.online.lync.com.`                                         | 3600 | **[CF auto-scan]** Microsoft Teams / Skype for Business client discovery (lyncdiscover protocol) |
| 15| CNAME | `msoid`                             | `clientconfig.microsoftonline-p.net.`                             | 3600 | **[CF auto-scan]** Microsoft Online ID federation endpoint |
| 16| CNAME | `pay`                               | `paylinks.commerce.godaddy.com.`                                  | 3600 | **[CF auto-scan]** GoDaddy Commerce / payment links — **ASK CLIENT** |

**Records 14–16 were missed by the initial dig probe set but caught by CF's quick-scan.** They are now pre-staged exactly as-is in the CF zone. The `pay` record is the most notable — it's a GoDaddy Commerce endpoint, which suggests Motif may have set up a GoDaddy payment-links product (or set it up and abandoned it). Worth asking the client.

**Not found (worth noting):**
- No AAAA records anywhere (fine)
- No DKIM CNAMEs at `selector1._domainkey` / `selector2._domainkey` → **DKIM is not enabled in the M365 tenant** (see Section C)

---

## Section B — Pre-stage payloads

> ✅ **Section B is complete.** The zone was added via the CF dashboard quick-scan flow on 2026-04-11, and all 16 records were flipped to DNS-only via `PATCH /zones/{id}/dns_records/{rec_id}` with the existing `shpider-local` token. The curl payloads below are preserved as reference for the next customer; they were NOT used for Motif.

Before running any of these, create the zone in Cloudflare (either via dashboard or API with a token that has `Account → Zone → Edit`), then export:

```sh
set -a; . ~/.config/shpider/cloudflare.env; set +a
export ZONE_ID=<paste zone id here>
```

Then run the following in order. Each one must return `"success": true`. Every record is `proxied: false` at pre-stage time — that is intentional and non-negotiable.

### 1. A apex → 76.223.105.230

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"A","name":"@","content":"76.223.105.230","ttl":3600,"proxied":false,"comment":"Squarespace origin — pre-stage"}'
```

### 2. A apex → 13.248.243.5

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"A","name":"@","content":"13.248.243.5","ttl":3600,"proxied":false,"comment":"Squarespace origin — pre-stage"}'
```

### 3. CNAME www → motifmovement.com

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"CNAME","name":"www","content":"motifmovement.com","ttl":3600,"proxied":false,"comment":"www → apex"}'
```

### 4. MX @ → motifmovement-com.mail.protection.outlook.com (priority 0)

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"MX","name":"@","content":"motifmovement-com.mail.protection.outlook.com","priority":0,"ttl":3600,"proxied":false,"comment":"M365 inbound"}'
```

### 5. TXT @ → MS verification token

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"TXT","name":"@","content":"\"MS=ms32406118\"","ttl":3600,"proxied":false,"comment":"M365 tenant verification"}'
```

### 6. TXT @ → SPF (broken — preserved verbatim at pre-stage)

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"TXT","name":"@","content":"\"v=spf1 include:secureserver.net -all\"","ttl":3600,"proxied":false,"comment":"SPF — BROKEN, fix at cutover (see Section C)"}'
```

### 7. CNAME autodiscover → autodiscover.outlook.com

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"CNAME","name":"autodiscover","content":"autodiscover.outlook.com","ttl":3600,"proxied":false,"comment":"M365 Outlook autoconfig"}'
```

### 8. CNAME sip → sipdir.online.lync.com

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"CNAME","name":"sip","content":"sipdir.online.lync.com","ttl":3600,"proxied":false,"comment":"Skype for Business / Teams legacy"}'
```

### 9. SRV _sip._tls

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"SRV","name":"_sip._tls","data":{"service":"_sip","proto":"_tls","name":"motifmovement.com","priority":100,"weight":1,"port":443,"target":"sipdir.online.lync.com"},"ttl":3600,"comment":"Skype for Business legacy"}'
```

### 10. SRV _sipfederationtls._tcp

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"SRV","name":"_sipfederationtls._tcp","data":{"service":"_sipfederationtls","proto":"_tcp","name":"motifmovement.com","priority":100,"weight":1,"port":5061,"target":"sipfed.online.lync.com"},"ttl":3600,"comment":"Skype federation legacy"}'
```

### 11. CNAME email → emaildot.godaddy.com

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"CNAME","name":"email","content":"emaildot.godaddy.com","ttl":3600,"proxied":false,"comment":"GoDaddy email marketing (likely unused, confirm with client)"}'
```

### 12. CNAME _domainconnect → _domainconnect.gd.domaincontrol.com

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"CNAME","name":"_domainconnect","content":"_domainconnect.gd.domaincontrol.com","ttl":3600,"proxied":false,"comment":"GoDaddy Domain Connect — dead after NS flip but preserved for safety"}'
```

### 13. TXT _dmarc

```sh
curl -s -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"TXT","name":"_dmarc","content":"\"v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;\"","ttl":3600,"proxied":false,"comment":"DMARC quarantine; rua points at GoDaddy (see Section C)"}'
```

**After all 13 succeed**, verify with:

```sh
curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?per_page=200" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  | jq '.result | length, [.[] | {type, name, content}]'
```

Expect `13` and a list that matches Section A line-for-line.

---

## Section C — Risks and flags

### `[FIX-AT-CUTOVER]` SPF points at the wrong provider

**Current:** `v=spf1 include:secureserver.net -all`
**Problem:** MX is Microsoft 365 (`*.mail.protection.outlook.com`), but SPF authorizes GoDaddy's mail servers. Any legitimate mail sent *from* the M365 tenant fails SPF at the recipient, which — combined with `_dmarc p=quarantine` — means outbound mail is being quietly quarantined or junked at many recipients.
**Fix at cutover:** replace record 6 with:
```
v=spf1 include:spf.protection.outlook.com -all
```
**Before running the fix, tell the client.** This is a real change to their email posture. Do not sneak it in.

### `[FIX-AT-CUTOVER]` DMARC aggregate reports are going into GoDaddy's void

**Current:** `rua=mailto:dmarc_rua@onsecureserver.net`
**Problem:** `onsecureserver.net` is GoDaddy's DMARC reporting endpoint. After NS flip away from GoDaddy, those reports are worthless (and may have never been useful to the client anyway — they don't have access to a GoDaddy DMARC report viewer).
**Fix at cutover (optional):** replace the rua with a real client-owned mailbox, e.g. `dmarc@motifmovement.com` or a dedicated dmarc aggregator (Postmark, Dmarcian, URIports). Ask the client first.

### `[INFO]` DKIM is not enabled in the M365 tenant

**Evidence:** `selector1._domainkey.motifmovement.com` and `selector2._domainkey.motifmovement.com` return NXDOMAIN.
**Why it matters:** With DMARC at `p=quarantine` but DKIM not published, the tenant is relying solely on SPF for authentication. Once the SPF fix lands, that's functional but fragile. Enabling DKIM in Microsoft 365 Defender publishes two CNAMEs to the tenant's default DKIM key that then need to be added to the CF zone.
**Action:** post-cutover, coordinate with the client to enable DKIM in M365 admin center → Email Authentication Settings → DKIM → rotate keys for motifmovement.com. M365 will show two CNAME values to add to CF.

### `[INFO]` Unknown purpose: `email.motifmovement.com` → `emaildot.godaddy.com`

This is likely a dormant GoDaddy email marketing / GoCentral setup that nobody actively uses. Preserved in pre-stage out of caution. At cutover, ask the client whether they use any GoDaddy email marketing product — if not, drop the record.

### `[INFO]` `_domainconnect` will be meaningless after NS flip

`_domainconnect.gd.domaincontrol.com` is GoDaddy's own service discovery endpoint for 3rd-party app integrations (Office 365 setup wizards, etc.). Once nameservers are on Cloudflare, this CNAME no longer functions — but leaving it in place causes no harm. Can be dropped at any post-cutover cleanup pass.

### `[INFO]` TTLs are 3600 across the board

Good. One-hour TTL means propagation after NS flip is bounded at ~60 min worst case, much faster in practice.

### `[BLOCKERS]`

**None.** All 13 records are present in the pre-stage plan and preserve current behavior byte-for-byte.

---

## Section D — Cutover delta

This is the set of changes applied **only after** `cutover-preflight` returns GO and the client has signed off on the new site via the `preview.motifmovement.com` subdomain.

| # | Action    | Record                 | Old value                              | New value                                           | Why |
|---|-----------|------------------------|----------------------------------------|-----------------------------------------------------|-----|
| 1 | Replace   | A `@`                  | `76.223.105.230` + `13.248.243.5`      | CF Pages project `motif` (attach custom domain `motifmovement.com` in the Pages UI — CF will create a proxied record automatically; `proxied: true` once this happens) | Point apex at new site |
| 2 | No change | CNAME `www`            | `motifmovement.com`                    | `motifmovement.com` (still, but proxied via apex)   | www continues to alias apex |
| 3 | Replace   | TXT `@` SPF            | `v=spf1 include:secureserver.net -all` | `v=spf1 include:spf.protection.outlook.com -all`    | Fix broken SPF (Section C) |
| 4 | Optional  | TXT `_dmarc`           | `rua=mailto:dmarc_rua@onsecureserver.net` | `rua=mailto:dmarc@motifmovement.com` (or similar) | Reclaim DMARC visibility (ask client) |
| 5 | Optional  | CNAME `email`          | `emaildot.godaddy.com`                 | _delete_                                            | If client confirms GoDaddy email marketing is unused |
| 6 | Optional  | CNAME `_domainconnect` | `_domainconnect.gd.domaincontrol.com`  | _delete_                                            | Dead after NS flip; harmless to leave |
| 7 | Post-cutover | CNAME `selector1._domainkey`, `selector2._domainkey` | — | Values provided by M365 admin center | Enable DKIM |

**Records that do NOT change at cutover** (records 4, 5, 7, 8, 9, 10 from Section A): M365 MX, MS verification, autodiscover, sip, _sip._tls, _sipfederationtls._tcp. Email and Teams continue working identically from the customer's perspective.

---

## Next steps

1. **Create the zone in Cloudflare** (dashboard or API-with-zone-create-token)
2. **Export `ZONE_ID`** from the zone-create response
3. **Run Section B in order**, verifying `"success": true` on each
4. **Run the `jq` verification** at the end of Section B
5. **Hand the two CF nameserver hostnames** to the Motif client — they paste them into GoDaddy
6. **Wait for zone `status: active`** in the CF API (poll `GET /zones/$ZONE_ID`)
7. **Deploy Motif preview site** to `preview.motifmovement.com` via CF Pages
8. **Tell the client about the broken SPF** and the DKIM-not-enabled flag — get approval for Section D changes
9. **Run `cutover-preflight`** immediately before flipping apex
10. **Execute Section D** on GO verdict

Do not skip step 8. Do not skip step 9.
