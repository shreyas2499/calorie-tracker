# Calorie & Weight Tracker

A personal daily tracker for calories and body weight. Single user, no login, built to be opened
once in the morning and once at night and to take about ten seconds to use.

The backend owns every calculation. The frontend renders what the API returns and never invents a
derived number.

---

## Features

- **Profile** — name, age, sex, height, current weight, metric/imperial preference, activity level,
  optional manual maintenance override.
- **Maintenance calories** — Mifflin-St Jeor BMR × activity multiplier, recalculated automatically
  whenever weight, height, age, sex or activity level changes. Every change is logged to
  `maintenance_history`.
- **Daily calorie tracking** — consumed, burned, net, balance against the maintenance target, and a
  theoretical weight-change estimate. One entry per date; saving again updates it.
- **Daily weight tracking** — morning and evening readings, independently editable, averaged into a
  daily figure. Either reading alone is enough.
- **Dashboard** — summary cards plus compact quick-entry forms for today and recent trend charts.
- **Charts** — calorie lines (consumed / burned / net / maintenance) with an optional balance bar
  series, and weight lines (morning / evening / average / 7-day rolling average), with 7/14/30/90
  day, all-time and custom-range filters.
- **Progress** — weight change, percentage change, averages, tracked and missing days, current and
  longest streaks, and a plain-language summary.
- **History** — sortable, filterable, searchable, paginated tables with edit, delete confirmation
  and CSV export.

Status is always communicated with a text label (`Deficit`, `Surplus`, `At maintenance`,
`No data recorded`) and a symbol, never with colour alone.

> The estimated weight change is a rough arithmetic figure based on roughly 7,700 kcal per kg of
> body mass. It is not medical advice and will not match real weight change. Nothing in the app
> claims that your calorie balance caused a recorded weight change.

---

## Technology

| Layer    | Stack |
| -------- | ----- |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Recharts, React Hook Form, Zod |
| Backend  | Python 3.11, Flask (application factory), Flask-SQLAlchemy, Flask-Migrate, Flask-CORS, Pydantic v2, Gunicorn |
| Database | PostgreSQL |
| Hosting  | Railway (three services: Postgres, backend, frontend) |

No Docker, no Docker Compose.

---

## Project structure

```text
calorie-tracker/
  backend/
    app/
      __init__.py            application factory
      config.py              env handling, postgres:// -> postgresql:// fix
      domain.py              framework-free constants and validation limits
      errors.py              consistent JSON error shape
      extensions.py          db / migrate / cors singletons
      cli.py                 flask seed-default-user, flask show-config
      models/                user, calorie_entry, weight_entry, maintenance_history
      routes/                health, profile, calories, weight, analytics, helpers
      schemas/               pydantic request validation + serializers
      services/
        formulas.py          all pure maths (no Flask, no DB)
        maintenance_service.py
        calorie_service.py
        weight_service.py
        analytics_service.py
      utils/                 units.py, dates.py
    migrations/              alembic
    tests/
    run.py                   exposes `app = create_app()`
    requirements.txt
    Procfile
    railway.json
    .env.example
  frontend/
    app/                     /, /profile, /calories, /weight, /progress
    components/              dashboard, forms, charts, tables, layout, ui
    lib/                     api (client), units, dates, hooks, validation
    types/                   API request/response interfaces
    tests/
    package.json
    next.config.ts
    railway.json
    .env.example
  README.md
```

Design rules the code follows: no logic in a single `app.py`, no database queries inside route
handlers, all maths in `services/formulas.py` so it is reusable and testable, one unit-conversion
module (`app/utils/units.py`), and one frontend API client (`lib/api/`).

---

## Local development

You need Python 3.11+, Node 18+, and a PostgreSQL connection string. If you do not have Postgres
installed locally, use the public `DATABASE_URL` from your Railway Postgres service (see below) —
it works from your machine.

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate           # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # then fill in DATABASE_URL and SECRET_KEY
flask db upgrade
flask seed-default-user
flask run                          # http://localhost:5000
```

Sanity check:

```bash
curl http://localhost:5000/api/v1/health      # {"status":"ok"}
curl http://localhost:5000/api/v1/profile
```

`flask show-config` prints the resolved environment, redacted database URL and CORS origins — handy
when a deployment misbehaves.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                        # http://localhost:3000
```

