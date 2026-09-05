# Backend de Kinfolk

Backend REST de Kinfolk desarrollado con **FastAPI**, Python 3.12, SQLAlchemy 2, Pydantic 2, Alembic, psycopg 3 y PostgreSQL.

## Desarrollo local

Todos los comandos se ejecutan desde `backend/`.

Instalar dependencias:

```bash
uv sync --frozen --python 3.12
```

Configurar la base de datos:

```bash
export DATABASE_URL=postgresql+psycopg://crm:crm@localhost:55432/crm
```

Aplicar migraciones:

```bash
uv run alembic upgrade head
```

Iniciar el servidor:

```bash
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

OpenAPI estará disponible en:

```text
http://localhost:8000/docs
```

## Tests y validaciones

Crear la base de pruebas una vez:

```bash
docker compose exec postgres createdb -U crm crm_test
```

Ejecutar tests:

```bash
TEST_DATABASE_URL="postgresql+psycopg://crm:crm@localhost:55432/crm_test" uv run pytest -q
```

Lint y formato:

```bash
uv run ruff check .
uv run ruff format --check .
```

Los tests utilizan PostgreSQL real y una base separada terminada en `_test`.

## Migraciones

Crear una migración:

```bash
uv run alembic revision --autogenerate -m "descripcion del cambio"
```

Aplicarla:

```bash
uv run alembic upgrade head
```

Comprobar diferencias:

```bash
uv run alembic check
```

Las migraciones generadas automáticamente deben revisarse antes de aplicarse.

## Docker

El backend también puede ejecutarse como parte del stack completo desde la raíz:

```bash
docker compose up --build -d --wait
```

FastAPI escucha internamente en el puerto `8000`.

Dentro de Docker, PostgreSQL se encuentra en:

```text
postgres:5432
```

y n8n en:

```text
n8n:5678
```

## Seguridad

El backend actualmente está diseñado para un único usuario y no implementa autenticación.

(no exponer directamente a Internet sin una capa apropiada de autenticación y configuración de producción).