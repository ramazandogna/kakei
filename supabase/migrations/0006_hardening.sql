-- ============================================================================
-- Three holes RLS does not cover, each confirmed by attacking a real database
-- as an ordinary signed-in user before it was closed.
--
-- Safe to run on a database that already holds data: everything that would
-- violate a new constraint is repaired first.
-- ============================================================================

-- ── 1. A SECURITY DEFINER function anyone could call, on anyone ────────────
--
-- Postgres grants EXECUTE on a new function to PUBLIC, and PostgREST exposes
-- every function in `public` as an RPC endpoint. `seed_default_categories` runs
-- as its owner and therefore bypasses RLS, so *any* holder of the anon key
-- could call it with someone else's user id and write fifteen rows into their
-- account. Measured before this line existed: a victim's category count went
-- from 15 to 30.
--
-- Revoking from PUBLIC alone is not enough, and measuring is what showed it:
-- Supabase grants EXECUTE on `public` functions to `anon` and `authenticated`
-- explicitly, and an explicit grant survives a revoke aimed at PUBLIC. With
-- only the PUBLIC revoke in place the same attack still worked -- the victim's
-- count went 30 to 45 on the second run.
--
-- The signup trigger is unaffected. It runs as the owner, which keeps its own
-- execute right; only the request roles lose theirs.
--
-- Wrapped so the file also applies to a plain Postgres, where these two roles
-- do not exist.
do $$
declare
  target text;
begin
  foreach target in array array['public', 'anon', 'authenticated'] loop
    if target = 'public' or exists (select 1 from pg_roles where rolname = target) then
      execute format(
        'revoke execute on function public.seed_default_categories(uuid, text) from %I', target);
      execute format(
        'revoke execute on function public.handle_new_user() from %I', target);
    end if;
  end loop;
end;
$$;

-- Note for later: CREATE OR REPLACE keeps a function's existing grants, so
-- re-running 0003 is safe. Dropping and recreating one is not -- the default
-- privileges would grant EXECUTE again, and this file would need re-running.

-- ── 2. Foreign keys that crossed the tenant boundary ───────────────────────
--
-- A foreign key is checked with the referenced table's own rights, so RLS does
-- not apply to it: knowing a category id was enough to file a transaction
-- against another user's category, or to parent a category under one. Not
-- reading their data, but writing into their tree — which is enough to corrupt
-- what their Month screen adds up.
--
-- The fix is a composite key. `(id, user_id)` is unique on categories, so a
-- reference carrying both columns can only ever resolve within one account.

-- Repair anything already across the line, so the constraints can be trusted.
update public.transactions t
   set category_id = null
  from public.categories c
 where c.id = t.category_id
   and c.user_id <> t.user_id;

update public.categories c
   set parent_id = null
  from public.categories p
 where p.id = c.parent_id
   and p.user_id <> c.user_id;

alter table public.categories
  add constraint categories_id_user_key unique (id, user_id);

alter table public.transactions
  drop constraint transactions_category_id_fkey;

-- `on delete set null (category_id)` names the column to clear: the plain form
-- would try to null user_id too, which is NOT NULL. Postgres 15 and later.
alter table public.transactions
  add constraint transactions_category_fkey
  foreign key (category_id, user_id)
  references public.categories (id, user_id)
  on delete set null (category_id);

alter table public.categories
  drop constraint categories_parent_id_fkey;

alter table public.categories
  add constraint categories_parent_fkey
  foreign key (parent_id, user_id)
  references public.categories (id, user_id)
  on delete cascade;

-- ── 3. Preference columns that accepted anything ───────────────────────────
--
-- These are written straight from the client. None of them is a security
-- boundary on its own, but `display_name` renders into the interface and had no
-- length at all — a five-thousand-character name was accepted and stored.
update public.profiles set currency = 'JPY' where currency !~ '^[A-Z]{3}$';
update public.profiles set theme = 'system' where theme not in ('system', 'light', 'dark');
update public.profiles set display_name = left(display_name, 60)
 where char_length(display_name) > 60;
update public.profiles set locale = left(locale, 12) where char_length(locale) > 12;

alter table public.profiles
  add constraint profiles_currency_check check (currency ~ '^[A-Z]{3}$'),
  add constraint profiles_theme_check check (theme in ('system', 'light', 'dark')),
  add constraint profiles_display_name_check check (char_length(display_name) <= 60),
  add constraint profiles_locale_check check (char_length(locale) <= 12);
