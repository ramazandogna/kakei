-- ============================================================================
-- Statistics are computed in Postgres, not in the browser.
--
-- A month is one round trip. Both functions are `security invoker`, so RLS
-- still applies and neither can become a way around the policies.
-- ============================================================================

/*
 * Everything the Month and Insights screens need about categories, for two
 * periods at once — so "against last month" is not a second request.
 *
 * A row with a null category_id is money whose category was deleted. It is
 * emitted rather than dropped: without it the slices would not add up to the
 * total shown above them.
 */
create or replace function public.category_report(
  p_start date,
  p_end date,
  p_prev_start date,
  p_prev_end date
)
returns table (
  category_id    uuid,
  parent_id      uuid,
  name           text,
  direction      text,
  tone           text,
  icon           text,
  current_minor  bigint,
  previous_minor bigint,
  current_count  int
)
language sql
stable
security invoker
set search_path = ''
as $$
  with windowed as (
    select
      t.category_id,
      t.direction,
      case when t.occurred_on between p_start and p_end then t.amount_minor else 0 end as cur,
      case when t.occurred_on between p_prev_start and p_prev_end then t.amount_minor else 0 end as prev,
      case when t.occurred_on between p_start and p_end then 1 else 0 end as cur_count
    from public.transactions t
    -- One range scan over the index rather than two. The periods are adjacent
    -- in practice; anything that falls in the gap contributes zero to both and
    -- is dropped by the HAVING below.
    where t.occurred_on between least(p_start, p_prev_start) and greatest(p_end, p_prev_end)
  )
  select
    w.category_id,
    c.parent_id,
    c.name,
    w.direction,
    c.tone,
    c.icon,
    sum(w.cur)::bigint,
    sum(w.prev)::bigint,
    sum(w.cur_count)::int
  from windowed w
  left join public.categories c on c.id = w.category_id
  group by w.category_id, c.parent_id, c.name, w.direction, c.tone, c.icon
  having sum(w.cur) > 0 or sum(w.prev) > 0;
$$;

/*
 * The twelve-month bars.
 *
 * `period_start` rather than `month`, because a user budgeting from payday has
 * periods that are not calendar months. Shifting the date back by
 * `p_start_day - 1`, truncating, then shifting forward gives the period each
 * transaction belongs to — exact for every start day, which is why the column
 * is capped at 28.
 */
create or replace function public.monthly_totals(
  p_from date,
  p_to date,
  p_start_day int default 1
)
returns table (
  period_start date,
  in_minor     bigint,
  out_minor    bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (date_trunc('month', t.occurred_on - (p_start_day - 1))::date + (p_start_day - 1)) as period_start,
    coalesce(sum(t.amount_minor) filter (where t.direction = 'in'), 0)::bigint,
    coalesce(sum(t.amount_minor) filter (where t.direction = 'out'), 0)::bigint
  from public.transactions t
  where t.occurred_on between p_from and p_to
  group by 1
  order by 1;
$$;
