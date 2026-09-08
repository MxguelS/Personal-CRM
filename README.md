# Kinfolk — Personal CRM

Kinfolk es un CRM personal para gestionar contactos, registrar interacciones, organizar seguimientos y consultar actividad desde un dashboard.

Incluye automatizaciones con n8n, notificaciones por Discord, PostgreSQL, Docker y CI/CD con GitHub Actions.

---

## Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4

### Backend

- Python 3.12
- FastAPI
- SQLAlchemy 2
- Pydantic 2
- Alembic
- psycopg 3

### Infraestructura y automatización

- PostgreSQL 16
- Docker / Docker Compose
- n8n
- GitHub Actions
- GHCR

---

## Arquitectura

```text
Navegador
   ↓
Next.js :3000
   ↓
FastAPI :8000
   ↓
PostgreSQL :5432

FastAPI
   ↓
n8n :5678
   ↓
Discord
```

Next.js se encarga de la interfaz y FastAPI de la lógica de negocio, validación y persistencia. Alembic administra las migraciones de la base de datos.

---

## Funciones principales

- Gestión de contactos.
- Búsqueda, filtros y paginación.
- Historial de interacciones.
- Seguimientos pendientes y vencidos.
- Dashboard con métricas y actividad reciente.
- Validación de datos.
- Migraciones de base de datos.
- Automatizaciones con n8n.
- Notificaciones por Discord.

---

## Ejecutar con Docker

### Requisitos

- Docker con Docker Compose v2+
- Git

No es necesario instalar Node.js, Python, PostgreSQL ni n8n en el host.

Clona el repositorio y entra al proyecto:

```bash
git clone https://github.com/MxguelS/Personal-CRM.git
cd Personal-CRM
```

Crea el archivo de entorno.

Linux/macOS/Git Bash:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Levanta el stack:

```bash
docker compose up --build -d --wait
```

En una instalación limpia, la imagen local de n8n importa automáticamente los workflows versionados la primera vez que se crea su volumen. El bootstrap es idempotente: reiniciar el contenedor no vuelve a importar los mismos workflows.

Servicios:

| Servicio | URL |
|---|---|
| Kinfolk | http://localhost:3000 |
| API | http://localhost:8000 |
| OpenAPI | http://localhost:8000/docs |
| n8n | http://localhost:5678 |
| PostgreSQL | localhost:55432 |

Para detenerlo:

```bash
docker compose down
```

Para eliminar también los datos almacenados:

```bash
docker compose down --volumes
```

> `--volumes` elimina los datos persistentes de PostgreSQL y n8n. En el siguiente arranque limpio, las migraciones y el bootstrap de workflows se ejecutarán de nuevo.

---

## Tests

### Backend

Desde `backend/`:

```bash
uv sync --frozen --python 3.12
TEST_DATABASE_URL="postgresql+psycopg://crm:crm@localhost:55432/crm_test" uv run pytest -q
uv run ruff check .
uv run ruff format --check .
```

### Frontend

Desde `frontend/`:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

---

## Automatizaciones

Los workflows de n8n están versionados en:

```text
n8n/workflows/
```

Actualmente Kinfolk incluye dos automatizaciones:

- Nuevo contacto en espera.
- Seguimientos del día a las `08:00` en `America/Panama`.

Los workflows exportados usan `DISCORD_WEBHOOK_URL` como placeholder y no contienen el webhook real de Discord. Después del bootstrap, configura ese secreto en n8n antes de utilizar las notificaciones de Discord.

---

## CI/CD

GitHub Actions valida backend, frontend, Docker Compose y health checks. En `main` se construyen las imágenes de backend y frontend para GHCR.

---

## Estructura

```text
Personal-CRM/
├── backend/
│   ├── app/
│   ├── migrations/
│   └── tests/
├── frontend/
├── n8n/
│   ├── Dockerfile
│   ├── docker-entrypoint-kinfolk.sh
│   └── workflows/
├── .github/
│   └── workflows/
├── compose.yml
├── .env.example
└── README.md
```

---

## Seguridad

Kinfolk actualmente no incluye autenticación.

Los servicios de Docker Compose están limitados a `127.0.0.1` para uso local.

Los archivos `.env` no se versionan y los workflows exportados de n8n utilizan placeholders en lugar de credenciales reales.
