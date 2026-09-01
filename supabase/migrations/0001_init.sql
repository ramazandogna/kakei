-- ============================================================================
-- Kakei — the three tables the whole app is built on.
--
-- Money is stored as an integer number of minor units, never as a float and
-- never as a decimal the client does arithmetic on. JPY has zero minor digits,
-- TRY and EUR have two; the app holds that map and formats at the edge.
-- ============================================================================

-- ============ profiles ============
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text,
  -- ISO 4217. The ledger is single-currency by design: mixing currencies in one
  -- ledger needs rates and a reporting currency, which is not a v1 feature.
  currency        text     not null default 'JPY',
  -- For anyone budgeting from payday rather than the 1st. Capped at 28 so every
  -- month has the day; 29-31 would silently skip February.
  month_start_day smallint not null default 1 check (month_start_day between 1 and 28),
  locale          text,
  theme           text     not null default 'system',
  created_at      timestamptz not null default now()
);

-- ============ categories ============
-- Two levels: a parent is a heading ("Food"), a child is what was actually
-- picked ("Konbini"). Deeper than two turns the picker into a file browser.
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  parent_id   uuid references public.categories(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  direction   text not null check (direction in ('in', 'out')),
  -- A token name ('indigo', 'clay', ...), never a hex: the palette can change
  -- without a migration, and the app writes the Tailwind classes out itself.
  tone        text,
  icon        text,           -- a lucide icon name
  sort_order  int  not null default 0,
  -- Archived, never deleted: old transactions keep their meaning.
  archived_at timestamptz,
  created_at  timestamptz not null default now()
);

create index categories_user_active_idx
  on public.categories (user_id, direction, sort_order)
  where archived_at is null;

create index categories_parent_idx on public.categories (parent_id);

-- ============ transactions ============
create table public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  occurred_on  date not null,
  direction    text not null check (direction in ('in', 'out')),
  amount_minor bigint not null check (amount_minor > 0),
  -- set null rather than cascade: deleting a category must not delete the money
  -- that went through it.
  category_id  uuid references public.categories(id) on delete set null,
  -- Expenses only; the app never offers it for income. Nullable because it is
  -- skippable, and the monthly review says so when it is missing.
  necessity    text check (necessity in ('need', 'want')),
  merchant     text check (char_length(merchant) <= 80),
  note         text check (char_length(note) <= 280),
  created_at   timestamptz not null default now()
);

-- The Ledger's keyset pagination orders by (occurred_on desc, id desc), so the
-- index carries both and the page after a cursor is a range scan.
create index transactions_user_date_idx
  on public.transactions (user_id, occurred_on desc, id desc);

create index transactions_user_category_idx
  on public.transactions (user_id, category_id);
