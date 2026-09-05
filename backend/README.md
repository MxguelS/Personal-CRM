# Personal CRM Backend

FastAPI, Python 3.12, synchronous SQLAlchemy 2 and psycopg 3, PostgreSQL, Pydantic 2,
and explicit Alembic migrations. All commands below run from `backend/`.

## Local Development

```sh
uv sync --frozen --python 3.12
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

PostgreSQL must be running first. `DATABASE_URL` defaults to
`postgresql+psycopg://crm:crm@localhost:5432/crm`. Environment variables or a local
`.env` file can override settings. `CORS_ORIGINS` is a JSON array of origins and
defaults to `["http://localhost:3000"]`. See `.env.example`. OpenAPI is at `/docs`.

## Verification

Create a separate `crm_test` PostgreSQL database owned by the test user, then run:

```sh
TEST_DATABASE_URL=postgresql+psycopg://crm:crm@localhost:5432/crm_test uv run pytest -q
uv run ruff check .
uv run ruff format --check .
```

Tests require an explicit PostgreSQL URL with the `postgresql+psycopg` driver,
a database name ending in `_test`, and a database name different from the
configured application database. They fail rather than silently skip when this
is missing. Each run creates a UUID-named schema, runs real Alembic migrations in
that schema, and drops only that schema afterward. Existing schemas and data are
not reset. The test role needs schema creation permission. No SQLite is used.

## Container

```sh
docker build -t personal-crm-backend .
docker run --rm --network host -e DATABASE_URL personal-crm-backend alembic upgrade head
docker run --rm --network host -e DATABASE_URL personal-crm-backend
```

The image uses Python 3.12, a frozen production-only uv install, and UID 10001.
Its default command is Uvicorn on port 8000. Migrations are deliberately separate
from startup; orchestration should run `alembic upgrade head` before the API.
In Compose use the PostgreSQL service hostname rather than `localhost`.

## API Semantics

- Contact lists and follow-ups return `{items,total,page,page_size}`. Pages start
  at 1; page size defaults to 20 and is limited to 100. Empty pages are valid.
- Contacts sort by most recently updated by default; `name` sorts first name then
  last name case-insensitively, and `next_follow_up_at` sorts ascending with nulls
  last. Each ordering has an ID tie-breaker. Search is case-insensitive literal
  substring matching across full name, email, company, and phone.
- POST returns 201, PATCH returns the updated record, DELETE returns empty 204.
  Missing records return 404. PATCH uses only supplied fields. Nullable contact
  fields can be cleared with null; required fields cannot.
- Email writes use Pydantic `EmailStr` syntax validation without DNS/deliverability
  checks. This is intentionally stricter than browser `type=email`: single-label
  domains such as `a@b` are rejected; use an address such as `a@example.com`.
  Empty strings are rejected; use null to clear the email. Existing stored
  addresses remain readable even if they predate validation.
- `last_contacted_at` is read-only and is the maximum occurrence time of call,
  email, or meeting interactions. Notes never contribute. All interaction writes
  lock their parent contact before mutating and recomputing in one transaction.
  Contact deletion cascades to interactions at the database level.
- Follow-ups exclude closed contacts. UTC today is `[midnight,next midnight)`,
  overdue is before midnight, and upcoming starts at next midnight with no upper
  cutoff. Dashboard upcoming uses the same upcoming definition, earliest first,
  limited to 6. Recent interactions include notes, latest occurrence first,
  limited to 6, with `contact_name`.
- Input timestamps require timezone offsets. PostgreSQL stores timezone-aware
  instants; clients must not assume a particular textual offset in responses.
- Errors use `{error:{code,message,details?}}`, including validation errors.
  `/api/health` checks the database and returns 503 if unavailable.

This is a single-user API with no authentication. CORS is not access control;
keep it on a trusted network or put authentication at the deployment boundary
before exposing it publicly. Search uses substring scans, suitable for a personal
CRM; add PostgreSQL trigram indexes only if measured data volume requires them.
