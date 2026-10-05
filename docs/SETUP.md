# StayDesk setup guide: deploy, domain, Google

Three things only you can do, because they need your own accounts. Do them in this order; each takes 5–15 minutes.

1. [Deploy with the right environment variables](#1-deploy-on-vercel-with-a-turso-database)
2. [Point your domain at it and set `NEXT_PUBLIC_BASE_URL`](#2-your-domain-and-next_public_base_url)
3. [Verify Google Search Console and submit the sitemap](#3-google-search-console)

Then [check it worked](#4-check-it-worked) and [measure honestly](#5-measuring-whether-seo-is-working).

> Menus in Vercel, Turso and Google change names from time to time. If a button below isn't where described, search the page for the quoted words.

---

## 1. Deploy on Vercel with a Turso database

**Why Turso:** Vercel's filesystem is wiped on every deploy, so the local `staydesk.db` file would lose every business, inquiry and conversation. Turso is hosted SQLite and the code already supports it.

### 1a. Create the database

```bash
# Install the Turso CLI: https://docs.turso.tech/cli/installation
turso auth login
turso db create staydesk
turso db show staydesk --url        # → libsql://staydesk-<you>.turso.io   (DATABASE_URL)
turso db tokens create staydesk     # → a long token                       (DATABASE_AUTH_TOKEN)
```

Tables are created automatically on the first request.

### 1b. Generate the session secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 1c. Import the repo on Vercel

1. vercel.com → **Add New… → Project** → import `victormonyekem02-sudo/staydeck`. Framework is detected as Next.js; leave build settings as they are.
2. Before the first deploy, open **Environment Variables** and add:

| Variable | Value | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | from console.anthropic.com | yes |
| `ADMIN_PASSWORD` | long and unique (a passphrase of 4+ random words) | yes |
| `SESSION_SECRET` | output of step 1b | yes |
| `DATABASE_URL` | `libsql://…` from step 1a | yes |
| `DATABASE_AUTH_TOKEN` | token from step 1a | yes |
| `NEXT_PUBLIC_BASE_URL` | your final URL, **no trailing slash** (see step 2) | yes |
| `NEXT_PUBLIC_TIME_ZONE` | `Africa/Johannesburg` (or your IANA zone) | optional |
| `DAILY_AI_BUDGET_USD_PER_BUSINESS` | `2` | optional |
| `DAILY_AI_BUDGET_USD_TOTAL` | `10` | optional |
| `GOOGLE_SITE_VERIFICATION` | leave empty for now (step 3) | optional |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | your mail provider, to email owners | optional |

3. **Deploy**, then open `https://<your-url>/admin` and sign in.
4. In the **Anthropic Console**, set a **monthly spend limit**. The daily cap in the app is an estimate; the console limit is the hard stop.

> Changing `ADMIN_PASSWORD` later signs everyone out. That's intended: if the password leaks, change it and every stolen session dies.

---

## 2. Your domain and `NEXT_PUBLIC_BASE_URL`

**Why it matters:** canonical URLs, `sitemap.xml`, `robots.txt`, share cards and the embed snippet are all built from `NEXT_PUBLIC_BASE_URL`. If it's wrong, you are telling Google that the "real" page lives somewhere else.

1. Vercel → your project → **Settings → Domains** → add your domain (e.g. `staydesk.co.ls` or `book.yourbrand.com`).
2. At your domain registrar, create the DNS record Vercel shows you (usually an `A` record for the bare domain or a `CNAME` for a subdomain). Wait until Vercel shows **Valid Configuration**. HTTPS certificates are issued automatically.
3. Pick **one** address as the main one (with or without `www`) and have the other redirect to it. Vercel offers this when you add both.
4. Set `NEXT_PUBLIC_BASE_URL` to exactly that address, e.g. `https://staydesk.co.ls`.
5. **Redeploy** (Deployments → ⋯ → Redeploy). `NEXT_PUBLIC_*` values are baked in at build time; changing the variable alone does nothing until you rebuild.

If you don't have a domain yet, use the Vercel URL (`https://<project>.vercel.app`) and repeat steps 4–5 when you get one. Expect Google to take a while to re-learn the new address.

---

## 3. Google Search Console

### 3a. Verify ownership

Two options. Use **A** if you control DNS; it covers every page and subdomain.

**A. Domain property (DNS)**
1. search.google.com/search-console → **Add property** → **Domain** → enter `yourdomain.com`.
2. Google shows a `TXT` record. Add it at your registrar, wait a few minutes, click **Verify**.
3. Nothing to change in StayDesk.

**B. URL-prefix property (HTML tag), already built in**
1. **Add property** → **URL prefix** → enter exactly your `NEXT_PUBLIC_BASE_URL`.
2. Choose **HTML tag**. Google shows `<meta name="google-site-verification" content="ABC123…" />`.
3. Copy **only** the `content` value (`ABC123…`) into Vercel as `GOOGLE_SITE_VERIFICATION`, then **redeploy**.
4. Check the tag is live (see section 4), then click **Verify**. Keep the variable set; removing it can un-verify the property.

### 3b. Submit the sitemap

1. In the property: **Sitemaps** → enter `sitemap.xml` → **Submit**.
2. Status should become **Success** with a "discovered pages" count equal to 1 + your number of **live** businesses.
3. New businesses are added to the sitemap automatically; you don't resubmit.

### 3c. Ask Google to crawl the important pages now (optional)

**URL inspection** → paste `https://yourdomain/<slug>` → **Request indexing**. Do this for each new client site. There is a daily quota, and it speeds up discovery; it doesn't guarantee ranking.

---

## 4. Check it worked

Replace `https://yourdomain` and `<slug>` below.

```bash
curl -s https://yourdomain/robots.txt               # Disallow /admin, /api/, /embed/ + Sitemap line
curl -s https://yourdomain/sitemap.xml              # your live businesses, on YOUR domain
curl -s https://yourdomain/<slug> | grep -o '<link rel="canonical"[^>]*>'
curl -s https://yourdomain/<slug> | grep -o '<meta name="google-site-verification"[^>]*>'   # only if you used 3a-B
curl -sI https://yourdomain/<slug>/opengraph-image | head -1                                 # HTTP/2 200
```

If any URL above shows `localhost` or the `.vercel.app` address, `NEXT_PUBLIC_BASE_URL` is wrong or you didn't redeploy.

Then use Google's and Meta's own checkers:
- **Rich Results Test** (search.google.com/test/rich-results) on `https://yourdomain/<slug>`: should detect a **LodgingBusiness** with no errors. Warnings about missing optional fields (e.g. no street address) mean that field is empty in the admin. Fill it in, don't fake it.
- **PageSpeed Insights** (pagespeed.web.dev) on the same URL, **mobile** tab. Large or slow hero photos are the most likely problem; ask owners for images under ~300 KB.
- **Share preview:** paste the link into a WhatsApp chat to yourself, or use Facebook's **Sharing Debugger** (developers.facebook.com/tools/debug) and click **Scrape Again** after changes.

---

## 5. Measuring whether SEO is working

Search Console → **Performance** gives impressions, clicks, CTR and average position per page and query. Read them with care:

- **Wait before judging.** Indexing new pages usually takes days to weeks; ranking settles over weeks to months. A one-week dip or spike is mostly noise.
- **Compare like with like.** Use Performance → **Date → Compare** with equal-length windows (e.g. 28 days vs the previous 28, or the same 28 days last year). Tourism is seasonal: comparing December with October measures the season, not your SEO.
- **Small numbers are noisy.** Clicks behave roughly like counts from a Poisson process, whose standard deviation is about √n. Going from 16 clicks to 25 looks like +56%, but √16 = 4, so 16 ± 8 already covers most of that range. Don't celebrate or panic until the counts are in the hundreds, or the change holds for several consecutive periods.
- **Impressions before clicks.** Impressions rising while clicks stay flat means you're being shown but not chosen: improve the title and description (the tagline and About fields), not the technical setup.
- **Don't credit SEO for every booking.** A month with more inquiries may come from a holiday, an event or a price change. Before telling a client "the site got you X bookings", look at where the visit came from (Search Console clicks to their page) and compare it with the same period before launch.
