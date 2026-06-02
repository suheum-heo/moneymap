# MoneyMap

MoneyMap is a personal finance and budgeting app for tracking expenses and income across multiple life contexts such as home, school, travel, or a specific city. It is a multi-user Supabase-backed app with authentication, per-user data isolation, multi-currency support, and a PWA-style mobile experience.

**Live app**: [moneymap-io.vercel.app](https://moneymap-io.vercel.app)

## Core Features

- Authentication with Supabase Auth
- Multiple budget contexts per user
- Expense and income tracking
- Multi-currency contexts with local and home currency support
- Converted home-currency totals
- Calendar view with inline editing
- Overview dashboard with category and location breakdowns
- Monthly budgets
- Recurring transaction templates
- Custom categories
- CSV export
- Language selection and localized UI
- Installable PWA-style experience
- Account deletion flow

## Tech Stack

- Framework: Next.js 14 App Router
- Language: TypeScript
- UI: React, Tailwind CSS
- Charts: Chart.js, react-chartjs-2
- Auth and database: Supabase
- i18n: i18next, react-i18next
- Deployment: Vercel
- Exchange-rate source: Frankfurter API via `/api/rates`

## Current Data Backend

MoneyMap currently uses **Supabase** as the live app data backend.

User-owned app data is stored in Supabase tables such as:

- `entries`
- `contexts`
- `categories`
- `budgets`
- `recurring`
- `profiles` if your project uses it

Legacy Google Sheets-backed API routes were removed because they bypassed proper user isolation and Row Level Security. Old Google Sheets environment variables are no longer required.

## Local Development Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

Documented environment variable names:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Notes:

- `NEXT_PUBLIC_SUPABASE_URL` is required for the client and server app to talk to Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the public client key used by the app.
- `SUPABASE_SERVICE_ROLE_KEY` is required for the secure account deletion route and must remain server-only.

Removed and no-longer-required legacy environment variables:

- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_SHEET_ID`

These legacy Google Sheets variables should not be required for development, deployment, or runtime anymore.

### 3. Configure Supabase

Create a Supabase project and set up the app tables that MoneyMap expects:

- `entries`
- `contexts`
- `categories`
- `budgets`
- `recurring`
- `profiles` if used

Every user-owned table should have Row Level Security enabled and scoped to the authenticated user. See [SECURITY.md](./SECURITY.md).

### 4. Configure authentication

Set up the sign-in providers you want in Supabase Auth, including Google if you want Google sign-in.

Important current implementation note:

- The current auth flow in the app uses the deployed callback URL in the client auth code.
- That means local UI development works, but end-to-end localhost sign-in may require careful redirect configuration if you want a fully local auth round-trip.

### 5. Run locally

```bash
npm run dev
```

Then open the local URL shown by Next.js, usually:

- `http://localhost:3000`

If that port is occupied, Next.js will move to the next available port.

### 6. Production build check

```bash
npm run build
```

## Deploying on Vercel

1. Push the repository to GitHub.
2. Import the repo into Vercel.
3. Add the required environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Configure Supabase Auth redirect URLs for your deployed domain.
5. Deploy.

Do not add legacy Google Sheets env vars to Vercel for the current app path.

## Project Structure

High-level structure:

- [src/app/page.tsx](./src/app/page.tsx)
  - Main app shell, tab layout, shared top-level state wiring
- [src/app/components](./src/app/components)
  - UI components such as `Overview`, `Entries`, `Calendar`, `AddEntry`, `Settings`, onboarding, auth, and shared modals
- [src/app/useEntries.ts](./src/app/useEntries.ts)
  - Supabase-backed entry loading and CRUD
- [src/app/useSettings.ts](./src/app/useSettings.ts)
  - Context loading, active context state, exchange-rate cache, conversion helper
- [src/app/useCategories.ts](./src/app/useCategories.ts)
  - Category loading, localized default-category seeding, add/remove
- [src/app/useRecurring.ts](./src/app/useRecurring.ts)
  - Recurring template loading and CRUD
- [src/app/useBudgets.ts](./src/app/useBudgets.ts)
  - Monthly budget loading and updates
- [src/app/types.ts](./src/app/types.ts)
  - Shared domain types and display/formatting utilities
- [src/app/i18n/index.ts](./src/app/i18n/index.ts)
  - Translation resources and language bootstrapping
- [src/app/lib/supabase.ts](./src/app/lib/supabase.ts)
  - Shared browser Supabase client
- [src/app/api/account/delete/route.ts](./src/app/api/account/delete/route.ts)
  - Secure server-side account deletion route
- [src/app/api/rates/route.ts](./src/app/api/rates/route.ts)
  - Exchange-rate proxy route with caching

## Security and Privacy Notes

- Supabase is the current source of truth for app data.
- The app expects per-user isolation through Supabase Row Level Security.
- The service role key must never be exposed to the browser.
- Legacy Google Sheets API routes were removed and should not be reintroduced without authenticated, user-scoped access.

See:

- [SECURITY.md](./SECURITY.md)
- [PRIVACY.md](./PRIVACY.md)
- [DEVELOPMENT.md](./DEVELOPMENT.md)

## Contributor Notes

- Keep visible UI strings in i18n.
- Do not auto-translate user-generated content.
- Use shared formatting helpers for dates, currencies, and transaction sorting.
- Keep Supabase user scoping and RLS assumptions intact when changing data access.
