-- Row-level security first. Without these four lines the policies below are
-- decoration: the anon key ships in the bundle, so the database is the boundary.
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

-- profiles: read and update your own row only.
-- No insert policy — the row is created by handle_new_user (security definer).
-- No delete policy — the row goes with the account, through the cascade.
create policy "own profile read" on public.profiles
  for select using ( (select auth.uid()) = id );
create policy "own profile update" on public.profiles
  for update using ( (select auth.uid()) = id ) with check ( (select auth.uid()) = id );

-- categories and transactions: every operation, same rule. `with check` on top
-- of `using` is what stops a row being updated into someone else's name.
create policy "own categories all" on public.categories
  for all using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );

create policy "own transactions all" on public.transactions
  for all using ( (select auth.uid()) = user_id ) with check ( (select auth.uid()) = user_id );

-- Let the database fill user_id from the JWT instead of trusting the client.
-- Keeps the API layer free of any auth dependency, and the value cannot be
-- spoofed. The not null constraint still applies: with no session auth.uid() is
-- null and the insert fails.
alter table public.categories   alter column user_id set default auth.uid();
alter table public.transactions alter column user_id set default auth.uid();
