-- One statement for a whole re-order.
--
-- Sending N updates from the browser can fail halfway and leave the list
-- half-sorted. `security invoker` keeps RLS in force, so the `where` clause
-- below can only ever reach the caller's own rows — an id belonging to someone
-- else simply matches nothing.
create or replace function public.reorder_categories(ids uuid[])
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  update public.categories as c
     set sort_order = ordered.position - 1
    from unnest(ids) with ordinality as ordered(id, position)
   where c.id = ordered.id;
$$;
