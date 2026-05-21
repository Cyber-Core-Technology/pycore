# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PyCore ERP is a multi-tenant ERP system with a Django REST API backend and React/TypeScript frontend, deployed via Docker Compose.

## Development Commands

### Docker (Recommended)
```bash
# Start dev environment (hot reload + debug tools)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

# Start prod environment
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# One-time setup
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py seed        # Load demo data
```

### Backend (local)
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
python manage.py migrate
pytest                                                   # Run all tests with coverage
pytest apps/sales/tests/                                 # Run single app's tests
celery -A pycore worker --loglevel=info
celery -A pycore beat --loglevel=info
```

### Frontend (local)
```bash
cd frontend
npm run dev      # Vite dev server → localhost:3000
npm run build
npm run lint
```

## Architecture

### Stack
- **Backend**: Django 4.2 LTS + DRF 3.14, PostgreSQL 16, Redis 7, Django Channels 4 (WebSockets), Celery 5
- **Frontend**: React 18, TypeScript 5, Vite 5, Zustand 4.5, React Query (TanStack) 5, Axios, TailwindCSS, Recharts
- **Auth**: JWT via SimpleJWT (60-min access, 7-day refresh)
- **Deployment**: Docker Compose + GitHub Actions → SSH deploy to server

### Backend App Structure

All business logic lives in `backend/apps/`. Each app follows a layered pattern:
```
apps/<domain>/
├── models/         # ORM models
├── views/          # DRF ViewSets/APIViews
├── serializers/    # DRF serializers
├── services/       # Business logic (use these, not views directly)
├── repositories/   # Data access layer
├── permissions/    # Custom permission classes
├── events/         # Domain events (published to Redis DB3)
└── urls.py
```

**The 14 apps and their API prefixes:**
| App | Prefix |
|-----|--------|
| `core` | `/api/v1/core/` |
| `auth_module` | `/api/v1/auth/`, `/api/v1/usuarios/` |
| `catalogs` | `/api/v1/catalogs/` |
| `terceros` | `/api/v1/terceros/` |
| `inventory` | `/api/v1/inventory/` |
| `purchases` | `/api/v1/purchases/` |
| `sales` | `/api/v1/sales/` |
| `finance` | `/api/v1/finance/` |
| `hr` | `/api/v1/hr/` |
| `tezca` | `/api/v1/tezca/` |
| `facturacion` | `/api/v1/facturacion/` |
| `sync` | `/api/v1/sync/` |

### Settings Structure

`backend/pycore/settings/`:
- `base.py` — shared config (DB, Redis, JWT, DRF defaults, Channels, CORS)
- `development.py` — DEBUG=True
- `production.py` — hardened, Sentry integration
- `testing.py` — for pytest (set via `DJANGO_SETTINGS_MODULE`)

**Redis databases:**
- DB 1: Django cache
- DB 2: Celery broker/results
- DB 3: Domain events
- DB 4: WebSocket channels (Django Channels)

### Frontend Structure

```
frontend/src/
├── api/            # 15 Axios-based API clients (one per domain)
├── features/       # 17 feature modules, each with List/Detail/Form/Modal components
├── hooks/          # 17 custom hooks (useInventory, useSales, usePermissions, etc.)
├── store/          # Zustand stores (authStore with localStorage persistence)
├── router/         # React Router v6 (ProtectedRoute, SuperAdminRoute)
├── types/          # TypeScript interfaces per domain
└── components/     # Shared UI components (common/, forms/, layout/)
```

**API layer** (`frontend/src/api/axios-config.ts`):
- Base URL from `VITE_API_URL` env var
- Request interceptor: injects JWT from `localStorage` (`pycore_access`)
- Response interceptor: auto-refresh on 401, queues failed requests

**Auth state** (`frontend/src/store/authStore.ts`):
- Zustand with `persist` middleware
- Keys: `pycore_access`, `pycore_refresh`, `pycore_auth`
- Holds: `usuario`, `sucursalActiva`, `isAuthenticated`

### Multitenancy

`TenantMiddleware` and `JWTTenantMiddleware` (in `shared/`) resolve the active `Empresa` (company) from the JWT token. All querysets must scope to the current tenant — this is the most common source of data-leak bugs.

### Real-time (WebSockets)

- Django Channels + Daphne ASGI handles `/ws/` connections
- `EmpresaConsumer` broadcasts events per empresa
- Frontend: `wsClient` singleton + `useWsConnection()` / `useWsEvent()` hooks
- Dashboard auto-refreshes on `venta`, `stock`, `compra`, `pago` events

### Permissions

- Backend: Role-based via `apps.auth_module` with custom DRF permission classes
- Frontend: `usePermissions()` hook + `<ModuleGuard>` component gates feature access by module

## Key Conventions

- **Timezone**: `America/Mexico_City` — always use timezone-aware datetimes; use local browser date formatting on the frontend to avoid UTC drift
- **API versioning**: All endpoints under `/api/v1/`
- **Commit style**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **Branch strategy**: `main` → prod (auto-deploy), `develop` → integration, `feature/*` for new work
- **Custom user model**: `apps.auth_module.Usuario` (not Django's default User)
- **Pagination**: 20 items per page default (DRF standard pagination)
- **Foreign keys**: Use Django standard `ForeignKey` with `SET_NULL`; raw UUID fields have been homologated away

## Environment Variables

Copy `.env.example` to `.env`. Critical variables:
- `DJANGO_SECRET_KEY`, `DJANGO_SETTINGS_MODULE`
- `DB_*` (PostgreSQL connection)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB_*`
- `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`, `JWT_REFRESH_TOKEN_LIFETIME_DAYS`
- `CORS_ALLOWED_ORIGINS`
- `VITE_API_URL` (frontend, in `frontend/.env`)
