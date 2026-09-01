-- ============================================================================
-- What a new account starts with.
--
-- An empty category list makes the first entry a chore: pick nothing, or stop
-- and build a taxonomy. So a new user gets a small tree they can rename,
-- re-order or archive — in their own language where the app knew it at signup.
-- ============================================================================

create or replace function public.seed_default_categories(p_user uuid, p_locale text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- 'tr-TR' and 'tr' must land on the same catalogue.
  lang text := coalesce(nullif(split_part(coalesce(p_locale, ''), '-', 1), ''), 'en');

  -- One place for every preset name. A jsonb literal rather than a CASE per
  -- category: adding a language is then one key per row instead of a new branch.
  names jsonb := '{
    "food":       {"en":"Food",        "tr":"Yeme içme",  "ja":"食費",     "zh":"餐饮"},
    "market":     {"en":"Supermarket", "tr":"Market",     "ja":"スーパー", "zh":"超市"},
    "konbini":    {"en":"Konbini",     "tr":"Bakkal",     "ja":"コンビニ", "zh":"便利店"},
    "eatingOut":  {"en":"Eating out",  "tr":"Dışarıda",   "ja":"外食",     "zh":"外食"},
    "housing":    {"en":"Housing",     "tr":"Ev",         "ja":"住居",     "zh":"住房"},
    "rent":       {"en":"Rent",        "tr":"Kira",       "ja":"家賃",     "zh":"房租"},
    "utilities":  {"en":"Utilities",   "tr":"Faturalar",  "ja":"光熱費",   "zh":"水电费"},
    "transport":  {"en":"Transport",   "tr":"Ulaşım",     "ja":"交通費",   "zh":"交通"},
    "health":     {"en":"Health",      "tr":"Sağlık",     "ja":"医療",     "zh":"医疗"},
    "fun":        {"en":"Fun",         "tr":"Keyif",      "ja":"娯楽",     "zh":"娱乐"},
    "otherOut":   {"en":"Other",       "tr":"Diğer",      "ja":"その他",   "zh":"其他"},
    "salary":     {"en":"Salary",      "tr":"Maaş",       "ja":"給与",     "zh":"工资"},
    "side":       {"en":"Side income", "tr":"Ek gelir",   "ja":"副収入",   "zh":"副业"},
    "gift":       {"en":"Gift",        "tr":"Hediye",     "ja":"贈与",     "zh":"礼金"},
    "otherIn":    {"en":"Other",       "tr":"Diğer",      "ja":"その他",   "zh":"其他"}
  }'::jsonb;

  food_id    uuid;
  housing_id uuid;
begin
  if lang not in ('en', 'tr', 'ja', 'zh') then
    lang := 'en';
  end if;

  -- ---- expenses ----
  insert into public.categories (user_id, name, direction, tone, icon, sort_order)
  values (p_user, names->'food'->>lang, 'out', 'clay', 'utensils', 0)
  returning id into food_id;

  insert into public.categories (user_id, parent_id, name, direction, tone, icon, sort_order)
  values
    (p_user, food_id, names->'market'->>lang,    'out', 'clay', 'shopping-basket',  0),
    (p_user, food_id, names->'konbini'->>lang,   'out', 'clay', 'store',            1),
    (p_user, food_id, names->'eatingOut'->>lang, 'out', 'clay', 'utensils-crossed', 2);

  insert into public.categories (user_id, name, direction, tone, icon, sort_order)
  values (p_user, names->'housing'->>lang, 'out', 'indigo', 'house', 1)
  returning id into housing_id;

  insert into public.categories (user_id, parent_id, name, direction, tone, icon, sort_order)
  values
    (p_user, housing_id, names->'rent'->>lang,      'out', 'indigo', 'key-round', 0),
    (p_user, housing_id, names->'utilities'->>lang, 'out', 'indigo', 'plug-zap',  1);

  insert into public.categories (user_id, name, direction, tone, icon, sort_order)
  values
    (p_user, names->'transport'->>lang, 'out', 'teal',  'train-front', 2),
    (p_user, names->'health'->>lang,    'out', 'sage',  'heart-pulse', 3),
    (p_user, names->'fun'->>lang,       'out', 'rose',  'party-popper', 4),
    (p_user, names->'otherOut'->>lang,  'out', 'slate', 'ellipsis',    5);

  -- ---- income ----
  insert into public.categories (user_id, name, direction, tone, icon, sort_order)
  values
    (p_user, names->'salary'->>lang,  'in', 'sage',  'briefcase', 0),
    (p_user, names->'side'->>lang,    'in', 'teal',  'laptop',    1),
    (p_user, names->'gift'->>lang,    'in', 'plum',  'gift',      2),
    (p_user, names->'otherIn'->>lang, 'in', 'slate', 'ellipsis',  3);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Passed by the app at sign-up (`options.data.locale`). Absent for OAuth,
  -- where the provider decides what metadata arrives — English then.
  user_locale text := new.raw_user_meta_data->>'locale';
begin
  insert into public.profiles (id, display_name, locale)
  values (new.id, split_part(new.email, '@', 1), user_locale);

  perform public.seed_default_categories(new.id, user_locale);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
