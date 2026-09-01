-- A month and a half of plausible entries, for looking at the app with real
-- shapes in it rather than an empty ledger.
--
-- Run it in the SQL editor while signed in, or with the user id substituted:
-- every insert takes its category from the presets the signup trigger already
-- created, so nothing here has to be kept in step with the seed by hand.
--
-- Safe to run twice: it deletes only the rows it would create.
do $$
declare
  me uuid := auth.uid();

  konbini uuid; market uuid; eating uuid; rent uuid; utilities uuid;
  transport uuid; health uuid; fun uuid; salary uuid; side uuid;

  -- Anchored to the calendar month rather than to "n days ago". Run on the 1st,
  -- relative dates put almost everything in the previous period and the Month
  -- screen comes up empty — which is the one thing this seed exists to avoid.
  this_month date := date_trunc('month', current_date)::date;
  last_month date := (date_trunc('month', current_date) - interval '1 month')::date;
begin
  if me is null then
    raise exception 'No auth.uid(): run this as a signed-in user, or replace auth.uid() above with your own user id.';
  end if;

  -- Presets are seeded in the user's own language, so they are found by
  -- position in the tree rather than by name.
  select c.id into konbini from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = me and p.sort_order = 0 and p.parent_id is null and c.direction = 'out' and c.sort_order = 1;
  select c.id into market  from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = me and p.sort_order = 0 and p.parent_id is null and c.direction = 'out' and c.sort_order = 0;
  select c.id into eating  from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = me and p.sort_order = 0 and p.parent_id is null and c.direction = 'out' and c.sort_order = 2;
  select c.id into rent    from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = me and p.sort_order = 1 and p.parent_id is null and c.direction = 'out' and c.sort_order = 0;
  select c.id into utilities from public.categories c join public.categories p on p.id = c.parent_id
    where c.user_id = me and p.sort_order = 1 and p.parent_id is null and c.direction = 'out' and c.sort_order = 1;

  select id into transport from public.categories where user_id = me and direction = 'out' and parent_id is null and sort_order = 2;
  select id into health    from public.categories where user_id = me and direction = 'out' and parent_id is null and sort_order = 3;
  select id into fun       from public.categories where user_id = me and direction = 'out' and parent_id is null and sort_order = 4;
  select id into salary    from public.categories where user_id = me and direction = 'in'  and parent_id is null and sort_order = 0;
  select id into side      from public.categories where user_id = me and direction = 'in'  and parent_id is null and sort_order = 1;

  delete from public.transactions
   where user_id = me and note = 'demo';

  insert into public.transactions
    (occurred_on, direction, amount_minor, category_id, necessity, merchant, note)
  values
    -- Last month: the baseline this month is compared against.
    (last_month,     'in',  320000, salary,    null,   null,          'demo'),
    (last_month + 2, 'in',   45000, side,      null,   null,          'demo'),
    (last_month,     'out',  90000, rent,      'need', null,          'demo'),
    (last_month + 3, 'out',  12400, utilities, 'need', null,          'demo'),
    (last_month + 4, 'out',   8600, market,    'need', 'Supermarket', 'demo'),
    (last_month + 5, 'out',   1200, konbini,   'want', 'Konbini',     'demo'),
    (last_month + 6, 'out',   3800, eating,    'want', 'Ramen',       'demo'),
    (last_month + 7, 'out',   1100, konbini,   'want', 'Konbini',     'demo'),
    (last_month + 9, 'out',   7200, fun,       'want', 'Cinema',      'demo'),
    (last_month + 11,'out',   2400, transport, 'need', null,          'demo'),
    (last_month + 13,'out',   1300, konbini,   'want', 'Konbini',     'demo'),
    (last_month + 15,'out',   5400, health,    'need', 'Pharmacy',    'demo'),

    -- This month: rent steady, konbini down, eating out up. Never in the
    -- future, so the ledger reads the way a real one would.
    (least(this_month,     current_date), 'in',  320000, salary,    null,   null,          'demo'),
    (least(this_month,     current_date), 'out',  90000, rent,      'need', null,          'demo'),
    (least(this_month + 2, current_date), 'out',  11800, utilities, 'need', null,          'demo'),
    (least(this_month + 3, current_date), 'out',   9100, market,    'need', 'Supermarket', 'demo'),
    (least(this_month + 4, current_date), 'out',    900, konbini,   'want', 'Konbini',     'demo'),
    (least(this_month + 5, current_date), 'out',   6200, eating,    'want', 'Izakaya',     'demo'),
    (least(this_month + 6, current_date), 'out',   2100, transport, 'need', null,          'demo'),
    (least(this_month + 7, current_date), 'out',    800, konbini,    null,  'Konbini',     'demo'),
    (least(this_month + 8, current_date), 'out',   4300, eating,    'want', 'Curry',       'demo'),
    (least(this_month + 9, current_date), 'out',   1500, fun,        null,  null,          'demo');
end;
$$;
