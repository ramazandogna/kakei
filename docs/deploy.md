# Deploying Kakei

Everything below is done once. The app itself needs two environment variables;
the rest is Supabase configuration that lives in the dashboard rather than in
this repository.

## 1. The Supabase project

Kakei needs **its own project** — separate from Hibi's, separate keys. A shared
project would put two apps' tables behind one set of policies, and the seed
trigger on `auth.users` would fire for both.

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
   Pick the region nearest to you; free tier is enough.
2. Open **SQL Editor** and run the files in
   [`supabase/migrations/`](../supabase/migrations) **in order**:

   | File                          | What it does                                              |
   | ----------------------------- | --------------------------------------------------------- |
   | `0001_init.sql`               | `profiles`, `categories`, `transactions` and their indexes |
   | `0002_rls.sql`                | RLS on all three, every policy scoped to `auth.uid()`, and the `user_id` defaults |
   | `0003_new_user.sql`           | The trigger that creates a profile and seeds preset categories in the user's language |
   | `0004_reorder_categories.sql` | One-statement re-ordering                                  |
   | `0005_reports.sql`            | `category_report` and `monthly_totals`                      |
   | `0006_hardening.sql`          | Closes three holes RLS does not cover — see below           |

   Or, with the CLI: `pnpm exec supabase link --project-ref <ref>` then
   `pnpm exec supabase db push`.

3. Optional, for a project that should look lived-in:
   [`supabase/seed/demo_month.sql`](../supabase/seed/demo_month.sql) — run it in
   the SQL editor while signed in. It is safe to run twice.

### What `0006` closes, and why RLS alone was not enough

Each of these was confirmed by attacking a real database as an ordinary
signed-in user, and confirmed closed the same way.

| Hole | Why RLS missed it |
| --- | --- |
| **Anyone could call `seed_default_categories` on anyone.** Fifteen rows written into a stranger's account; a victim's count went 15 → 30. | The function is `security definer`, so it runs as its owner and RLS does not apply to it — and Postgres grants `EXECUTE` on a new function to `PUBLIC`, which PostgREST exposes as an RPC endpoint. |
| **A transaction could reference another user's category, and a category could be parented under one.** Not reading their data — writing into their tree. | A foreign key is checked with the *referenced* table's rights, so RLS is not consulted. Knowing a UUID was enough. |
| **`currency`, `theme` and `display_name` accepted anything.** A five-thousand-character display name was stored and rendered. | RLS decides *whose* rows you may write, never *what* you may put in them. |

Revoking from `PUBLIC` alone does not fix the first one: Supabase grants
`EXECUTE` to `anon` and `authenticated` explicitly, and an explicit grant
survives a revoke aimed at `PUBLIC`. `0006` revokes from all three.

### Checking it took

In the SQL editor:

```sql
-- Three tables, all with rowsecurity = true.
select tablename, rowsecurity from pg_tables where schemaname = 'public';

-- Four policies.
select tablename, policyname, cmd from pg_policies where schemaname = 'public';

-- The two security-definer functions must be callable by postgres only.
-- Seeing `anon=X` or `authenticated=X` here means 0006 has not been applied.
select p.proname, p.prosecdef as security_definer, p.proacl::text as grants
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('seed_default_categories', 'handle_new_user');

-- The tenant-safe foreign keys: both must be two-column.
select conname, pg_get_constraintdef(oid)
  from pg_constraint
 where conname in ('transactions_category_fkey', 'categories_parent_fkey');
```

If `rowsecurity` is ever `false` on a table, stop: the anon key ships in the
bundle, so the policies are the only thing standing between one user's ledger
and everyone else's.

## 2. Auth

**Authentication → Sign In / Providers**

- **Email** is on by default. Decide whether to require confirmation; the app
  handles both — it shows "check your inbox" when Supabase returns no session.
- **Google** is off by default, and until it is switched on the app gets
  `{"error_code":"validation_failed","msg":"Unsupported provider: provider is
  not enabled"}` the moment the button is pressed. Turning it on is two halves,
  and both are needed:

  **Half one — Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):

  1. Create or pick a project.
  2. **APIs & Services → OAuth consent screen**. User type **External**. Fill in
     the app name, a support email and a developer email. The scopes it needs
     are the default three: `openid`, `.../auth/userinfo.email` and
     `.../auth/userinfo.profile`.

     While the consent screen is in **Testing**, only the accounts listed under
     *Test users* can sign in — everyone else gets "access blocked". Add your
     own address there, or press **Publish app**.
  3. **APIs & Services → Credentials → Create credentials → OAuth client ID**,
     type **Web application**.

     | Field                        | Value                                              |
     | ---------------------------- | -------------------------------------------------- |
     | Authorized JavaScript origins | `https://kakei-money.vercel.app` and `http://localhost:5173` |
     | Authorized redirect URIs      | `https://<project-ref>.supabase.co/auth/v1/callback` |

     The redirect URI is **Supabase's** callback, not the app's own address.
     This is the single most common mistake: Google returns the user to
     Supabase, and Supabase is what returns them to the app.
  4. Copy the **Client ID** and **Client secret**.

  **Half two — Supabase dashboard**: **Authentication → Sign In / Providers →
  Google**. Toggle it on, paste both values, **Save**. Google can take a few
  minutes to honour a newly added redirect URI, so a failure straight after
  saving is worth one retry before debugging it.

**Authentication → URL Configuration**

- **Site URL**: the production origin — `https://kakei-money.vercel.app`.
- **Redirect URLs**, one line each:
  - `https://kakei-money.vercel.app/**`
  - `http://localhost:5173/**` — development
  - `https://kakei-money-*.vercel.app/**` — Vercel previews, if you use them

