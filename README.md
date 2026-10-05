# StayDesk

AI front desk + website for guest houses. **One deployment, many businesses.** Everything is managed from a password-protected admin: no code changes to add, clone or edit a client.

| URL | What it is |
|---|---|
| `/admin` | Your admin panel (password-protected) |
| `/<slug>` | A business's public website with AI chat |
| `/embed/<slug>` | Chat only (used by the widget and admin preview) |
| `/widget.js` | Script to add the chat to a client's existing website |

## Run locally

```bash
npm install
cp .env.example .env.local      # then fill in the values
npm run dev                     # http://localhost:3000/admin
```

Minimum `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...     # or "mock" to demo without spending credit
ADMIN_PASSWORD=a-long-unique-password
SESSION_SECRET=<64 hex chars>    # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The database (`staydesk.db`) is created automatically, with The Stone Guest House as the first business. **All its details are placeholders**; replace them in the admin.

## Deploy (Vercel + Turso, both have free tiers)

1. **Database.** Create a Turso database: `turso db create staydesk`, then `turso db show staydesk --url` and `turso db tokens create staydesk`.
   The local SQLite file does **not** persist on Vercel; you must use Turso (or another libSQL host) in production.
2. **Push** this folder to a GitHub repo and import it on Vercel.
3. **Environment variables** on Vercel: `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `DATABASE_URL` (the `libsql://…` URL), `DATABASE_AUTH_TOKEN`, `NEXT_PUBLIC_BASE_URL` (your Vercel URL). Optional: `SMTP_*` for owner emails.
4. Deploy, open `/admin`, sign in.

## Daily use

- **New client:** Admin → New business → *Clone of …* → fill contacts, rooms, FAQs → Save. Their site is live at `/<slug>` immediately.
- **Client already has a website:** Publish & embed tab → copy the one-line script.
- **Inquiries:** Booking inquiries page. Click the contact to open WhatsApp or email; set status to Contacted / Booked / Lost.
- **Quality and proof:** Conversations page shows every transcript and its estimated AI cost.
- **Pause a non-paying client:** Publish & embed → toggle off. Site shows "unavailable", chat stops.

## What it does and doesn't do

- ✅ Answers from the facts you enter; captures booking inquiries with dates and contact; emails the owner (if SMTP set); logs cost.
- ❌ No availability calendar, no payments. Sell it as **"never miss an inquiry"**, not "automatic bookings".
- Images are URLs (host photos on the client's Facebook, Google Drive public link, Imgur, etc.).

## Security notes

- Admin: single password, timing-safe compare, 5 attempts / 15 min per IP, signed httpOnly `SameSite=Strict` session (12h), origin check on every write, auth re-checked in every page and API route (not only the proxy).
- Chat: history is stored server-side (guests can't forge earlier turns), 15 messages/min per IP, 30 turns per conversation, 1000 chars per message, prompt hardened against "ignore your instructions".
- Rate limits are in-memory per server instance: good against casual abuse, not a hard guarantee.
- **Daily AI spend cap** (`DAILY_AI_BUDGET_USD_PER_BUSINESS`, default $2; `DAILY_AI_BUDGET_USD_TOTAL`, default $10): once reached, the chat gives the business's contact details instead of calling the AI until local midnight. It uses the same token-price estimate as the dashboard, and concurrent requests can overshoot by a few turns, so still set a monthly spend limit in the Anthropic Console.
- AI calls share a 22 s deadline per message (10 s per call, at most one retry), so a slow API returns a polite fallback instead of the request being killed at the 30 s limit.
- Headers: CSP (scripts, styles, fonts and frames limited to this site and Google Fonts; images from any https host), HSTS in production, `X-Frame-Options: DENY` everywhere except `/embed/*`. CSP still allows inline scripts because Next.js needs them; removing that requires per-request nonces.

## Metrics: read them like a statistician

- **Inquiry rate** = conversations that produced an inquiry ÷ conversations, both counted over the conversations *started* this month (local time, `NEXT_PUBLIC_TIME_ZONE`). It is a proper proportion: one chat with a corrected booking counts once, not twice, and a deleted spam inquiry drops out.
- The dashboard shows the rate with a **95% Wilson score interval** instead of a bare percentage. At n = 20 and an observed 10% the interval is about 3%–30%: the data is consistent with a rate three times lower or three times higher. Don't compare two businesses (or two months) unless their intervals barely overlap. Even then, prefer a proper two-proportion test.
- Conversations are not unique visitors (one guest in two tabs = two conversations), so the rate is per conversation, not per person.
- "Marked booked" only counts what you update by hand. Treat it as a **lower bound**, and remember it measures inquiries → bookings, which StayDesk doesn't cause by itself.
- Before claiming "StayDesk got us X bookings" to a prospect, compare against a baseline period without it, ideally the same season. Otherwise you're claiming causation from a before-only observation (seasonality and confounding make that unsafe).
- Token cost is attributed to the month a conversation started. A chat that spans a month boundary is counted entirely in the first month.

## Tests

```bash
npm test          # unit tests for the statistics, time-zone and slug helpers
npm run typecheck
```
