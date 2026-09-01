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

  function_missing constant text := 'No auth.uid(): run this as a signed-in user, '
    || 'or replace `auth.uid()` above with your user id.';

  konbini uuid; market uuid; eating uuid; rent uuid; utilities uuid;
  transport uuid; health uuid; fun uuid; salary uuid; side uuid;
begin
  if me is null then
    raise exception '%', function_missing;
  end if;

  -- Presets are seeded in the user's own language, so they are found by
  -- position in the tree rather than by name.
  select id into rent      from public.categories where user_id = me and direction = 'out' and sort_order = 0 and parent_id is not null limit 1;
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
    -- Last month: the baseline the current month is compared against.
    (current_date - interval '38 days', 'in',  320000, salary,    null,   null,        'demo'),
    (current_date - interval '36 days', 'in',   45000, side,      null,   null,        'demo'),
    (current_date - interval '38 days', 'out',  90000, rent,      'need', null,        'demo'),
    (current_date - interval '35 days', 'out',  12400, utilities, 'need', null,        'demo'),
    (current_date - interval '34 days', 'out',   8600, market,    'need', 'Supermarket', 'demo'),
    (current_date - interval '33 days', 'out',   1200, konbini,   'want', 'Konbini',   'demo'),
    (current_date - interval '32 days', 'out',   3800, eating,    'want', 'Ramen',     'demo'),
    (current_date - interval '31 days', 'out',   1100, konbini,   'want', 'Konbini',   'demo'),
    (current_date - interval '30 days', 'out',   7200, fun,       'want', 'Cinema',    'demo'),
    (current_date - interval '29 days', 'out',   2400, transport, 'need', null,        'demo'),
    (current_date - interval '28 days', 'out',   1300, konbini,   'want', 'Konbini',   'demo'),
    (current_date - interval '26 days', 'out',   5400, health,    'need', 'Pharmacy',  'demo'),

    -- This month: rent steady, konbini down, eating out up.
    (current_date - interval '8 days',  'in',  320000, salary,    null,   null,        'demo'),
    (current_date - interval '7 days',  'out',  90000, rent,      'need', null,        'demo'),
    (current_date - interval '6 days',  'out',  11800, utilities, 'need', null,        'demo'),
    (current_date - interval '6 days',  'out',   9100, market,    'need', 'Supermarket', 'demo'),
    (current_date - interval '5 days',  'out',    900, konbini,   'want', 'Konbini',   'demo'),
    (current_date - interval '4 days',  'out',   6200, eating,    'want', 'Izakaya',   'demo'),
    (current_date - interval '3 days',  'out',   2100, transport, 'need', null,        'demo'),
    (current_date - interval '2 days',  'out',    800, konbini,    null,  'Konbini',   'demo'),
    (current_date - interval '1 days',  'out',   4300, eating,    'want', 'Curry',     'demo'),
    (current_date,                      'out',   1500, fun,        null,  null,        'demo');
end;
$$;
