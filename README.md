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
- Rate limits are in-memory per server instance: good against casual abuse, not a hard guarantee. Watch the "Est. AI cost" card and set a monthly spend limit in the Anthropic Console.

## Metrics: read them like a statistician

- **Inquiry rate** = inquiries ÷ conversations. With small n it is noisy: at n = 20 and an observed 10%, a 95% Wilson interval is roughly 3%–30%. The dashboard flags n < 30.
- Conversations are not unique visitors, and "Marked booked" only counts what you update by hand. Treat booked counts as a lower bound unless you update every inquiry.
- Before claiming "StayDesk got us X bookings" to a prospect, compare against a baseline month without it. Otherwise you're claiming causation from a before-only observation.
