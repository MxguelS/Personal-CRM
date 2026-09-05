# Kinfolk — Personal CRM

Kinfolk es un CRM personal para gestionar contactos, registrar interacciones, organizar seguimientos y consultar actividad desde un dashboard.

Incluye automatizaciones con n8n, notificaciones por Discord, PostgreSQL, Docker y CI/CD con GitHub Actions.

---

## Stack

### Frontend

![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

### Backend

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)
![Pydantic](https://img.shields.io/badge/Pydantic-2-E92063?style=for-the-badge&logo=pydantic&logoColor=white)
![Alembic](https://img.shields.io/badge/Alembic-Migrations-6BA81E?style=for-the-badge)
![psycopg](https://img.shields.io/badge/psycopg-3-336791?style=for-the-badge&logo=postgresql&logoColor=white)

### Infraestructura y automatización

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![n8n](https://img.shields.io/badge/n8n-Automation-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![GHCR](https://img.shields.io/badge/GHCR-Container_Registry-181717?style=for-the-badge&logo=github&logoColor=white)
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

Next.js se encarga de la interfaz y FastAPI de la lógica de negocio, validación y persistencia.

Alembic administra las migraciones de la base de datos.

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

- Docker
- Docker Compose v2+
- Git

Clona el repositorio y entra al proyecto:

```bash
git clone https://github.com/MxguelS/Personal-CRM.git
cd Personal-CRM
```

Crea el archivo de entorno:

```bash
cp .env.example .env
```

Levanta el stack:

```bash
docker compose up --build -d --wait
```

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

> `--volumes` elimina los datos persistentes de PostgreSQL y n8n.

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

Actualmente Kinfolk incluye dos automatizaciones.

### Nuevo contacto en espera

Cuando se crea un contacto con estado `waiting`:

```text
Kinfolk
   ↓
FastAPI
   ↓
n8n
   ↓
Discord
```

La notificación incluye información del contacto y su próximo seguimiento.

### Seguimientos del día

Todos los días a las `08:00` en `America/Panama`, n8n consulta los seguimientos pendientes.

```text
Schedule Trigger
      ↓
FastAPI
      ↓
¿Hay seguimientos?
      ↓ sí
Discord
```

Si no hay seguimientos, no se envía ningún mensaje.

Los workflows exportados no contienen el webhook real de Discord.

---

## CI/CD

GitHub Actions ejecuta automáticamente validaciones en Pull Requests y pushes hacia `main`.

```text
backend ─────┐
frontend ────┼──→ CI aprobado
docker ──────┘
                  ↓
            Construir imágenes
                  ↓
                 GHCR
```

El pipeline valida:

- Tests del backend.
- Ruff.
- Tests del frontend.
- ESLint.
- TypeScript.
- Build de producción.
- Docker Compose.
- Health checks.

Cuando todo pasa correctamente en `main`, se publican las imágenes:

```text
ghcr.io/mxguels/kinfolk-backend
ghcr.io/mxguels/kinfolk-frontend
```

Cada imagen utiliza:

```text
latest
<commit-sha>
```

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