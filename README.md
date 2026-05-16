# MoneyMap

A personal budget tracker PWA — multi-user, multi-currency, installable on iPhone.

**Live**: [moneymap-io.vercel.app](https://moneymap-io.vercel.app)

## What it does

MoneyMap lets you track expenses and income across multiple life contexts — school, home country, travel, wherever. Each user gets their own isolated data, and everything syncs across devices in real time.

- **Google OAuth** — one-tap sign in, no passwords
- **Multiple budgets** — separate contexts for different situations (e.g. Madison 25-26, Korea Summer, Europe Trip)
- **Multi-currency** — each context has its own currency, with live exchange rates auto-fetched hourly
- **Calendar view** — see spending by day, tap to edit entries inline
- **Budget goals** — set monthly limits per category, with progress bars and warnings at 80% / 100%
- **Recurring payments** — save templates, tap to pre-fill the add form
- **Custom categories** — add and remove your own expense/income categories
- **Monthly comparison** — track vs last month full and vs same day last month
- **Location breakdown** — visualize spending by city
- **Search, filter, export** — filter by type, category, or week; export to CSV
- **7 languages** — English, 한국어, 日本語, 简体中文, Español, Français, Deutsch
- **Dark mode** — manual toggle, remembers your preference
- **PWA** — installable on iPhone via Safari, feels like a native app

## Stack

- **Frontend** — Next.js 14, TypeScript, Tailwind CSS, Chart.js, i18next
- **Backend** — Supabase (PostgreSQL + Auth with RLS)
- **Deployment** — Vercel
- **Exchange rates** — Frankfurter API, proxied via Next.js API route, cached 1hr

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/suheum-heo/moneymap.git
cd moneymap
npm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com) and run the schema SQL to create the following tables — all with Row Level Security so users only access their own data:

`profiles` · `contexts` · `entries` · `budgets` · `recurring` · `categories`

### 3. Set up Google OAuth

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Go to **APIs & Services → Credentials → Create OAuth client ID** (Web application)
3. Add your Supabase callback URL as an authorized redirect URI:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
4. Enable Google in Supabase → **Authentication → Sign In / Providers**

### 4. Environment variables

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_legacy_anon_key
```

### 5. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

## Deploy

1. Push to GitHub
2. Import to [vercel.com](https://vercel.com) — Next.js is auto-detected
3. Add environment variables in Vercel → Settings → Environment Variables
4. Set your Vercel URL in Supabase → Authentication → URL Configuration
5. Add `https://your-app.vercel.app/auth/callback` to Supabase redirect URLs

## Install on iPhone

1. Open your app URL in **Safari**
2. Tap Share → **Add to Home Screen**
3. Tap **Add** — launches full screen like a native app

## First time setup

New users see an onboarding screen to create their first budget context — name, local currency, home currency, and start date. More contexts can be added anytime in Settings.