The app signs in with `redirectTo: window.location.origin`, so any origin it is
served from has to be on that list or Google returns to the Site URL instead.

## 3. Environment variables

### Locally — `.env.local`

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon / public key>
```

Both come from **Project Settings → API Keys**.

> ### The one mistake that matters
>
> `VITE_SUPABASE_ANON_KEY` takes the **publishable** key — the one beginning
> `sb_publishable_`. That key is public by design: it ships inside the
> JavaScript bundle, and row-level security is the boundary, not the key. On its
> own it returns nothing: every policy is scoped to `auth.uid()`, which is null
> without a session.
>
> **Do not reach for the Legacy API keys.** There are two, both begin `eyJ`, and
> one of them is `service_role`. They are indistinguishable at a glance and the
> wrong one is a total bypass — that mistake broke this deploy twice. The
> publishable key does the same job with nothing to get wrong.
>
> The **`sb_secret_`** key (older projects: `service_role`) must never go there.
> It bypasses every policy in section 1, so anyone who opens the site's
> JavaScript can read and write every user's data. And because `VITE_` variables
> are **inlined at build time**, putting it in that variable does not keep it on
> the server — it publishes it.
>
> This happened once on this project. The build now refuses to compile a bundle
> containing a secret key (`kakei:refuse-secret-key` in `vite.config.ts`), and
> the app refuses to start on one in `pnpm dev`. If one has already been
> deployed, **revoke it in the dashboard first** — replacing the variable does
> not invalidate the key that is already out.

### Checking a key before it goes anywhere

```sh
pnpm check:env
```

Reads `.env.local` (or the real environment, so CI can use it too) and answers
the three questions that have each cost this project an outage: is the variable
set, is it a secret key, and does it belong to *this* project. Then it asks the
project itself, and prints which sign-in providers are enabled.

A key carries the project it was issued for in its `ref` claim, so one borrowed
from another Supabase project is caught here rather than as a 401 on every
request after the deploy.

### On Vercel — Project Settings → Environment Variables

| Name                     | Value                             | Environments                     |
| ------------------------ | --------------------------------- | -------------------------------- |
| `VITE_SUPABASE_URL`      | `https://<project-ref>.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | the `anon` / publishable key      | Production, Preview, Development |
| `VITE_SITE_URL`          | `https://kakei-money.vercel.app`  | Production                       |

`VITE_SITE_URL` is only read at build time, to turn the `og:` URLs in
`index.html` into absolute ones. Leave it unset and the social card falls back
to root-relative paths, which most crawlers still follow — nothing else breaks.

A `VITE_` variable is inlined into the bundle at build time, so **changing one
requires a redeploy**, not just a restart.

### On GitHub — Settings → Secrets and variables → Actions

Only needed for the keep-alive workflow, which stops a free Supabase project
pausing after seven idle days and taking the live demo with it:

| Secret                  | Value                               |
| ----------------------- | ----------------------------------- |
| `SUPABASE_URL`          | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY`     | the anon key                        |

Without them the workflow logs a warning and skips, rather than failing.

## 4. Vercel

Import the repository and accept the defaults — the framework preset is Vite.

The **project name** decides the subdomain, and it is the one setting that is
awkward to change later: it is baked into `VITE_SITE_URL`, into Supabase's Site
URL and into the OAuth redirect list. `kakei-money` — the same name-plus-subject
shape as `hibi-habit`, since the two are siblings.

| Setting          | Value           |
| ---------------- | --------------- |
| Build command    | `pnpm build`    |
| Output directory | `dist`          |
| Install command  | `pnpm install`  |
| Node version     | 24.x            |

[`vercel.json`](../vercel.json) rewrites to `index.html`, which is what makes a
cold load of `/ledger?direction=out` work — every route in this app is
client-side. Two details in it are load-bearing:

- **Asset paths are excluded from the rewrite.** Every route is a dynamic import
  with a content-hashed filename, so a tab left open across a deploy asks for
  chunks the server has already replaced. With a blanket rewrite those requests
  come back as `index.html` with a **200**, and the browser reports
  `Expected a JavaScript-or-Wasm module script but the server responded with a
  MIME type of "text/html"` — which names neither the cause nor the fix. They
  now 404 honestly, and the router turns that into one reload.
- **`index.html` and `sw.js` are never cached.** The entry document is the only
  file that knows which hashed chunks belong to this build; a cached copy keeps
  asking for the previous one. The hashed assets under `/assets/` are the
  opposite — their content can never change under a given name, so they are
  `immutable` for a year.

### If a screen goes blank right after a deploy

That is the stale-tab case above, in a browser that loaded the app before the
fix shipped. The app now reloads itself once when a chunk fails; a browser
holding an older service worker needs one nudge:

1. DevTools → **Application** → **Service Workers** → **Unregister**
2. Reload

Or check it in a private window first, which starts with no worker at all.

## 5. After the first deploy

- Sign up with email, and confirm the ledger opens with a tree of categories in
  your language. If it is empty, migration `0003` did not run.
- Sign in with Google from the deployed origin. A redirect back to the wrong
  host means the origin is missing from **Redirect URLs**.
- Add an entry, then open the Month tab: in, out and net should all move.
- Install it to the Home Screen and reopen it offline; the shell should still
  render.

## What is deliberately not here

- **No custom domain.** Add one in Vercel and update `VITE_SITE_URL` and the
  Supabase **Site URL** together, or the social card and the OAuth return will
  point at different hosts.
- **No account deletion.** Supabase does not let a client delete its own auth
  user — that needs the service role, which must never reach the browser.
  Settings deletes all of the data and says so plainly; an Edge Function can
  finish the job later.
- **No multi-currency.** One ledger holds one currency. Changing it in Settings
  changes how amounts are *displayed*; it does not convert what is already
  stored.
