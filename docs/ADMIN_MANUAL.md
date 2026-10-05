# StayDesk admin manual

For the person who runs StayDesk and sets up guest houses. Everything here happens in the admin panel at `https://<your-domain>/admin`. No code changes are needed.

**Contents:** [Signing in](#1-signing-in) · [Adding a guest house](#2-adding-a-guest-house) · [Editing a guest house](#3-editing-a-guest-house) · [Changing the page headings](#4-changing-the-page-headings) · [Testing the AI](#5-testing-the-ai-receptionist) · [Going live](#6-going-live) · [Daily work: inquiries](#7-daily-work-booking-inquiries) · [Conversations](#8-reviewing-conversations) · [The overview numbers](#9-reading-the-overview-numbers) · [Pausing and deleting](#10-pausing-and-deleting) · [Security](#11-security) · [Troubleshooting](#12-troubleshooting)

---

## 1. Signing in

1. Open `/admin`. Enter the admin password (the `ADMIN_PASSWORD` set in Vercel). The eye button shows what you typed.
2. You stay signed in for 12 hours. **Sign out** is at the bottom of the left menu.
3. After 5 wrong passwords, sign-in is blocked for 15 minutes from that connection.

---

## 2. Adding a guest house

1. Click **New business**.
2. **Business name**: e.g. `Mountain View Lodge`.
3. **Web address**: filled in from the name (`mountain-view-lodge`). The site will live at `/<web address>`. Only lowercase letters, numbers and dashes.
4. **Start from**:
   - **Blank business**: empty profile.
   - **Clone of …**: copies rooms, policies, FAQs, AI notes, colours and page headings from an existing guest house, and **clears** its phone, WhatsApp, emails, address, map link, booking link and photo. Faster when two places are similar, but **check every copied price and policy**: a cloned rate that's wrong is the AI's most likely way to mislead a guest.
5. Click **Create business**. You land in the editor.

---

## 3. Editing a guest house

Admin → **Businesses** → **Edit**. The tabs on the left are explained below. Changes are not live until you click **Save changes** (or **Save** in the bar at the bottom). Leaving the page with unsaved changes asks you to confirm.

### Brand
| Field | What it does |
|---|---|
| Business name | Big title on the website, the chat header and the AI's name for the property |
| Tagline | One line under the name; also used by Google and the share card |
| About | Short paragraph on the site; the AI reads it too |
| Brand colour | Buttons, accents, chat bubble. Text colour on buttons adjusts automatically for readability |
| Currency symbol | `M` for maloti, `R` for rand |
| Hero image URL | Wide photo at the top. Must start with `https://`. Keep it under ~300 KB so the page loads fast on mobile data |

### Contact & location
- **WhatsApp number**: digits only with country code, e.g. `26658000000`. Enables the "Book now" and "Ask about this room" WhatsApp buttons.
- **Owner email**: where new booking inquiries are emailed (only if SMTP is set up in Vercel). Not shown to guests.
- **Guest-facing email / phone**: shown on the site.
- **Directions, address, Google Maps link**: shown on the site and used by the AI for "how do I get there?".

### Rooms & rates
- **Check-in / check-out** times.
- One card per room: **name, sleeps, nightly rate, description, photo URL**. Use the arrows to reorder, the bin to delete.
- The AI quotes these rates exactly. **When the owner changes prices, update them here the same day.**

### Amenities & policies
- Short items, one per line: "Free WiFi", "Secure parking", "50% deposit confirms the booking".
- The AI answers policy questions only from this list. If a policy isn't here, the AI says the team will confirm.

### Page headings
See [section 4](#4-changing-the-page-headings).

### AI receptionist
- **Chat greeting**: the first message guests see.
- **Notes for the AI**: tone and context, e.g. "Most guests are NGO staff; mention we issue invoices." Don't put prices here; prices belong in Rooms & rates.
- **FAQs**: the questions guests ask most, with the owner's exact answers. These are the AI's best source of truth.
- **Test the receptionist**: see [section 5](#5-testing-the-ai-receptionist).

### Publish & embed
- **Status switch**: live or paused (see [section 10](#10-pausing-and-deleting)).
- **Web address**: changing it **breaks old links and embed codes**; avoid it once a site is shared.
- **Embed code**: for owners who already have a website (see [section 6](#6-going-live)).

---

## 4. Changing the page headings

Each guest house can have its own section headings, for example in Sesotho, or wording that fits a hotel rather than a guest house.

1. Admin → **Businesses** → **Edit** the guest house → **Page headings** tab.
2. Each section of the website has up to three boxes:

| Box | Where it appears | Example default | Example custom |
|---|---|---|---|
| **Small line** | Small coloured words above the heading | `Stay` | `Robala le rona` |
| **Heading** | The large section title | `Rooms & rates` | `Likamore le litheko` |
| **Menu word** | The top menu on computers (keep it to 1–2 words) | `Rooms` | `Likamore` |

3. The sections are **Rooms**, **Amenities**, **Policies** (not in the top menu), **Location** and **FAQ**.
4. **Leave a box empty to keep the default**, shown in grey inside the box.
5. Click **Save changes**, then **View site** to check.

Good to know:
- Headings change **only this guest house's** website. Cloning a guest house copies its headings to the new one.
- A section with nothing in it (e.g. no FAQs entered) is hidden along with its heading and menu word.
- Headings don't change what the AI says. To make the AI reply in Sesotho, nothing is needed: it answers in the guest's language. To set its tone, use **Notes for the AI**.
- Limits: small line 40 characters, heading 80, menu word 24.

---

## 5. Testing the AI receptionist

Do this for **every new guest house before sharing the link**, and again after big changes.

1. Save your changes (the preview only uses saved data; the badge says *Save to test latest changes* if you haven't).
2. **AI receptionist** tab → **Test the receptionist** → chat as a guest would.
3. Try at least:
   - "How much is a room?" → rates must match the Rooms tab exactly.
   - "Do you have a pool?" (when there isn't one) → it must **not** say yes.
   - "How do I get there?" → uses the directions.
   - "I want to book for next Friday, 2 nights, 2 people, my number is 266…" → it should collect details and confirm the team will be in touch. Check **Booking inquiries**: the inquiry should show the correct dates (e.g. `Fri 9 Oct 2026 → Sun 11 Oct 2026 · 2 nights`).
4. If an answer is wrong, **fix the facts** (Rooms, Policies, FAQs) rather than writing "don't say X" in the notes.

Test chats count in the statistics and cost a little AI credit; that's fine.

---

## 6. Going live

Two options; you can use both.

**A. The StayDesk website:** share `https://<your-domain>/<web address>` with the owner. Put it on their WhatsApp Business profile, Facebook page and Google Business profile.

**B. Chat on the owner's existing website:** Publish & embed → copy the script line → the owner's web designer pastes it just before `</body>`. A chat button appears bottom-right.

---

## 7. Daily work: booking inquiries

Admin → **Booking inquiries**. Each row is a guest who asked to book through the chat.

1. Click the guest's contact to open **WhatsApp** (or email) and confirm availability with them.
2. Set the **status**:
   - **New**: not yet handled
   - **Contacted**: you or the owner replied
   - **Booked**: the guest confirmed
   - **Lost**: no reply, or they booked elsewhere
3. Filter by business or status at the top.
4. The chat icon opens the full conversation behind the inquiry.
5. Delete only spam. Deleted inquiries also drop out of the statistics.

**Dates:** where the AI could work out exact dates, you see `Fri 9 Oct 2026 → Sun 11 Oct 2026 · 2 nights` with the guest's own words underneath. If you only see the guest's words (e.g. "end of the month"), the AI couldn't pin the dates down: **confirm them with the guest**.

**Keep statuses up to date weekly.** "Booked" numbers only count what is marked, and they are the proof you show clients.

---

## 8. Reviewing conversations

Admin → **Conversations** lists every chat, newest first, with its AI cost and an **Inquiry** badge when it led to one.

Read a sample every week, especially for new clients. Look for:
- invented prices, rooms or facilities → fix the facts in the editor;
- questions the AI couldn't answer → add them as **FAQs**;
- guests who wanted to book but no inquiry was recorded → tell your developer (this is a missed booking).

---

## 9. Reading the overview numbers

Admin → **Overview** shows the current month (local time) across all guest houses.

| Number | Meaning | Read it carefully because… |
|---|---|---|
| Conversations | Chats started this month | One guest on two devices = two chats |
| Booking inquiries | Inquiries recorded this month | |
| Inquiry rate (95% CI) | Share of this month's chats that led to an inquiry, with a range | With few chats the range is wide: "50%, 9–91%" means *we don't know yet* |
| Marked booked | Inquiries you set to Booked | A minimum: unmarked bookings aren't counted |
| Est. AI cost | Estimated AI spend | Estimate from token prices; the bill comes from Anthropic |

Don't compare two guest houses, or two months, until the ranges barely overlap. Seasons and holidays move these numbers more than anything StayDesk does.

---

## 10. Pausing and deleting

- **Pause** (Publish & embed → switch off): the website shows "temporarily unavailable", the chat stops answering, the site leaves Google's index over time. All data is kept. Use it when a client stops paying. Switch on to resume.
- **Daily AI limit:** if a guest house reaches its daily AI budget, its chat tells guests to contact the owner directly until midnight. This protects you from abuse. Ask your developer to raise `DAILY_AI_BUDGET_USD_PER_BUSINESS` if a busy client hits it regularly.
- **Delete** (Publish & embed → Delete): permanently removes the site, its inquiries and conversations. You must type the web address to confirm. **It cannot be undone**, and there is no export: copy any inquiries you need before deleting.

---

## 11. Security

- Use a long, unique admin password. Never send it on WhatsApp or email.
- To lock everyone out (e.g. a laptop was stolen): change `ADMIN_PASSWORD` in Vercel and redeploy. All existing sign-ins stop working immediately.
- Guest names and phone numbers are personal data. Don't export or share them beyond the guest house they belong to, and delete old inquiries you no longer need.

---

## 12. Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Saving shows an error like "email: Invalid email" | A field is in the wrong format | Fix the named field (URLs must start with `https://`, WhatsApp is digits only) |
| "That web address is already used / reserved" | Another business has it, or it's a system word (`admin`, `api`…) | Pick another |
| Chat says "Our assistant is resting for today" | Daily AI budget reached | Wait until midnight, or raise the limit |
| Chat says "Sorry, I'm having trouble right now" | AI service down or slow, or API key/credit problem | Check the Anthropic Console for credit and status |
| Owner gets no inquiry emails | SMTP not set, or owner email empty | Set the owner email in Contact; ask your developer to check `SMTP_*` |
| Site shows old prices | Not saved, or browser cache | Click Save; refresh the site |
| Photo doesn't show | Link isn't a direct, public `https://` image | Open the link in a private window; it must show only the image |
