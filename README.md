# Hay Lugar

Sistema de estacionamiento medido para ciudades de la provincia de Santa Fe, Argentina.

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | pnpm workspaces |
| Node | 24 |
| Backend | Express 5 + Prisma 6 + PostgreSQL 16 |
| Frontend | React 19 + React Router 7 + Vite 6 + Tailwind CSS 4 |
| Mapas | Leaflet + React-Leaflet |
| Estado | Zustand |
| Contenedores | Docker Compose |

## Estructura

```
/
├── backend/       # API REST (Express + Prisma)
├── frontend/      # App React (Vite)
├── nginx/         # Config para producción
├── legacy/        # Versiones anteriores (solo referencia)
└── docker-compose.yml
```

## Desarrollo

### Requisitos

- Node 24 (`nvm use` si usás nvm)
- pnpm (`corepack enable` o `npm i -g pnpm`)
- Docker + Docker Compose (para la base de datos)

### Levantar con Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3004
- DB: localhost:5434

### Levantar localmente

```bash
# 1. Instalar dependencias
pnpm install

# 2. Levantar PostgreSQL con Docker
docker compose up -d db
# o: pnpm db:up

# 3. Migrar y seedear la base de datos (contra localhost:5434)
pnpm db:setup
# equivalente manual: pnpm db:push && pnpm db:seed && pnpm db:admin && pnpm db:inspectors

# 4. Iniciar dev
pnpm dev
```

## Credenciales de desarrollo

| Rol | Email | Contraseña |
|---|---|---|
| Admin | admin@admin.com | admin123 |
| Inspector | gomez@inspector.com | inspector123 |
| Inspector | lopez@inspector.com | inspector123 |
| Inspector | fernandez@inspector.com | inspector123 |

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Levanta frontend + backend en modo desarrollo |
| `pnpm build` | Build de producción del frontend |
| `pnpm start` | Inicia backend en producción |
| `pnpm db:up` | Levanta solo PostgreSQL (PostGIS) en Docker |
| `pnpm db:setup` | DB + schema + seed demo + admin + inspectores |
| `pnpm db:push` | Sincroniza schema de Prisma con la DB |
| `pnpm db:studio` | Abre Prisma Studio |
| `pnpm db:seed` | Recarga datos demo (host → `localhost:5434`) |
| `pnpm db:seed:docker` | Recarga datos demo dentro del contenedor backend |
| `pnpm db:reset` | Alias de `db:seed` |
| `pnpm db:admin` | Crea usuario admin |
| `pnpm db:inspectors` | Crea usuarios inspectores |

## Variables de entorno

Copiar `.env.example` a `.env` en la raíz y en `backend/`:

```
DATABASE_URL=postgresql://haylugar:haylugar@localhost:5434/haylugar?schema=public
JWT_SECRET=change-me-to-a-long-random-string
NODE_ENV=development
```

## API

### Autenticación
| Ruta | Descripción |
|---|---|
| `POST /api/auth/register` | Registrar usuario |
| `POST /api/auth/login` | Iniciar sesión |
| `POST /api/auth/guest` | Acceso como invitado |
| `PATCH /api/auth/me` | Actualizar perfil |
| `GET /api/me` | Obtener datos del usuario actual (requiere token) |

### Tiempo real
| Ruta | Descripción |
|---|---|
| `GET /api/live` | Stream SSE para actualizaciones en tiempo real |

### Municipios y zonas
| Ruta | Descripción |
|---|---|
| `GET /api/municipios` | Listar municipios |
| `GET /api/zonas/:municipioId` | Disponibilidad por zona |
| `GET /api/zonas/:municipioId?include=plazas` | Disponibilidad con detalle de plazas |
| `GET /api/zonas/:municipioId/plazas` | Listar todas las plazas de un municipio |

### Plazas
| Ruta | Descripción |
|---|---|
| `GET /api/plazas/:id` | Obtener detalle de una plaza |
| `POST /api/plazas/:id/ocupar` | Marcar plaza como ocupada |
| `POST /api/plazas/:id/liberar` | Marcar plaza como libre |
| `POST /api/plazas/:id/measure` | Registrar coordenadas GPS de una plaza (requiere token) |

### Medición de campo (requiere token)
| Ruta | Descripción |
|---|---|
| `GET /api/zonas/:municipioId/measure` | Progreso de medición por zona con detalle de plazas |
| `GET /api/zonas/:municipioId/export?format=json\|csv` | Exportar datos medidos en JSON o CSV |

### Sesiones
| Ruta | Descripción |
|---|---|
| `POST /api/sessions/start` | Iniciar estacionamiento |
| `POST /api/sessions/:id/stop` | Finalizar estacionamiento |
| `GET /api/sessions/active` | Obtener sesiones activas del usuario |
| `GET /api/sessions/history` | Historial de estacionamientos |

### Reportes
| Ruta | Descripción |
|---|---|
| `POST /api/reports` | Reportar auto sin pagar |
| `GET /api/reports` | Historial de reportes del usuario |

### Admin (requiere rol `admin`)
| Ruta | Descripción |
|---|---|
| `GET /api/admin/stats/:municipioId` | Estadísticas |
| `GET /api/admin/reports` | Listar reportes |
| `PATCH /api/admin/reports/:id` | Actualizar reporte |
| `DELETE /api/admin/reports/:id` | Eliminar reporte |
| `GET /api/admin/sessions` | Listar sesiones |
| `DELETE /api/admin/sessions/:id` | Eliminar sesión |
| `GET /api/admin/zonas/:municipioId` | Listar zonas |
| `POST /api/admin/zonas/:municipioId` | Crear zona |
| `PUT /api/admin/zonas/:id` | Actualizar zona |
| `DELETE /api/admin/zonas/:id` | Eliminar zona |
| `GET /api/admin/municipios` | Listar municipios |
| `POST /api/admin/municipios` | Crear municipio |
| `PUT /api/admin/municipios/:id` | Actualizar municipio |
| `DELETE /api/admin/municipios/:id` | Eliminar municipio |
| `GET /api/admin/users` | Listar usuarios |
| `PATCH /api/admin/users/:id/role` | Cambiar rol de usuario |
| `DELETE /api/admin/users/:id` | Eliminar usuario |

### Inspector (requiere rol `inspector`)
| Ruta | Descripción |
|---|---|
| `GET /api/inspector/me` | Datos del inspector |
| `POST /api/inspector/actas` | Emitir acta de infracción |
| `GET /api/inspector/actas` | Historial de actas |
| `GET /api/inspector/stats` | Estadísticas del inspector |
| `GET /api/inspector/verificar/:patente` | Verificar si una patente tiene sesión activa |
