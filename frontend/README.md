# Frontend de Kinfolk

Interfaz de Kinfolk desarrollada con **Next.js 16**, React 19, TypeScript, App Router y Tailwind CSS 4.

## Desarrollo local

Todos los comandos se ejecutan desde `frontend/`.

Instalar dependencias:

```bash
npm ci
```

Iniciar el servidor:

```bash
npm run dev
```

La aplicación estará disponible en:

```text
http://localhost:3000
```

El backend debe estar ejecutándose en el puerto `8000`.

Las solicitudes del navegador utilizan rutas relativas `/api` y Next.js las redirige hacia FastAPI.

## Variables de entorno

Por defecto, el frontend utiliza:

```text
API_INTERNAL_URL=http://localhost:8000
```

Para modificarlo localmente puede utilizarse:

```text
frontend/.env.local
```

Dentro de Docker Compose se utiliza:

```text
API_INTERNAL_URL=http://backend:8000
```

## Tests y validaciones

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Funciones principales

- Dashboard con métricas y actividad reciente.
- Gestión de contactos.
- Búsqueda, filtros y paginación.
- Detalle de contactos.
- Historial de interacciones.
- Seguimientos pendientes, vencidos y próximos.
- Formularios y diálogos de confirmación.
- Estados de carga, error y contenido vacío.
- Diseño adaptable a diferentes tamaños de pantalla.

## Docker

El frontend forma parte del stack principal de Kinfolk:

```bash
docker compose up --build -d --wait
```

Next.js escucha internamente en el puerto `3000`.

Las imágenes de producción utilizan el backend interno:

```text
http://backend:8000
```

## Seguridad

Kinfolk actualmente no implementa autenticación.
