-- ============================================================================
-- Fixed monthly entries.
--
-- Salary, rent, the phone bill: the same amount, the same category, every
-- month. Typing them again each period is the part of a ledger people give up
-- on, and it is the part a computer should do.
--
-- A template, not a transaction. Nothing is posted until the user says so, so
-- the ledger never fills with money that has not moved yet, and a month that
-- went differently is still theirs to correct.
-- ============================================================================
create table public.recurring_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  direction    text   not null check (direction in ('in', 'out')),
  amount_minor bigint not null check (amount_minor > 0),
  category_id  uuid,
  necessity    text check (necessity in ('need', 'want')),
  merchant     text check (char_length(merchant) <= 80),
  note         text check (char_length(note) <= 280),
  -- Which day of the period it falls on. Capped at 28 for the same reason
  -- profiles.month_start_day is: every month has a 28th.
  day_of_month smallint not null default 1 check (day_of_month between 1 and 28),
  -- Paused rather than deleted: a salary that stops for three months is still
  -- the same salary when it comes back.
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),

  -- Tenant-safe, the same way transactions are: a template can only point at a
  -- category its own owner holds.
  constraint recurring_entries_category_fkey
    foreign key (category_id, user_id) references public.categories (id, user_id)
    on delete set null (category_id)
);

create index recurring_entries_user_idx
  on public.recurring_entries (user_id, day_of_month)
  where archived_at is null;

alter table public.recurring_entries enable row level security;

create policy "own recurring all" on public.recurring_entries
  for all using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );

-- A transaction remembers which template produced it. That is what lets the
-- Month screen say "three of your five fixed entries are still missing" without
-- guessing from amounts, and what stops a second tap posting a duplicate.
alter table public.transactions
  add column recurring_id uuid,
  add constraint transactions_recurring_fkey
    foreign key (recurring_id) references public.recurring_entries (id) on delete set null;

-- One posting per template per period. The period is passed in rather than
-- derived, because only the app knows the user's month_start_day.
create unique index transactions_recurring_period_idx
  on public.transactions (recurring_id, occurred_on)
  where recurring_id is not null;

/*
 * Which templates have not been posted into a period yet.
 *
 * `security invoker`, so RLS scopes both sides to the caller.
 */
create or replace function public.pending_recurring(p_start date, p_end date)
returns table (
  id           uuid,
  direction    text,
  amount_minor bigint,
  category_id  uuid,
  necessity    text,
  merchant     text,
  note         text,
  day_of_month smallint,
  due_on       date
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.id, r.direction, r.amount_minor, r.category_id, r.necessity, r.merchant, r.note,
    r.day_of_month,
    -- The day the template falls on inside this period: the period's own month
    -- if that day has already come round, otherwise the following one.
    (case
       when extract(day from p_start) <= r.day_of_month
         then date_trunc('month', p_start)::date + (r.day_of_month - 1)
       else date_trunc('month', p_start + interval '1 month')::date + (r.day_of_month - 1)
     end) as due_on
  from public.recurring_entries r
  where r.archived_at is null
    and not exists (
      select 1 from public.transactions t
       where t.recurring_id = r.id
         and t.occurred_on between p_start and p_end
    );
$$;
