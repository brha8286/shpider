# Motif — Client Email Drafts

## Email 1: First look + asset request + email findings

Subject: Site preview + a couple things about your domain

---

Hey — site scaffold is up for a first look:
https://motif-624.pages.dev

Pages: home / about / gallery / events / merch / contact. Click around on your phone too — it's built mobile-first.

Each page tells you exactly what I need from you — click through and you'll see. The short version:

- Logo (SVG or high-res PNG ideally)
- 6–10 photos of the rig / past events / the crew
- Short paragraph about the collective
- Short paragraph about the system — specs, build history, what makes it yours
- Merch list with prices and product photos if you have them
- Any upcoming events with date / venue / ticket link
- Brand colors or fonts if you have a preference — otherwise I'll pick something that fits

Two things I found while setting up your domain that are worth mentioning:

1. Your email authentication (SPF record) is misconfigured. Right now it tells the world that GoDaddy sends mail for motifmovement.com, but your actual email runs on Microsoft 365. That means mail you send from Outlook is probably getting quietly junked or sent to spam by some recipients. Easy fix — I'll roll it in when we cut the site over. No action needed from you right now.

2. Your domain has a "pay.motifmovement.com" pointer set up through GoDaddy Commerce. Are you actively using GoDaddy's payment links? If not we can clean it up; if yes, it'll keep working as-is through the migration.

When you're ready to go live with the new site, I'll need you to update two nameserver values at GoDaddy — it's a 30-second change and I'll walk you through it. We'll only do that step after you've approved the final site.

Your email, calendar, and Teams will not be affected by any of this.

---

## Email 2: Site ready, requesting nameserver flip

Subject: Site is ready — one quick change needed on your end

---

Site's done — take a final look:
https://motif-624.pages.dev

If everything looks good, here's the one thing I need you to do:

1. Log into GoDaddy
2. Go to My Domains > motifmovement.com > DNS > Nameservers
3. Switch from "Default" to "Custom"
4. Replace the existing nameservers with these two:

   leia.ns.cloudflare.com
   leo.ns.cloudflare.com

5. Save

That's it. The change takes about an hour to fully propagate. During that time your current site and email keep working — nothing goes dark. Once it's propagated I'll do the final switchover on my end and your new site will be live at motifmovement.com.

Let me know once you've made the change and I'll monitor it from here.

---

## Email 3: Site is live

Subject: motifmovement.com is live

---

New site is live at motifmovement.com. Everything's on Cloudflare now — faster, more secure, and I can push updates in seconds.

A few things I fixed along the way:
- Your email authentication (SPF) now correctly points at Microsoft 365, so your outbound mail should land in inboxes more reliably
- DMARC is in place to protect against spoofing

One recommendation for later: enable DKIM signing in your Microsoft 365 admin center. I can walk you through it if you want — it's a 5-minute thing that further improves your email deliverability.

Hit me up if anything looks off.
