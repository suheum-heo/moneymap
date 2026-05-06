# 가계부

A personal budget tracker PWA built with Next.js and Supabase. Multi-user, multi-context, multi-currency, installable on iPhone.

## Features

- **Auth** — magic link login (no password), each user's data fully isolated
- **Multiple contexts** — separate budgets for different life situations (school, home country, travel)
- **Multi-currency** — each context has its own currency with live exchange rates
- **Live exchange rates** — auto-fetched from Frankfurter API, cached for 1 hour
- **Calendar view** — see spending by day, tap to view and edit entries inline
- **Budget goals** — set monthly limits per category with progress bars, warns at 80% and 100%
- **Recurring payments** — save recurring items, tap to pre-fill the add form
- **Monthly comparison** — track spending vs last month full and vs same day last month
- **Location breakdown** — visualize spending by city with charts
- **Custom categories** — add and remove expense/income categories per user
- **Search, filter, edit, delete** — full entry management with week filter and CSV export
- **Click to drill down** — tap Expenses/Income cards to filter entries, tap category to expand entries
- **Dark/light mode** — manual toggle, remembers your preference
- **i18n** — 7 languages: English, 한국어, 日本語, 简体中文, Español, Français, Deutsch
- **PWA** — installable on iPhone via Safari, works like a native app
- **Responsive** — desktop sidebar layout, mobile stacked layout with arrow month navigation

## Stack

- **Frontend** — Next.js 14, TypeScript, Tailwind CSS, Chart.js, i18next
- **Backend** — Supabase (auth + PostgreSQL with RLS)
- **Deployment** — Vercel
- **Exchange rates** — Frankfurter API (proxied via Next.js API route)

## Database setup

Create a Supabase project and run the SQL in `supabase/schema.sql` to set up tables and RLS policies:

- `profiles` — auto-created on signup via trigger
- `contexts` — budget contexts per user
- `entries` — expense/income entries
- `budgets` — monthly budget limits per category
- `recurring` — recurring payment templates
- `categories` — custom expense/income categories

## Environment variables

Set these in Vercel → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_legacy_anon_key
```

## Deploy

1. Fork or clone this repo
2. Create a Supabase project and run the schema SQL
3. Add environment variables to Vercel
4. Import repo to [vercel.com](https://vercel.com) — Next.js is auto-detected, hit Deploy
5. Set your Vercel URL in Supabase → Authentication → URL Configuration

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

Create `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_legacy_anon_key
```