The dashboard hits `GET /api/v1/dashboard` on load, so a successful page render confirms
frontend-to-backend communication.

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `DATABASE_URL` | yes | PostgreSQL URL. A `postgres://` prefix is rewritten to `postgresql://` automatically. |
| `SECRET_KEY` | yes in production | Startup fails with a clear message if missing when `FLASK_ENV=production`. |
| `FLASK_ENV` | no | `development` (default) or `production`. |
| `CORS_ORIGINS` | no | Comma-separated list, e.g. `http://localhost:3000,https://app.up.railway.app`. Defaults to `http://localhost:3000`. |
| `PORT` | no | Supplied by Railway. Gunicorn binds to it. |

### Frontend (`frontend/.env.local`)

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `NEXT_PUBLIC_API_URL` | yes | Include the `/api/v1` suffix. Local: `http://localhost:5000/api/v1`. Production: `https://<backend>.up.railway.app/api/v1`. |

`NEXT_PUBLIC_*` variables are baked in at build time — after changing it on Railway you must
redeploy the frontend, not just restart it.

---

## Database migrations

Flask-Migrate/Alembic. `FLASK_APP=run.py` is set in `backend/.flaskenv`, so the CLI works from the
`backend/` directory.

```bash
flask db upgrade                      # apply (the only command you normally need)
flask db migrate -m "Add something"   # autogenerate after changing a model
flask db downgrade                    # roll back one revision
flask db current                      # show applied revision
```

The initial migration (`migrations/versions/0001_initial_schema.py`) creates all four tables with
the `user_id + entry_date` unique constraints. Tables are never created or dropped at application
startup.

### Seeding

```bash
flask seed-default-user
flask seed-default-user --name "Shreyas"
```

Idempotent: if a user already exists it prints the existing user and exits without inserting.
You can also create the profile from the `/profile` page instead — the first `POST /api/v1/profile`
creates the single user.

---

## API summary

Base path: `/api/v1`. Successful responses are `{"data": ...}`; list endpoints return
`{"items": [...], "pagination": {...}}`. Errors are always:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted data is invalid.",
    "fields": { "morning_weight_kg": "Weight must be greater than zero." }
  }
}
```

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/health` | Railway health check, returns `{"status":"ok"}` |
| GET / POST / PUT | `/profile` | Read, create, update the profile (recalculates maintenance) |
| GET | `/maintenance` | BMR, calculated, manual and active targets, last recalculation |
| POST | `/maintenance/recalculate` | Recalculate; optional body `{"manual_maintenance_calories": 2400}` or `null` to clear |
| GET | `/maintenance/history` | Every change to the active target |
| GET / POST | `/calorie-entries` | List (filter, search, sort, paginate) / create-or-update |
| GET / PUT / DELETE | `/calorie-entries/:id` | Single entry operations |
| GET / PUT | `/calorie-entries/by-date/:date` | Read / upsert by date — used by the dashboard |
| GET | `/calorie-entries/export` | CSV export |
| GET / POST | `/weight-entries` | List / create-or-update |
| GET / PUT / DELETE | `/weight-entries/:id` | Single entry operations |
| GET / PUT | `/weight-entries/by-date/:date` | Read / upsert by date |
| GET | `/weight-entries/export` | CSV export |
| GET | `/dashboard` | Today's entries, period summary and both chart series in one call |
| GET | `/analytics/calories` | Chart-ready dense calorie series |
| GET | `/analytics/weight` | Chart-ready weight series with 7-day rolling average |
| GET | `/analytics/summary` | Progress metrics, streaks and summary text |

