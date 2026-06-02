# Development Guide

This document collects developer rules and implementation notes for working safely in MoneyMap without drifting from the current app model.

## Core Architecture

MoneyMap is a Next.js App Router app with:

- UI components in [src/app/components](./src/app/components)
- app shell and shared state wiring in [src/app/page.tsx](./src/app/page.tsx)
- Supabase data hooks in:
  - [src/app/useEntries.ts](./src/app/useEntries.ts)
  - [src/app/useSettings.ts](./src/app/useSettings.ts)
  - [src/app/useCategories.ts](./src/app/useCategories.ts)
  - [src/app/useBudgets.ts](./src/app/useBudgets.ts)
  - [src/app/useRecurring.ts](./src/app/useRecurring.ts)
- shared domain helpers in [src/app/types.ts](./src/app/types.ts)
- translations in [src/app/i18n/index.ts](./src/app/i18n/index.ts)

## i18n and Localization Rules

Visible UI text should use the i18n system.

Rules:

- all visible UI labels, placeholders, buttons, hints, and validation strings should come from i18n
- do not hardcode visible UI strings in components unless the text is purely decorative and intentionally language-neutral
- use the selected app language, not only the browser language, for user-facing date/month formatting
- do not translate user-generated content automatically

Do not automatically translate:

- transaction titles
- merchant names
- locations
- user-created category names
- context names

## Date Formatting Rules

Use the shared locale-aware date helpers in [src/app/types.ts](./src/app/types.ts), such as:

- `formatEntryDate`
- `formatFullDate`
- `formatMonthYear`
- `getMonthLabels`
- `getWeekdayLabels`

Rules:

- use the selected app language
- avoid hardcoded English month names
- avoid manual `MM-DD` or English-only month arrays

## Currency Formatting Rules

MoneyMap separates display formatting from stored numeric values.

Current shared currency helpers live in [src/app/types.ts](./src/app/types.ts), including:

- `formatAmount`
- `formatAmountValue`
- `getCurrencyLocale`
- `getAmountInputProps`
- `usesZeroDecimalCurrency`

Rules:

- display local currency using a currency-appropriate locale
- converted or home-currency amounts can continue using the home currency’s format
- do not manually build display strings as `symbol + amount.toFixed(2)` when a shared formatter already exists
- keep zero-decimal currencies like KRW and JPY free of unnecessary decimals

## Amount Input Parsing Rules

Amount input parsing is intentionally separate from display formatting.

Current shared parsing helpers live in [src/app/types.ts](./src/app/types.ts), including:

- `normalizeAmountInputValue`
- `parseLocalizedAmount`
- `parseCurrencyInput`

Rules:

- support comma-decimal input like `1,54` for EUR-style workflows
- also support dot-decimal input where appropriate
- keep raw input as a string while the user is typing
- convert to a numeric value only when validating or saving
- store numeric values only
- do not use `parseFloat` directly on raw localized input

Examples:

- `1,54` -> `1.54`
- `1.234,56` -> `1234.56`
- `1,234.56` -> `1234.56`
- `1500` in KRW/JPY stays whole-number friendly

## Category System Rules

Category logic spans:

- [src/app/useCategories.ts](./src/app/useCategories.ts)
- [src/app/types.ts](./src/app/types.ts)

Rules:

- default categories are created at seed time using the selected onboarding language
- existing categories already stored in the database are not auto-renamed or auto-translated
- user-created categories are not auto-translated later
- category colors are generated automatically from category names through the shared color helpers
- neutral gray should remain reserved for intentionally neutral categories such as `Other`

## Sorting Rules

Shared transaction sorting lives in:

- `sortEntriesForDisplay(...)` in [src/app/types.ts](./src/app/types.ts)

The app supports a persisted sort preference:

- `newest`
- `oldest`

Local storage key:

- `gagyebu-entry-sort-order`

Use the shared sorting utility instead of re-implementing entry ordering inside components.

## State Persistence Notes

MoneyMap currently persists some UI and app preferences in local or session storage.

Examples:

- active context: `gagyebu-active-context`
- exchange-rate cache: `gagyebu-rates`
- exchange-rate timestamp: `gagyebu-rates-timestamp`
- language: `gagyebu-lang`
- theme: `theme`
- entry sort order: `gagyebu-entry-sort-order`
- add-entry draft: `addentry-draft` in session storage

Developer guidance:

- preserve selected context and global preferences where appropriate
- avoid unnecessary resets of view-local state
- do not assume page, month, or scroll position are globally persisted unless the code explicitly stores them
- if you add new persistence, keep it client-only and avoid hydration issues

## Security and Data Rules

- Supabase is the live data backend
- do not reintroduce legacy Google Sheets data paths
- keep service-role operations server-only
- preserve user scoping in Supabase queries and expected RLS assumptions

See:

- [SECURITY.md](./SECURITY.md)
- [PRIVACY.md](./PRIVACY.md)
