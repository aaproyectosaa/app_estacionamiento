# AGENTS.md — Convenciones para agentes de desarrollo

## Comandos

| Comando | Descripción |
|---|---|
| `pnpm install` | Instalar dependencias |
| `pnpm dev` | Levantar frontend + backend en desarrollo |
| `pnpm dev:frontend` | Solo frontend |
| `pnpm dev:backend` | Solo backend |
| `pnpm build` | Build de producción del frontend |
| `pnpm start` | Iniciar backend en producción |
| `pnpm db:up` | Levantar solo PostgreSQL (PostGIS) con Docker |
| `pnpm db:setup` | DB en Docker + schema + seed demo + admin + inspectores |
| `pnpm db:push` | Sincronizar schema Prisma |
| `pnpm db:studio` | Abrir Prisma Studio |
| `pnpm db:seed` | Cargar demo (desde el host, contra `localhost:5434`) |
| `pnpm db:seed:docker` | Cargar demo dentro del contenedor `backend` |
| `pnpm db:reset` | Alias de `db:seed` (reemplaza datos demo) |
| `pnpm db:admin` | Crear usuario admin |
| `pnpm db:inspectors` | Crear usuarios inspectores |
| `pnpm lint` | Ejecutar ESLint |
| `pnpm format` | Ejecutar Prettier |
| `pnpm test` | Ejecutar tests |

## Estilo de código

- **Backend**: ES Modules, sin puntos y coma, comillas simples, sin funciones flecha innecesarias.
- **Frontend**: JSX con componentes funcionales, hooks en camelCase, stores con Zustand.
- **CSS**: Tailwind CSS 4 en el frontend React. CSS vanilla en `legacy/`.
- **Nombres**: camelCase para variables/funciones, PascalCase para componentes, kebab-case para archivos CSS.

## Arquitectura

### Backend (`backend/`)

- Express 5 con Prisma ORM.
- Rutas en `src/routes/`, middleware en `src/middleware/`.
- Prisma accedido via `req.app.locals.prisma`.
- Validación con Zod en `src/middleware/validate.js`.
- Autenticación con JWT en `src/middleware/auth.js`.

### Frontend (`frontend/`)

- React 19 + React Router 7 + Vite 6.
- Estado global con Zustand (auth, parking, notify).
- Mapas con Leaflet + React-Leaflet.
- Estilos con Tailwind CSS 4 + CSS por página en `src/styles/`.

## Base de datos

- **PostgreSQL 16 + PostGIS** en Docker (`postgis/postgis:16-3.4`).
- Contenedor: `docker compose up -d db` → expone **`localhost:5434`**.
- `backend/.env` debe apuntar a Docker:
  `DATABASE_URL=postgresql://haylugar:haylugar@localhost:5434/haylugar?schema=public`
- Schema en `backend/prisma/schema.prisma`.
- Seed demo en `backend/prisma/seed.js` (resetea y recrea municipio, zonas, cuadras medidas con capacidad por fórmula y plazas).
- Usuarios de prueba: `seed-admin.js`, `seed-inspectors.js`.
- Con stack completo (`docker compose up`), el backend corre `db push` + seed al iniciar.

### Flujo típico con Docker

```bash
pnpm db:setup          # levanta DB + schema + demo + usuarios
pnpm dev               # backend local contra localhost:5434
```

Para recargar solo los datos demo:

```bash
pnpm db:seed           # desde el host
# o, si usás docker compose completo:
pnpm db:seed:docker    # dentro del contenedor backend
```

## Legacy

- La carpeta `legacy/` contiene versiones anteriores (HTML estático, JS vanilla).
- No modificar. Solo referencia histórica.
