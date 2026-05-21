<div align="center">

# PyCore ERP

### *"El núcleo de tu negocio"*

![Version](https://img.shields.io/badge/versión-1.0.0-0E7C66?style=for-the-badge)
![Django](https://img.shields.io/badge/Django-4.2_LTS-092E20?style=for-the-badge&logo=django)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker)

**ERP multi-tenant para pequeñas y medianas empresas en México.**  
Backend Django REST · Frontend React/TypeScript · Tiempo real con WebSockets · CFDI 4.0 · PWA

</div>

---

## Tabla de contenido

- [PyCore ERP](#pycore-erp)
    - [*"El núcleo de tu negocio"*](#el-núcleo-de-tu-negocio)
  - [Tabla de contenido](#tabla-de-contenido)
  - [Visión general](#visión-general)
    - [Principios de diseño](#principios-de-diseño)
  - [Módulos del sistema](#módulos-del-sistema)
    - [Backend — 17 apps Django](#backend--17-apps-django)
    - [Frontend — 23 módulos React](#frontend--23-módulos-react)
  - [Stack tecnológico](#stack-tecnológico)
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [DevOps](#devops)
  - [Arquitectura](#arquitectura)
    - [Estructura de cada app Django](#estructura-de-cada-app-django)
    - [Flujo de autenticación](#flujo-de-autenticación)
  - [Instalación](#instalación)
    - [Requisitos](#requisitos)
    - [Setup inicial](#setup-inicial)
    - [Producción](#producción)
  - [Comandos de desarrollo](#comandos-de-desarrollo)
    - [Backend](#backend-1)
    - [Frontend](#frontend-1)
  - [Variables de entorno](#variables-de-entorno)
  - [Endpoints de la API](#endpoints-de-la-api)
  - [Tiempo real (WebSockets)](#tiempo-real-websockets)
    - [Grupos de canales por conexión](#grupos-de-canales-por-conexión)
    - [Eventos que disparan actualización en dashboard](#eventos-que-disparan-actualización-en-dashboard)
    - [Uso en frontend](#uso-en-frontend)
  - [Multitenancy](#multitenancy)
  - [CI/CD y sincronización](#cicd-y-sincronización)
    - [Deploy automático](#deploy-automático)
    - [Sincronización con el fork público](#sincronización-con-el-fork-público)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Flujo de trabajo Git](#flujo-de-trabajo-git)
    - [Ramas](#ramas)
    - [Convención de commits](#convención-de-commits)

---

## Visión general

PyCore ERP es una solución integral de gestión empresarial construida con **Clean Architecture** y **Domain-Driven Design**. Nació para cubrir el ciclo operativo completo de una PyME mexicana: desde el inventario y el punto de venta hasta la facturación electrónica (CFDI 4.0), recursos humanos y una tienda en línea embebida por negocio.

### Principios de diseño

| Principio | Implementación |
|-----------|----------------|
| **Multi-tenant nativo** | Un servidor, N empresas aisladas. La empresa se resuelve desde el JWT en cada request |
| **Clean Architecture** | Capas ViewSet → Service → Repository → Model. Los servicios no conocen HTTP |
| **Domain Events** | Cada operación crítica publica un evento en Redis DB3; los consumers reaccionan desacoplados |
| **Tiempo real** | Django Channels + Daphne (ASGI). El dashboard se actualiza sin polling |
| **Seguridad por defecto** | JWT (60 min / 7 días), RBAC granular, auditoría completa, rate limiting en Nginx |
| **PWA** | Service Worker, manifest, banner de instalación y prompt de actualización |
| **Multilenguaje** | 12 idiomas en la interfaz (i18n) |

---

## Módulos del sistema

### Backend — 17 apps Django

| App | Prefijo API | Responsabilidad |
|-----|-------------|-----------------|
| `core` | `/api/v1/core/` | Empresas, sucursales, configuración de negocio, multitenancy |
| `auth_module` | `/api/v1/auth/` `/api/v1/usuarios/` | Usuarios, roles, permisos RBAC, 2FA, sesiones |
| `catalogs` | `/api/v1/catalogs/` | Categorías, unidades de medida, impuestos, marcas |
| `terceros` | `/api/v1/terceros/` | Clientes y proveedores (CRM básico) |
| `inventory` | `/api/v1/inventory/` | Productos, stock por sucursal, movimientos, alertas mínimas |
| `purchases` | `/api/v1/purchases/` | Órdenes de compra, recepciones, devoluciones a proveedor |
| `sales` | `/api/v1/sales/` | POS, ventas, devoluciones, cotizaciones, corte de caja |
| `finance` | `/api/v1/finance/` | CxC, CxP, gastos, cuentas bancarias, flujo de caja |
| `hr` | `/api/v1/hr/` | Colaboradores, asistencias, estructura organizacional |
| `facturacion` | `/api/v1/facturacion/` | CFDI 4.0 (timbrado PAC), cancelaciones, descarga XML/PDF |
| `billing` | `/api/v1/billing/` | Suscripciones SaaS (Stripe), planes, webhooks |
| `storefront` | `/api/v1/storefront/` | Tienda en línea pública por empresa, pedidos, clientes |
| `tezca` | `/api/v1/tezca/` | Gamificación: insignias y logros por actividad |
| `audit` | — | Auditoría automática de todas las operaciones (middleware) |
| `notifications` | — | Notificaciones internas y push (Web Push API) |
| `sync` | `/api/v1/sync/` | Sincronización offline/online para el POS |
| `ws` | `/ws/` | Consumers WebSocket por empresa/usuario/sucursal |

### Frontend — 23 módulos React

```
dashboard       → KPIs en tiempo real, gráficas, alertas
auth            → Login, registro, recuperación, 2FA
inventory       → Productos, stock, movimientos, scanner QR/código de barras
sales           → POS touch-friendly, historial de ventas, devoluciones
purchases       → Órdenes de compra, recepciones
clientes        → Directorio de clientes, historial de compras
proveedores     → Directorio de proveedores, historial de compras
finance         → Tesorería, cuentas bancarias
cxc             → Cuentas por cobrar, pagos recibidos
cxp             → Cuentas por pagar, pagos emitidos
gastos          → Registro y categorización de gastos
facturacion     → Emisión CFDI 4.0, descarga, cancelación
hr / rrhh       → Colaboradores y asistencias
storefront      → Administración de la tienda pública
tezca           → Panel de insignias y gamificación
reportes        → Reportes por módulo (ventas, inventario, finanzas)
superadmin      → Panel multi-empresa para administración de la plataforma
configuracion   → Ajustes de empresa, sucursales, usuarios, billing
auditoria       → Bitácora de operaciones en tiempo real
billing         → Gestión de suscripción y plan activo
```

---

## Stack tecnológico

### Backend

| Tecnología | Versión | Rol |
|------------|---------|-----|
| Python | 3.11 | Lenguaje |
| Django | 4.2 LTS | Framework web |
| Django REST Framework | 3.14 | API REST |
| Django Channels | 4 | WebSockets (ASGI) |
| Daphne | — | Servidor ASGI |
| Celery | 5 | Tareas asíncronas y programadas |
| SimpleJWT | — | Autenticación JWT |
| PostgreSQL | 16 | Base de datos principal |
| Redis | 7 | Caché · Celery broker · Domain events · WS channels |
| Nginx | 1.25 | Reverse proxy · SSL · Rate limiting |

**Redis databases:**

| DB | Uso |
|----|-----|
| 1 | Django cache |
| 2 | Celery broker / results |
| 3 | Domain events |
| 4 | Django Channels (WebSockets) |

### Frontend

| Tecnología | Versión | Rol |
|------------|---------|-----|
| React | 18 | UI library |
| TypeScript | 5 | Tipado estático |
| Vite | 5 | Build tool y dev server |
| TailwindCSS | — | Estilos utilitarios |
| Zustand | 4.5 | Estado global (auth, sucursal activa) |
| TanStack Query | 5 | Server state, caché y sincronización |
| Axios | — | HTTP client con interceptores JWT y refresh automático |
| React Router | 6 | Navegación SPA con rutas protegidas |
| Recharts | — | Gráficas del dashboard |
| React Hook Form + Zod | — | Formularios y validación |

### DevOps

| Tecnología | Rol |
|------------|-----|
| Docker + Docker Compose | Contenedores y orquestación |
| GitHub Actions | CI/CD automático (deploy + sync fork público) |
| Let's Encrypt | Certificados SSL |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                       │
│              React SPA  ·  PWA  ·  Storefront público       │
└────────────────────────────┬────────────────────────────────┘
                             │  HTTPS / WSS
┌────────────────────────────▼────────────────────────────────┐
│                   Nginx (reverse proxy)                     │
│           Rate limiting  ·  SSL/TLS  ·  Static files        │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│               SECURITY & TENANCY MIDDLEWARE                 │
│    TenantMiddleware → JWTTenantMiddleware → SucursalMiddleware │
│    AuditMiddleware → SubscriptionBlockMiddleware            │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│              APPLICATION LAYER  (Django / DRF)              │
│   ViewSets  →  Services  →  Repositories  →  Models        │
│                                                             │
│  REST endpoints  ·  ASGI WebSocket consumers  ·  Celery tasks│
└──────────┬─────────────────┬──────────────────┬────────────┘
           │                 │                  │
     ┌─────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
     │ PostgreSQL │   │    Redis     │   │   Celery    │
     │  (datos)   │   │ (4 DBs)     │   │  (workers)  │
     └────────────┘   └─────────────┘   └─────────────┘
```

### Estructura de cada app Django

```
apps/<dominio>/
├── models/         # ORM models
├── views/          # DRF ViewSets / APIViews
├── serializers/    # DRF serializers
├── services/       # Lógica de negocio
├── repositories/   # Acceso a datos
├── permissions/    # Clases de permisos custom
├── events/         # Domain events → Redis DB3
└── urls.py
```

### Flujo de autenticación

```
Request con Bearer <JWT>
  → TenantMiddleware      resuelve Empresa activa desde el token
  → JWTTenantMiddleware   valida firma y expiración
  → SucursalMiddleware    inyecta sucursal activa en request
  → AuditMiddleware       registra contexto para la bitácora
  → ViewSet               ejecuta la operación
```

---

## Instalación

### Requisitos

- Docker 24+
- Docker Compose v2+
- Git 2.x+

### Setup inicial

```bash
# 1. Clonar
git clone git@github.com:ScorpionCallejas/pycore-erp.git
cd pycore-erp

# 2. Variables de entorno
cp .env.example .env
# Editar .env con los valores reales

# 3. Levantar (desarrollo)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

# 4. Migraciones y datos iniciales
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py seed        # carga datos demo
```

### Producción

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
docker compose exec backend python manage.py migrate --no-input
docker compose exec backend python manage.py collectstatic --no-input
```

---

## Comandos de desarrollo

### Backend

```bash
cd backend

# Servidor local
python manage.py runserver 0.0.0.0:8000

# Tests con cobertura
pytest
pytest apps/sales/tests/          # tests de un módulo

# Celery
celery -A pycore worker --loglevel=info
celery -A pycore beat   --loglevel=info
```

### Frontend

```bash
cd frontend

npm run dev      # Vite dev server → localhost:3000
npm run build
npm run lint
```

---

## Variables de entorno

Copia `.env.example` a `.env`. Variables críticas:

| Variable | Descripción |
|----------|-------------|
| `DJANGO_SECRET_KEY` | Clave secreta de Django |
| `DJANGO_SETTINGS_MODULE` | `pycore.settings.development` / `production` |
| `DB_*` | Conexión PostgreSQL |
| `REDIS_HOST`, `REDIS_PORT` | Conexión Redis |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | Duración del access token (default 60) |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Duración del refresh token (default 7) |
| `CORS_ALLOWED_ORIGINS` | Orígenes permitidos |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing SaaS |
| `SW_SAPIEN_USUARIO`, `SW_SAPIEN_PASSWORD` | PAC para timbrado CFDI |
| `GEMINI_API_KEY` | Integraciones IA |
| `GOOGLE_OAUTH_CLIENT_ID` | Login social en storefront |
| `VITE_API_URL` | URL del backend (frontend) |

---

## Endpoints de la API

Todos bajo `/api/v1/`. Autenticación: `Authorization: Bearer <access_token>`.

```bash
# Login
POST /api/v1/auth/login/
{ "email": "usuario@empresa.com", "password": "..." }

# Respuesta
{
  "access":  "eyJ...",
  "refresh": "eyJ...",
  "user": { "id": "uuid", "email": "...", "empresa_id": 1 }
}

# Refresh
POST /api/v1/auth/token/refresh/
{ "refresh": "eyJ..." }
```

Documentación interactiva disponible en `/api/v1/schema/` (desarrollo).

---

## Tiempo real (WebSockets)

El servidor ASGI (Daphne) expone `/ws/empresa/` para actualizaciones en tiempo real.

### Grupos de canales por conexión

| Grupo | Quién lo recibe |
|-------|-----------------|
| `empresa_<id>` | Todos los usuarios de la empresa |
| `usuario_<id>` | Mensajes dirigidos a un usuario específico |
| `sucursal_<id>` | Eventos de una sucursal (stock, ventas) |
| `superadmin_global` | Staff: recibe eventos de todas las empresas |

### Eventos que disparan actualización en dashboard

`venta` · `stock` · `compra` · `pago`

### Uso en frontend

```typescript
// Suscribirse a un evento
useWsEvent('stock', (payload) => {
  queryClient.invalidateQueries(['inventory'])
})
```

---

## Multitenancy

`TenantMiddleware` y `JWTTenantMiddleware` resuelven la `Empresa` activa a partir del JWT en cada request. Todos los querysets deben filtrar por empresa — es la fuente más común de bugs de fuga de datos.

```python
# Patrón correcto en repositories
def get_all(self, empresa_id: int):
    return Producto.objects.filter(empresa_id=empresa_id)
```

El usuario modelo es `apps.auth_module.Usuario` (no el `User` de Django).

---

## CI/CD y sincronización

### Deploy automático

Cada push a `main` lanza `.github/workflows/deploy.yml`:

```
push a main
  → SSH al servidor
  → git pull origin main
  → docker compose down + up --build (producción)
  → migrate + collectstatic
```

**Secrets requeridos:**

| Secret | Descripción |
|--------|-------------|
| `SSH_PRIVATE_KEY` | Llave privada SSH del servidor |
| `SSH_HOST` | IP del servidor |
| `SSH_USER` | Usuario SSH |
| `SSH_PORT` | Puerto SSH |

### Sincronización con el fork público

El workflow `.github/workflows/sync-public.yml` mantiene un fork público sanitizado actualizado automáticamente. En cada push a `main`, el script `scripts/sync-to-public.sh`:

1. Lee `.sync-state` del fork público para saber el último commit sincronizado
2. Por cada commit nuevo genera un diff excluyendo los módulos sensibles (`billing`, `facturacion`, `tezca`)
3. Aplica el diff en el fork público y crea un commit preservando la autoría original
4. Actualiza `.sync-state` y hace push

Para omitir un commit en el fork público, incluye `[skip-sync]` en el mensaje de commit.

**Secrets adicionales requeridos:**

| Secret | Descripción |
|--------|-------------|
| `PUBLIC_FORK_PAT` | Personal Access Token con `Contents: read+write` sobre el fork |
| `PUBLIC_FORK_REPO` | `usuario/nombre-repo-publico` |

---

## Estructura del proyecto

```
pycore-erp/
│
├── backend/
│   ├── apps/                        # 17 apps de dominio
│   │   ├── core/                    # Multitenancy, empresas, sucursales
│   │   ├── auth_module/             # Usuarios, roles, permisos, 2FA
│   │   ├── catalogs/                # Catálogos base
│   │   ├── terceros/                # Clientes y proveedores
│   │   ├── inventory/               # Inventario y stock
│   │   ├── purchases/               # Compras
│   │   ├── sales/                   # Ventas y POS
│   │   ├── finance/                 # CxC, CxP, tesorería
│   │   ├── hr/                      # Recursos humanos
│   │   ├── facturacion/             # CFDI 4.0 (PAC: Facturama / SW Sapien)
│   │   ├── billing/                 # Suscripciones SaaS (Stripe)
│   │   ├── storefront/              # Tienda pública por empresa
│   │   ├── tezca/                   # Gamificación e insignias
│   │   ├── audit/                   # Auditoría automática
│   │   ├── notifications/           # Notificaciones y Web Push
│   │   ├── sync/                    # Sincronización offline POS
│   │   └── ws/                      # Consumers WebSocket
│   │
│   ├── pycore/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   ├── production.py
│   │   │   └── testing.py
│   │   ├── urls.py
│   │   └── celery.py
│   │
│   ├── shared/                      # Middleware, permisos y utilidades compartidas
│   ├── requirements/
│   └── Dockerfile
│
├── frontend/
│   └── src/
│       ├── api/                     # 24 clientes Axios (uno por dominio)
│       ├── features/                # 23 módulos de funcionalidad
│       ├── hooks/                   # Custom hooks (useInventory, useSales, etc.)
│       ├── store/                   # Zustand (authStore con persistencia JWT)
│       ├── router/                  # React Router v6 (ProtectedRoute, SuperAdminRoute)
│       ├── types/                   # Interfaces TypeScript por dominio
│       └── components/              # UI compartida (common/, forms/, layout/)
│
├── nginx/
│   └── conf.d/
│       ├── pycore.conf              # Desarrollo
│       └── pycore.prod.conf         # Producción
│
├── scripts/
│   └── sync-to-public.sh           # Script de sincronización del fork público
│
├── .github/
│   └── workflows/
│       ├── deploy.yml               # CI/CD — deploy automático a producción
│       └── sync-public.yml          # Sincronización al fork público sanitizado
│
├── docker-compose.yml               # Servicios base
├── docker-compose.dev.yml           # Overrides de desarrollo
├── docker-compose.prod.yml          # Overrides de producción
├── .env.example
└── README.md
```

---

## Flujo de trabajo Git

### Ramas

| Rama | Propósito |
|------|-----------|
| `main` | Producción — cada push dispara deploy automático |
| `develop` | Integración — rama de trabajo diario |
| `feature/*` | Funcionalidades nuevas |
| `fix/*` | Corrección de bugs |

### Convención de commits

```
feat:      nueva funcionalidad
fix:       corrección de bug
refactor:  refactorización sin cambio de comportamiento
docs:      cambios en documentación
test:      agregar o corregir tests
ci:        cambios en workflows de CI/CD
chore:     mantenimiento general
```

Agrega `[skip-sync]` al mensaje para que el commit no se propague al fork público.

---

<div align="center">
  <sub>Construido en México 🇲🇽 · © 2026 Cyber Core Technology</sub>
</div>
