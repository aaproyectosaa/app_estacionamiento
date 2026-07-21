# Deploy fácil: Neon + Railway (1 servicio)

Base de datos en **Neon**, app completa (frontend + API) en **un solo servicio** de Railway.

```
Usuario → Railway (Express + React build)
              ↓
          Neon PostgreSQL (+ PostGIS)
```

---

## Parte 1 — Neon (5 min)

1. Creá cuenta en [neon.tech](https://neon.tech)
2. **New Project** → elegí región cercana (ej. `aws-us-east-1`)
3. En el proyecto → **SQL Editor** → ejecutá:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

4. **Dashboard → Connection string** → copiá la URL con **pooler** (recomendado para Railway):

```
postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

---

## Parte 2 — Railway (5 min)

1. [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → elegí `app_estacionamiento`
3. Railway detecta `railway.toml` y usa `Dockerfile.railway` automáticamente
4. **Settings** → confirmá:
   - Builder: **Dockerfile**
   - Dockerfile: `Dockerfile.railway`
5. **Variables** (pestaña Variables):

| Variable | Valor |
|----------|--------|
| `DATABASE_URL` | connection string de Neon |
| `JWT_SECRET` | secreto largo aleatorio |
| `NODE_ENV` | `production` |
| `VITE_GOOGLE_MAPS_API_KEY` | key de Google Maps |
| `RUN_SEED` | `true` |
| `RUN_ADMIN` | `true` |

`VITE_GOOGLE_MAPS_API_KEY` debe estar definida **antes del deploy** (se usa en el build del Docker).

6. **Networking → Generate Domain** → ej. `hay-lugar.up.railway.app`
7. Deploy y esperá el build (~3–5 min)

---

## Parte 3 — Verificar

- App: `https://TU-DOMINIO.up.railway.app`
- API: `https://TU-DOMINIO.up.railway.app/api/health`
- Admin: `admin@admin.com` / `admin123`

En Google Cloud, autorizá la Maps API key para `https://TU-DOMINIO.up.railway.app/*`.

---

## Después del primer deploy

Cambiá en Railway (para no resetear datos):

```
RUN_SEED=false
RUN_ADMIN=false
```

---

## Desarrollo local (sigue igual)

```bash
pnpm db:up          # Postgres local en Docker
pnpm db:setup
pnpm dev
```

Neon es solo para producción; local podés seguir con Docker en el puerto 5434.

---

## Problemas frecuentes

| Problema | Solución |
|----------|----------|
| Build falla Maps | `VITE_GOOGLE_MAPS_API_KEY` en variables de Railway |
| DB connection error | Usá URL de Neon con `?sslmode=require` |
| PostGIS error | `CREATE EXTENSION postgis` en SQL Editor de Neon |
| Pantalla en blanco | Revisá logs de deploy; probá `/api/health` |
| Seed borra todo | `RUN_SEED=false` post primer deploy |

---

## ¿Por qué 1 servicio?

- No hay que configurar CORS ni proxy entre frontend y backend
- Un solo dominio
- Un solo deploy
- `/api/*` → Express, resto → React

Si más adelante necesitás escalar, podés separar frontend y backend otra vez.
