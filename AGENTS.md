# Personal CRM Maintenance

- Modular monolith: Next.js in `frontend/`; FastAPI/SQLAlchemy in `backend/`; PostgreSQL is owned exclusively by the backend. No auth yet: loopback-only ports, never publicly deploy as-is.
- `frontend/src/app/`: dashboard, contacts, detail, follow-ups. `components/`: forms and UI. `lib/`: API types/helper and date conversion. Browser uses relative `/api`, rewritten by Next to `API_INTERNAL_URL` (build-time for production).
- `backend/app/`: models, schemas, settings, routes. `backend/migrations/`: Alembic. `backend/tests/`: real PostgreSQL API tests, isolated random schemas in a separate `*_test` database.
- Start: `docker compose up --build -d --wait`. Inspect: `docker compose ps`, `docker compose logs backend migrate`. Stop: `docker compose down` (keeps data). Never remove the database volume without permission.
- Database host port defaults to 55432. Container address is `postgres:5432`, never localhost. Migration service must finish before backend starts.
- Backend (from `backend/`): `uv sync --frozen --python 3.12`; `uv run ruff check .`; `uv run ruff format --check .`; `TEST_DATABASE_URL=postgresql+psycopg://crm:crm@localhost:55432/crm_test uv run pytest -q`.
- Create test DB once: `docker compose exec postgres createdb -U crm crm_test`. Tests refuse the application database; do not bypass this safeguard.
- Frontend (from `frontend/`): `npm ci`; `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `npm run dev`.
- Migrations: `docker compose run --rm migrate`. Create locally from `backend/` with `DATABASE_URL=postgresql+psycopg://crm:crm@localhost:55432/crm uv run alembic revision --autogenerate -m "description"`; review generated SQL/constraints, test upgrade and downgrade. Do not use runtime `create_all`.
- Contact deletion cascades interactions. `last_contacted_at` is read-only, derived from latest call/email/meeting; all interaction writes lock the parent and recompute transactionally. Notes do not count.
- Follow-ups use UTC day boundaries and exclude closed contacts. UI date inputs/display use local time and submit offset-aware instants. PATCH distinguishes omitted fields from null.
- Keep dependencies locked, errors structured, forms accessible, mutations confirmed where destructive. No mock data, speculative layers, authentication, automation, or deployment infrastructure in this phase.
- CI `.github/workflows/ci.yml`: backend tests/lint, frontend tests/lint/type/build, Docker build/start/health. No CD.
