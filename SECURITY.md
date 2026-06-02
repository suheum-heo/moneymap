# Security

This document describes the intended security model for MoneyMap and the assumptions the app makes about Supabase configuration.

## Security Overview

MoneyMap is designed as a **per-user private finance app**. The application assumes that authenticated users can only read and mutate their own rows.

Two layers matter:

1. Client and server code should always scope access to the current user.
2. Supabase Row Level Security must enforce that isolation at the database level.

The app should not rely on client-side filtering alone for privacy.

## User-Owned Tables

MoneyMap expects the following tables to be user-owned:

- `entries`
- `contexts`
- `categories`
- `budgets`
- `recurring`
- `profiles` if used

Expected ownership model:

- Most tables use `user_id` as the owning user column.
- `profiles`, if present, typically uses `id = auth.uid()`.

## Expected RLS Model

For user-owned data, the expected rule is:

```sql
auth.uid() = user_id
```

Expected policy behavior:

- `SELECT`: user can only read their own rows
- `INSERT`: user can only insert rows for themselves
- `UPDATE`: user can only update their own rows and cannot transfer ownership
- `DELETE`: user can only delete their own rows

For `profiles`, if used:

```sql
auth.uid() = id
```

Expected policy shape:

- `USING` should enforce ownership for `SELECT`, `UPDATE`, and `DELETE`
- `WITH CHECK` should enforce ownership for `INSERT` and `UPDATE`

Example policy intent:

```sql
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

MoneyMap should not use permissive private-data policies like `USING (true)` for user-owned finance rows.

## Frontend Data Access Expectations

The frontend currently uses Supabase queries in app hooks such as:

- [src/app/useEntries.ts](./src/app/useEntries.ts)
- [src/app/useSettings.ts](./src/app/useSettings.ts)
- [src/app/useCategories.ts](./src/app/useCategories.ts)
- [src/app/useBudgets.ts](./src/app/useBudgets.ts)
- [src/app/useRecurring.ts](./src/app/useRecurring.ts)

These hooks scope queries by the authenticated user in app code, but **RLS is still required**. Query filters are helpful, not sufficient by themselves.

## Service Role Key Rules

MoneyMap uses a service role key only for secure server-side operations that cannot be performed safely from the client.

Rules:

- `SUPABASE_SERVICE_ROLE_KEY` is **server-only**
- Never expose it through `NEXT_PUBLIC_*`
- Never import it into client components
- Never return it from API routes
- Never place it in browser bundles

Allowed public Supabase variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Account Deletion Security Model

MoneyMap includes a server-side account deletion route:

- [src/app/api/account/delete/route.ts](./src/app/api/account/delete/route.ts)

Security model:

1. The client must already be signed in.
2. The client sends a bearer access token to the route.
3. The server independently verifies the token with Supabase Auth.
4. The server derives the current authenticated user from that token.
5. The server deletes only rows belonging to that authenticated user.
6. The server then deletes the corresponding Supabase Auth user through the Admin API.

Tables deleted by user filter:

- `entries` where `user_id = authenticated user id`
- `budgets` where `user_id = authenticated user id`
- `recurring` where `user_id = authenticated user id`
- `categories` where `user_id = authenticated user id`
- `contexts` where `user_id = authenticated user id`
- `profiles` where `id = authenticated user id`, if that table exists

The route does not return private data. It returns only generic success or error responses.

## Legacy Google Sheets API Routes

MoneyMap previously had legacy Google Sheets API routes that exposed private finance data outside Supabase RLS.

Those routes were removed and should stay removed.

Why they were removed:

- they bypassed Supabase RLS
- they were not appropriate for private multi-user data
- they created avoidable privacy risk

Do not reintroduce Google Sheets-backed finance routes unless they are:

- authenticated
- user-scoped
- reviewed for privacy
- still compatible with the app’s isolation model

## Security Expectations for Contributors

When making changes:

- keep user-owned queries scoped to the current authenticated user
- do not move service-role behavior into the client
- do not add public endpoints that read or write private user finance data without auth
- do not weaken ownership checks
- preserve the account deletion verification flow

If you change auth, data access, or account deletion, review this file and the relevant route/hook code together.
