# PyCore ERP — Comandos de Referencia

## Entornos

| Variable | Dev | Prod |
|---|---|---|
| Frontend | `http://localhost:8081` | Puerto 80 del servidor |
| Backend / API | `http://localhost:8082` | Puerto 8082 del servidor |
| pgAdmin | `http://localhost:5050` | Solo en dev |
| Flower (Celery) | `http://localhost:5555` | Solo en dev |

---

## Docker — Desarrollo

```bash
# Levantar todo (hot reload, pgAdmin, Flower)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d

# Levantar sin rebuild
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Bajar todo
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Bajar y borrar volúmenes (¡resetea la DB!)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

## Docker — Producción

```bash
# Levantar prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# Bajar prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans

# Deploy manual completo (igual que CI/CD)
docker compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T backend python manage.py migrate --no-input
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T backend python manage.py collectstatic --no-input
```

---

## Setup Inicial

```bash
# Migraciones
docker compose exec backend python manage.py migrate

# Superusuario
docker compose exec backend python manage.py createsuperuser

# Datos de demo (30 productos, 60 ventas, empresa, etc.)
docker compose exec backend python manage.py seed

# Archivos estáticos
docker compose exec backend python manage.py collectstatic --no-input
```

---

## Logs

```bash
# Todos los servicios (streaming)
docker compose logs -f

# Por servicio
docker compose logs -f backend
docker compose logs -f celery_worker
docker compose logs -f celery_beat
docker compose logs -f nginx
docker compose logs -f postgres
docker compose logs -f redis

# Últimas N líneas
docker compose logs --tail=100 backend

# En producción (mismo patrón, agrega los archivos prod)
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
```

---

## Estado de Contenedores

```bash
# Ver estado y health checks
docker compose ps

# Estadísticas en tiempo real (CPU, memoria, red)
docker stats

# Inspeccionar un contenedor
docker compose exec backend sh
docker compose exec postgres sh
docker compose exec redis sh
```

---

## Base de Datos (PostgreSQL)

```bash
# Consola psql
docker compose exec postgres psql -U ${DB_USER} -d ${DB_NAME}

# Backup
docker compose exec postgres pg_dump -U ${DB_USER} ${DB_NAME} > backup_$(date +%Y%m%d_%H%M).sql

# Restaurar backup
docker compose exec -T postgres psql -U ${DB_USER} -d ${DB_NAME} < backup.sql

# Shell Django con acceso ORM
docker compose exec backend python manage.py shell

# Migraciones
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py showmigrations

# Revertir migración a estado anterior
docker compose exec backend python manage.py migrate <app> <migration_number>
```

---

## Redis

```bash
# CLI Redis
docker compose exec redis redis-cli

# Monitorear comandos en tiempo real
docker compose exec redis redis-cli monitor

# Ver todas las claves
docker compose exec redis redis-cli keys "*"

# Limpiar caché (DB 1)
docker compose exec redis redis-cli -n 1 flushdb

# Limpiar eventos (DB 3)
docker compose exec redis redis-cli -n 3 flushdb

# Ver tareas Celery pendientes (DB 2)
docker compose exec redis redis-cli -n 2 keys "*"
```

---

## Celery

```bash
# Ver workers activos
docker compose exec celery_worker celery -A pycore inspect active

# Ver tareas registradas
docker compose exec celery_worker celery -A pycore inspect registered

# Ver tareas pendientes en la cola
docker compose exec celery_worker celery -A pycore inspect reserved

# Limpiar cola de tareas
docker compose exec celery_worker celery -A pycore purge

# Flower UI (dev): http://localhost:5555
```

---

## Tests (Backend)

```bash
# Todos los tests con coverage
docker compose exec backend pytest

# App específica
docker compose exec backend pytest apps/sales/tests/
docker compose exec backend pytest apps/inventory/tests/

# Test específico
docker compose exec backend pytest apps/sales/tests/test_venta_service.py::TestVentaService::test_crear_venta

# Con output detallado
docker compose exec backend pytest -v

# Solo los que fallaron en la última corrida
docker compose exec backend pytest --lf

# Sin captura de stdout (útil para debugging)
docker compose exec backend pytest -s

# Local (sin Docker)
cd backend && pytest
```

---

## Frontend

```bash
# Dev local (sin Docker)
cd frontend
npm run dev        # Vite → localhost:3000
npm run build      # Build de producción
npm run lint       # ESLint
npm run preview    # Preview del build prod

# Dentro del contenedor
docker compose exec frontend npm run lint
```

---

## Django Management

```bash
# Verificar configuración
docker compose exec backend python manage.py check
docker compose exec backend python manage.py check --deploy   # Checklist de producción

# Variables de entorno cargadas
docker compose exec backend python manage.py shell -c "from django.conf import settings; print(settings.DATABASES)"

# Limpiar sesiones expiradas
docker compose exec backend python manage.py clearsessions

# Ver URLs registradas
docker compose exec backend python manage.py show_urls
```

---

## CI/CD

El deploy a producción es automático al hacer push a `main`:

```
git push origin main   →   GitHub Actions → SSH → servidor → docker compose prod up
```

El workflow está en [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

**Secrets requeridos en GitHub:**
- `SSH_PRIVATE_KEY`
- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`

---

## Troubleshooting Rápido

```bash
# Contenedor no levanta — ver error
docker compose logs --tail=50 <servicio>

# Backend no conecta a DB — verificar health
docker compose ps postgres

# WebSocket no conecta — verificar Daphne (prod) / runserver (dev)
docker compose logs --tail=30 backend | grep -i "daphne\|websocket\|ws"

# Celery no procesa tareas
docker compose restart celery_worker
docker compose logs -f celery_worker

# Limpiar imágenes huérfanas
docker system prune -f

# Rebuild de un solo servicio
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build -d backend
```

## Cargar información demo de los productos
docker compose exec backend python manage.py seed_storefront_detalle

## Facturación CFDI
# 1. Aplica las migraciones de facturación
docker compose exec backend python manage.py migrate

# 2. Carga los catálogos SAT (regímenes, uso CFDI, formas de pago, etc.)
docker compose exec backend python manage.py sync_catalogos_sat

# 3. Reinicia el backend para que tome las nuevas variables
docker compose restart backend