Query parameters: `range` (`7d`, `14d`, `30d`, `90d`, `all`), `start_date`, `end_date`, `today`
(the client's local date), `page`, `per_page`, `search`, `sort`.

```bash
GET /api/v1/analytics/calories?range=30d
GET /api/v1/analytics/weight?start_date=2026-07-01&end_date=2026-07-31
GET /api/v1/dashboard?today=2026-08-03&range_days=30
```

### Dates

Daily record dates are plain `YYYY-MM-DD` strings in **your local timezone**, always sent
explicitly by the browser. The server never derives a daily date from its own clock.
`created_at`/`updated_at` are UTC timestamps.

### Validation limits

Age 13–120 · height 100–250 cm · weight 25–400 kg · calories consumed 0–20,000 · calories burned
0–10,000 · notes ≤ 1,000 characters. Negative calories and weights are rejected, at least one weight
reading is required, and calculated fields submitted by the client are ignored.

---

## Testing

### Backend

```bash
cd backend
source venv/bin/activate
pip install -r requirements-dev.txt
pytest                               # everything
pytest tests/test_formulas.py -v     # pure calculation layer only
```

94 tests covering BMR for both sexes, all five activity multipliers, rounding, the manual override,
net calories, deficit/surplus/at-maintenance classification, the three average-weight cases,
duplicate-date prevention, date-based upserts, the historical maintenance snapshot, date-range
analytics, the 7-day rolling average, current and longest streaks, unit conversion, and the JSON
error shape.

The API tests run against a temporary SQLite file so no database service is needed; PostgreSQL
remains the development and production database.

### Frontend

```bash
cd frontend
npm test
```

Covers profile form validation (including metric/imperial switching), calorie quick entry, weight
quick entry, editing an existing daily entry, unit conversion and formatting, empty chart states,
API error mapping onto form fields, and loading states.

---

## Railway deployment

Three services in one project: **Postgres**, **backend**, **frontend**.

### 1. PostgreSQL

New Project → **Deploy PostgreSQL**. Railway generates `DATABASE_URL` on the service's Variables
tab. Do not put it in any frontend variable.

### 2. Backend service

New → **GitHub Repo** → this repository.

- **Settings → Root Directory**: `backend`
- **Settings → Start Command**: `gunicorn --bind 0.0.0.0:$PORT run:app`
- **Settings → Health Check Path**: `/api/v1/health`
- **Settings → Networking**: Generate Domain

Variables:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
SECRET_KEY=<a long random string>
FLASK_ENV=production
CORS_ORIGINS=https://<your-frontend>.up.railway.app
```

`${{Postgres.DATABASE_URL}}` is a Railway reference variable — it stays correct if the database is
rotated. Substitute your Postgres service's actual name if it differs.

`backend/railway.json` sets `preDeployCommand: flask db upgrade`, so migrations run on every deploy
before the new version takes traffic. To run them by hand instead:

```bash
railway link            # choose the project, then the backend service
railway run flask db upgrade
railway run flask seed-default-user
```

### 3. Frontend service

New → **GitHub Repo** → the same repository.

- **Settings → Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Start Command**: `npm run start` (the script is `next start -p ${PORT:-3000}`, so it binds to
  Railway's assigned port)
- **Settings → Networking**: Generate Domain

Variables:

```text
NEXT_PUBLIC_API_URL=https://<your-backend>.up.railway.app/api/v1
```

### 4. Connect the two domains

1. Deploy the backend, generate its domain, and copy it.
2. Set `NEXT_PUBLIC_API_URL` on the frontend to that domain **plus `/api/v1`**, then redeploy the
   frontend.
3. Set `CORS_ORIGINS` on the backend to the frontend's domain (scheme included, no trailing slash),
   then redeploy the backend.
4. Open `https://<backend>/api/v1/health`, then the frontend, then save an entry.

Multiple origins are supported as a comma-separated list, which is useful while testing:

```text
CORS_ORIGINS=http://localhost:3000,https://<your-frontend>.up.railway.app
```

### Troubleshooting

| Symptom | Cause and fix |
| ------- | ------------- |
| Deploy crashes with `DATABASE_URL is not set` | The backend variable is missing or the reference points at a renamed Postgres service. |
| `SECRET_KEY is required when FLASK_ENV=production` | Add `SECRET_KEY`. Any long random string works. |
| `could not translate host name` / SSL errors | You used the *private* database URL from outside Railway, or the *public* one from inside. Inside the project use `${{Postgres.DATABASE_URL}}`. |
| Health check fails, service restarts | Health check path must be `/api/v1/health`; the start command must bind `0.0.0.0:$PORT` (not `127.0.0.1`, not a fixed port). |
| `relation "users" does not exist` | Migrations have not run. Redeploy so `preDeployCommand` executes, or run `railway run flask db upgrade`. |
| Frontend shows "Could not reach the API" | `NEXT_PUBLIC_API_URL` is wrong or missing the `/api/v1` suffix. It is a build-time value — redeploy after changing it. |
| Browser console shows a CORS error | `CORS_ORIGINS` on the backend does not exactly match the frontend origin (scheme, no trailing slash). Redeploy the backend after changing it. |
| API returns 404 `PROFILE_NOT_FOUND` | Run `flask seed-default-user`, or create the profile from the `/profile` page. |
| Frontend build fails on `next start` | Do not override the start command with `next dev`. Use `npm run start`. |
| Everything 500s after a model change | A migration is missing: `flask db migrate -m "..."`, commit it, redeploy. |
