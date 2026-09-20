-- Context hierarchy columns for MoneyMap groups/icons/order.
-- Run in the Supabase SQL editor so hierarchy syncs in the database
-- (the app also mirrors hierarchy to auth user_metadata as a fallback).

alter table public.contexts
  add column if not exists parent_id uuid references public.contexts(id) on delete set null,
  add column if not exists is_group boolean not null default false,
  add column if not exists icon text,
  add column if not exists sort_order integer;

create index if not exists contexts_user_parent_idx
  on public.contexts (user_id, parent_id);

create index if not exists contexts_user_sort_idx
  on public.contexts (user_id, sort_order);
