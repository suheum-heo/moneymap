# 가계부

A personal budget tracker PWA built with Next.js. Multi-context, multi-currency, Google Sheets-backed, installable on iPhone.

## Features

- **Multiple contexts** — separate trackers for different life situations (e.g. Madison, Korea, Europe Trip)
- **Multi-currency** — each context has its own currency; travel contexts show converted amounts in your home currency
- **Google Sheets sync** — all data lives in Google Sheets, syncs across all devices and browsers in real time
- **Calendar view** — see spending by day, tap to view and edit entries
- **Budget goals** — set monthly limits per category with progress bars and warnings at 80% and 100%
- **Recurring payments** — save recurring items per context, tap to pre-fill the add form
- **Monthly comparison** — see how you're tracking vs last month
- **Location breakdown** — visualize spending by city
- **Search, filter, edit, delete** — full entry management with week filter and CSV export
- **Dark/light mode** — manual toggle, remembers your preference
- **PWA** — installable on iPhone via Safari, works like a native app

## Stack

- **Frontend** — Next.js 14, TypeScript, Tailwind CSS, Chart.js
- **Backend** — Next.js API routes, Google Sheets API (via service account)
- **Deployment** — Vercel

## Google Sheets setup

Create a Google Sheet with these tabs and headers:

| Tab | Headers |
|-----|---------|
| `Entries` | id · type · date · summary · venue · location · category · amount · remarks · currency · context |
| `Contexts` | id · name · currency · homeCurrency · startDate |
| `Budgets` | context · category · amount |
| `Recurring` | context · summary · category · amount · currency · remarks |

Share the sheet with your service account email (Editor access).

## Environment variables

Set these in Vercel → Settings → Environment Variables:

```
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
```

## Deploy

1. Fork or clone this repo
2. Set up Google Sheets and environment variables (see above)
3. Push to GitHub
4. Import to [vercel.com](https://vercel.com) — Next.js is auto-detected, hit Deploy

## Install on iPhone

1. Open your Vercel URL in **Safari**
2. Tap the Share button → **Add to Home Screen**
3. Tap **Add** — opens full screen like a native app

## Local dev

```bash
npm install
npm run dev
# Open http://localhost:3000
```

Copy `.env.local.example` to `.env.local` and fill in your Google credentials.
