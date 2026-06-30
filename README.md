# Oducado Family Reunion

Interactive reunion website backed by [Supabase](https://supabase.com). This repo starts with the database layer for polls; the React frontend will connect to these tables and RPC functions.

## Prerequisites

- A Supabase account and a new project (you already created these)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (recommended), **or** access to the Supabase SQL Editor in the dashboard

## Database setup

### 1. Link your Supabase project (CLI path)

From the repo root:

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Find `YOUR_PROJECT_REF` in the Supabase dashboard under **Project Settings → General**.

### 2. Apply migrations

Migrations live in `supabase/migrations/` and must be run in order:

| File | Purpose |
|------|---------|
| `001_extensions_and_profiles.sql` | Admin profiles tied to Supabase Auth |
| `002_polls_schema.sql` | Polls, categories, options, voters, votes, result views |
| `003_poll_rls_and_functions.sql` | Row-level security and ballot submission RPCs |
| `004_named_voters.sql` | Required names for guests, shared-device support |
| `005_allow_name_recast.sql` | Re-entering a name loads and updates the existing ballot |
| `006_poll_roster.sql` | Pre-defined guest name list per poll |
| `007_poll_tables.sql` | Seating tables to group guests on the roster |
| `008_option_images.sql` | Option photos via Supabase Storage |

**Option A — Supabase CLI (recommended)**

```bash
supabase db push
```

**Option B — SQL Editor**

1. Open your project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor**.
3. Paste and run each migration file in numeric order.

If guest voting fails with **"Could not find the function … get_or_create_named_voter"**, migrations `004` and `005` have not been applied yet — run them (in order), then retry.

### 3. Create your first admin user

1. In the dashboard, go to **Authentication → Users → Add user**.
2. Create a user with email and password (this is your reunion admin account).
3. Copy the new user's UUID from the users table.
4. Run this in the SQL Editor (replace the UUID):

```sql
update public.profiles
set is_admin = true,
    display_name = 'Reunion Admin'
where id = 'YOUR_USER_UUID';
```

Only users with `is_admin = true` can create polls, configure categories/options, cast proxy votes, and see draft polls.

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your project values from **Project Settings → API Keys**:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

| Variable | Where to use | Dashboard key |
|----------|--------------|---------------|
| `VITE_SUPABASE_PUBLISHABLE_KEY` | React app (browser) | **Publishable** (`sb_publishable_...`) |
| `SUPABASE_SECRET_KEY` | Server scripts / CI only — **never** prefix with `VITE_` | **Secret** (`sb_secret_...`) |

The publishable key is safe in client code when RLS is enabled (as in these migrations). The secret key bypasses RLS and must stay off the frontend.

> **Note:** Migrations grant access to the Postgres roles `anon` and `authenticated`. That is unrelated to the legacy JWT **anon API key** — the publishable key still connects as the `anon` role for unauthenticated requests.

## Poll system overview

### Data model

```
polls
 └── poll_categories (min_selections, max_selections per category)
      └── poll_options
poll_voters (one ballot per person name; shared devices supported)
 └── poll_votes (selections on a ballot)
```

- **Poll** — title, description, status (`draft` → `open` → `closed`), optional open/close times.
- **Category** — groups options (e.g. "Appetizers", "Activities"). Each category has `min_selections` (required picks) and optional `max_selections`.
- **Option** — a selectable choice within a category.
- **Voter** — one ballot per person name per poll. Guests enter their name; shared devices can submit multiple ballots with different names. Admins can also cast proxy ballots.
- **Vote** — links a voter to an option. `cast_by` is set when an admin submits on behalf of someone.

### Guest voting flow

1. Guest selects their name from the roster (or enters it manually if not listed).
2. The app calls `get_or_create_named_voter(poll_id, name, device_id)`.
3. Guest submits selections via `submit_poll_ballot(poll_id, voter_id, option_ids, null, device_id)`.

Admins configure tables and the guest list under **Roster** on each poll. Each name gets one ballot per poll and can update it anytime by selecting the same name again.

### Running totals

Query these views for live results:

- `poll_option_results` — vote count per option, grouped by category.
- `poll_summary` — total ballots and total selections per poll.

Admins can read results for any poll status; the public can read results for `open` and `closed` polls.

### Admin proxy voting flow

1. Authenticate as an admin user.
2. Create a proxy voter: `create_proxy_voter(poll_id, 'Aunt Maria')`.
3. Submit their ballot: `submit_poll_ballot(poll_id, voter_id, option_ids, auth.uid())`.

Pass your user UUID as `p_cast_by` so the vote is recorded as admin-cast. The `p_device_id` argument is not needed for proxy ballots.

### Example: create a poll end-to-end

Paste this **entire block** into the SQL Editor and run it once. It creates the poll, categories, options, opens the poll, and shows results — no manual UUID copy/paste.

If you want the poll tied to your admin account, replace `null` on `created_by` with your user UUID (from **Authentication → Users**).

```sql
with new_poll as (
  insert into public.polls (title, description, status, created_by)
  values (
    'Saturday dinner menu',
    'Pick your favorites for the reunion dinner.',
    'draft',
    null  -- optional: 'YOUR_ADMIN_USER_UUID'::uuid
  )
  returning id
),
main_cat as (
  insert into public.poll_categories (poll_id, name, min_selections, max_selections, display_order)
  select id, 'Main dishes', 1, 2, 0 from new_poll
  returning id
),
dessert_cat as (
  insert into public.poll_categories (poll_id, name, min_selections, max_selections, display_order)
  select id, 'Desserts', 1, null, 1 from new_poll
  returning id
),
insert_options as (
  insert into public.poll_options (category_id, label, display_order)
  select main_cat.id, option_label, option_order
  from main_cat
  cross join (values
    ('Lechon', 0),
    ('Grilled fish', 1)
  ) as t(option_label, option_order)
  union all
  select dessert_cat.id, option_label, option_order
  from dessert_cat
  cross join (values
    ('Leche flan', 0),
    ('Halo-halo', 1)
  ) as t(option_label, option_order)
  returning 1
),
opened as (
  update public.polls p
  set status = 'open', opens_at = now()
  from new_poll np
  where p.id = np.id
  returning p.id as poll_id
)
select o.poll_id, r.*
from opened o
join public.poll_option_results r on r.poll_id = o.poll_id
order by r.category_order, r.option_order;
```

After it runs, note the `poll_id` in the first result row — you'll need it in the frontend.

To inspect results later for a specific poll:

```sql
select * from public.poll_option_results where poll_id = 'paste-real-uuid-here';
select * from public.poll_summary where poll_id = 'paste-real-uuid-here';
```

Use a real UUID from the first query (e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`). Placeholder strings like `POLL_UUID` are not valid.

## Frontend

The Vite + React app connects to Supabase for polls and admin management.

### Routes

| Path | Who | Purpose |
|------|-----|---------|
| `/` | Everyone | Guest list — pick your name |
| `/vote?name=…` | Everyone | Ballot for the selected guest |
| `/results` | Everyone | Live results for the active (or most recent) poll |
| `/admin/login` | Organizers | Sign in |
| `/admin` | Admins | Poll dashboard |
| `/admin/polls/:id` | Admins | Edit poll, categories, results, proxy votes |

### Install and run

```bash
npm install
npm run dev
```

Visit `/admin/login` with the admin user you created during database setup.

## Deploy to production (Railway)

The frontend is a static Vite build served with `vite preview`. Supabase stays hosted on [Supabase](https://supabase.com) — Railway only runs the React app.

### Before you deploy

1. **Apply all database migrations** to your production Supabase project (see [Database setup](#database-setup)).
2. **Create an admin user** and set `is_admin = true` on their profile.
3. **Push this repo to GitHub** (or GitLab) if it is not there already.

### 1. Create a Railway service

1. Open the [Railway dashboard](https://railway.com) and create a **New Project**.
2. Choose **Deploy from GitHub repo** and select this repository.
3. Railway detects Node.js automatically. Confirm these settings under the service **Settings → Deploy**:

| Setting | Value |
|---------|--------|
| **Build command** | `npm run build` |
| **Start command** | `npm run start` |
| **Root directory** | `/` (repo root) |

The `start` script serves the `dist/` folder and handles client-side routing (`/vote`, `/results`, `/admin`, etc.).

### 2. Set environment variables

In Railway, open your service → **Variables** and add:

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://YOUR_PROJECT_REF.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase **publishable** key (`sb_publishable_...`) |

Copy values from **Supabase → Project Settings → API Keys**.

> **Important:** Vite bakes `VITE_*` variables in at **build time**. After adding or changing them in Railway, trigger a **Redeploy** so the build runs again.

Do **not** set `SUPABASE_SECRET_KEY` on Railway unless you add server-side code later. The browser app only needs the publishable key.

### 3. Generate a public URL

1. In Railway, open **Settings → Networking**.
2. Click **Generate domain** (e.g. `oducado-production.up.railway.app`).
3. Railway provisions HTTPS automatically — required for admin camera uploads and a smooth mobile experience.

### 4. Configure Supabase Auth (admin login)

In the Supabase dashboard, go to **Authentication → URL Configuration**:

| Field | Value |
|-------|--------|
| **Site URL** | `https://YOUR_RAILWAY_DOMAIN` |
| **Redirect URLs** | `https://YOUR_RAILWAY_DOMAIN/**` |

Add your custom domain here too if you attach one later.

### 5. Deploy and verify

1. Railway deploys on every push to the connected branch (usually `main`).
2. Open your Railway URL and check:
   - `/` — guest list loads
   - `/admin/login` — admin sign-in works
   - `/results` — results load for an open or closed poll
3. On a phone, test **Take photo** on an option (admin → poll → Categories) to confirm camera access over HTTPS.

### Custom domain (optional)

1. In Railway **Settings → Networking**, add your custom domain (e.g. `polls.yourfamily.com`).
2. Add the DNS records Railway shows at your registrar.
3. Update **Supabase Auth → Site URL** and **Redirect URLs** to use the custom domain.
4. Redeploy if you changed any `VITE_*` variables.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Blank page or “Missing VITE_SUPABASE…” | Set both `VITE_*` variables in Railway and **Redeploy**. |
| Admin login redirects to localhost | Update Supabase **Site URL** and **Redirect URLs** to your Railway domain. |
| Guest voting RPC errors | Run migrations `001`–`008` on the Supabase project (see [Database setup](#database-setup)). |
| Photos won’t upload | Confirm the site is served over `https://` and migration `008_option_images.sql` has been applied. |
| `/vote` or `/admin` 404 on refresh | Ensure **Start command** is `npm run start` (not a static file server without SPA fallback). |

### Local production preview

To mimic Railway locally after a build:

```bash
npm run build
PORT=4173 npm run start
```

Use `.env.local` for local `VITE_*` values (see [Configure environment variables](#4-configure-environment-variables)).

## Security notes

- Row Level Security (RLS) is enabled on all tables. Anonymous users can vote on open polls with a name; only admins can manage poll configuration.
- `submit_poll_ballot`, `get_or_create_named_voter`, and `create_proxy_voter` run as `security definer` functions with explicit checks — keep them granted only as defined in the migrations.
- For production, consider rate limiting at the edge and monitoring unusual vote patterns.

## Project structure

```
supabase/
  migrations/          # SQL migrations (run in order)
src/                   # React frontend (Vite + React Router)
```
