<div align="center">
  <img src="public/pwa-192.png" alt="" width="88" height="88">

  <h1>Kakei</h1>

  <p><strong>家計 — Japanese for <em>household accounts</em>.</strong><br>
  A money tracker built around one idea: the month's reckoning is the product,
  and everything you type is there to make it possible.</p>

  <p>
    <a href="https://kakei-money.vercel.app"><strong>Open the app →</strong></a>
  </p>

  <p>
    <img alt="Vue 3" src="https://img.shields.io/badge/Vue-3.5-42b883?style=flat-square">
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square">
    <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ecf8e?style=flat-square">
    <img alt="PWA" src="https://img.shields.io/badge/PWA-installable-2A7C13?style=flat-square">
  </p>
</div>

---

## What it does

Every entry answers three questions in one gesture: **how much**, **where**, and
**was it needed**. Only the first is required, so an entry is possible in under
five seconds standing at a till; the rest can be filled in later from the
Ledger.

Four screens:

| Screen       | What it is for                                                                  |
| ------------ | ------------------------------------------------------------------------------- |
| **Month**    | In, out, net. A donut of spending by category, and the categories that moved most against last month. |
| **Ledger**   | Every transaction, newest first, grouped by day with subtotals. Filters live in the URL. |
| **Insights** | Twelve months as bars, each category as a share of income, and any category split against its own last month. |
| **Profile**  | Display name, categories, currency, the day the month starts on, theme, language. |

The comparison is the reason the app exists. `Konbini · ¥10,000 → ¥8,000 · 20%
less` is the sentence the Month screen is built to print.

Available in **English, Turkish, Japanese and Chinese**, with light and dark
themes, five currencies, and a configurable month start day for anyone
budgeting from payday rather than the 1st.

It installs to the Home Screen and works offline for reading.

## Running it

Requires **Node ≥ 22.18** (or ≥ 24.12) and **pnpm**.

```sh
pnpm install
cp .env.example .env.local     # then fill in the two values
pnpm dev
```

`.env.local` needs a Supabase project of its own:

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Both are public by design — the anon key ships in the bundle. What protects the
data is row-level security in Postgres, not the key. Apply the schema with the
migrations in [`supabase/migrations/`](supabase/migrations), in order.

### Commands

| Command          | What it does                                          |
| ---------------- | ----------------------------------------------------- |
| `pnpm dev`       | Dev server                                            |
| `pnpm build`     | Type-check and build                                  |
| `pnpm check`     | Everything CI runs: format, lint, types, tests, build |
| `pnpm test:unit` | Vitest, watch mode                                    |
| `pnpm lint`      | oxlint + ESLint, with `--fix`                         |
| `pnpm types:db`  | Regenerate `database.types.ts` from the live schema   |

## How it is put together

**Money is integers.** `amount_minor bigint`, never a float and never a decimal
the client does arithmetic on. JPY has no minor unit, TRY and EUR have two, KWD
has three; the app holds that map, parses at the edge and formats at the edge.
`parseAmount` reads `1.234,56` and `1,234.56` as the same number, because a
person means the same thing by both.

**Statistics are computed in Postgres.** A month is one round trip:
`category_report` returns every category's totals for *two* periods at once, so
"against last month" is not a second request. `monthly_totals` buckets the
twelve-month series by the user's own month start day. Both are `security
invoker`, so RLS still applies and neither can become a way around the policies.

**Security lives in Postgres.** Router guards are a convenience for the user,
not a boundary. Every table has RLS enabled and every policy is scoped to
`auth.uid()`; `user_id` defaults to `auth.uid()` in the database, so the client
never sends it and cannot spoof it.

**Dates are local, always.** `toISOString()` would put a late-evening entry on
tomorrow for anyone east of UTC — and in a money app that lands it in the wrong
month and silently corrupts a total. Every key goes through `toDateKey`, and a
shared ref re-checks the date at midnight so an app left open overnight does not
keep writing to yesterday.

**Periods are not always calendar months.** `month_start_day` shifts the whole
window, so every total, every comparison and every bar has to agree about where
a period begins. That lives in one file, `shared/lib/period.ts`, and it is the
most heavily tested code in the repository.

**Feature-sliced.** `src/features/<name>/` owns its API calls, query keys, types
and components. `src/shared/` holds what more than one feature needs, and
nothing under `shared/` imports from a feature.

**The charts are hand-rolled SVG.** A donut is an arc and a rotation; the bars
are `<rect>`s. A chart library would cost more gzipped than the entire Insights
screen, would need its own theming to follow the tokens, and would still need
work to be readable to a screen reader. Every chart carries a table underneath
it, or is a table with a chart on top: the numbers are the product, the drawing
is a summary of them.

**Translations are type-checked.** Each locale is typed as `typeof en`, so a
missing or misspelled key fails the build rather than rendering a raw key on
screen — and a test pushes every message through vue-i18n's compiler, because
compilation happens lazily at runtime and would otherwise reach production. A
second test scans the call sites, because four catalogues can be wrong in the
same way and still agree with each other.

## The design system is a package, not a folder

The components, composables and tokens that are not about money live in
[**rei-kit**](https://github.com/ramazandogna/rei-kit)
([npm](https://www.npmjs.com/package/rei-kit)), installed here like any other
dependency. It is the same package that
[Hibi](https://github.com/ramazandogna/hibi) uses, and this app is what proved
it was a design system rather than one app's `shared/` folder: the shell, the
tab bar, the sheets, the settings rows, the i18n runtime and the Supabase client
factory all arrived installed rather than written.

Nothing in the kit was changed to make this app work. The palette is eleven
lines of `main.css` — the kit names colours by role, and Kakei gives those roles
its own values.

Both halves type-check perfectly while wired to nothing, so this repository
tests the join: that the kit's colour roles are all defined, that its stylesheet
is imported, that Tailwind is pointed at the package (it does not walk
`node_modules` on its own, and missing that line renders every kit component
unstyled with a green build), and that the navigation bar mounts against a real
router.

## Stack

Vue 3.5 · TypeScript (strict, with `exactOptionalPropertyTypes` and
`noUncheckedIndexedAccess`) · Vite · Tailwind v4 · Pinia · Vue Router ·
TanStack Query · vee-validate + zod · vue-i18n · Supabase · Vitest

## Quality

CI runs on every push and pull request: formatting, oxlint, ESLint, `vue-tsc`,
the unit tests and the production build — as separate steps, so a failure names
itself. A second workflow pings Supabase every three days, because a free
project pauses after seven days of silence and takes the live demo with it.

A screen that throws is caught by an error boundary placed inside the layout, so
the shell and the tab bar survive and switching tabs stays available — the
recovery a person actually reaches for.

## Credits

Built by [Ramazan Doğan](https://github.com/ramazandogna).
