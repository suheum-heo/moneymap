# Privacy Notes

This document describes the practical privacy model for MoneyMap.

## User Data Isolation

When Supabase Row Level Security is configured correctly, one regular user should not be able to access another user’s MoneyMap data through the application.

That includes app data such as:

- entries
- contexts
- categories
- budgets
- recurring items
- profiles if used

This privacy model depends on:

- correct Supabase Auth usage
- correct RLS policies
- avoiding insecure server routes that bypass RLS

## Administrator Access Reality

MoneyMap is still a hosted application backed by Supabase.

Project administrators may technically be able to access database rows through the Supabase dashboard, logs, or other maintenance tooling for legitimate reasons such as:

- debugging
- support
- security investigation
- operational maintenance

Do not claim stronger privacy guarantees than the infrastructure actually provides.

## Sensitive Data Guidance

Users should avoid storing highly sensitive information in free-text fields.

Do not store things like:

- passwords
- full card numbers
- government ID numbers
- private access tokens
- secret recovery phrases

MoneyMap is a budgeting app, not a secret vault.

## Account Deletion

MoneyMap includes an account deletion flow that permanently deletes:

- the user’s app data
- the user’s Supabase Auth account

Once deleted, the account should not be recoverable through the app.

## User-Generated Content

MoneyMap does not automatically translate or rewrite user-generated content such as:

- transaction titles
- merchant names
- locations
- user-created category names
- context names

That content remains whatever the user entered unless they edit it themselves.

## Legacy Route Note

Legacy Google Sheets-backed API routes were removed because they were not appropriate for private, per-user finance data.

Contributors should not reintroduce a secondary unauthenticated data path for private records.
