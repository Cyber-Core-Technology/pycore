from pathlib import Path
from decouple import config

# Base dir apunta a backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('DJANGO_SECRET_KEY')

DEBUG = config('DJANGO_DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='localhost').split(',')

AUTH_USER_MODEL = 'auth_module.Usuario'

# ========================
# APPS
# ========================
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'channels',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'django_celery_beat',
    'django_extensions',
    'storages',
]

LOCAL_APPS = [
    'apps.core',
    'apps.auth_module',
    'apps.catalogs',
    'apps.terceros',
    'apps.inventory',
    'apps.purchases',
    'apps.sales',
    'apps.finance',
    'apps.hr',
    'apps.audit',
    'apps.sync',
    'apps.ws',
    'apps.notifications',
    'apps.storefront',
]

# Variable de entorno para la API de Gemini (Sprint 3)
GEMINI_API_KEY = config('GEMINI_API_KEY', default='')

# ========================
# STRIPE
# ========================
STRIPE_SECRET_KEY      = config('STRIPE_SECRET_KEY',      default='')
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET  = config('STRIPE_WEBHOOK_SECRET',  default='')

# URL base del frontend (para success/cancel URLs en Checkout)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')

# ========================
# WEB PUSH (VAPID)
# ========================
# Generar claves: docker compose exec backend python manage.py generate_vapid_keys
VAPID_PUBLIC_KEY  = config('VAPID_PUBLIC_KEY',  default='')
VAPID_PRIVATE_KEY = config('VAPID_PRIVATE_KEY', default='')
VAPID_EMAIL       = config('VAPID_EMAIL',        default='')

# daphne must appear before django.contrib.staticfiles
INSTALLED_APPS = ['daphne'] + DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ========================
# MIDDLEWARE
# ========================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.core.middleware.tenant_middleware.TenantMiddleware',
    'apps.auth_module.middleware.JWTTenantMiddleware',
    'apps.auth_module.middleware.sucursal_middleware.SucursalMiddleware',
    'apps.audit.middleware.AuditContextMiddleware',
]

ROOT_URLCONF = 'pycore.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'pycore.wsgi.application'
ASGI_APPLICATION = 'pycore.asgi.application'

# ========================
# BASE DE DATOS
# ========================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# ========================
# CACHE — REDIS
# ========================
_REDIS_PASSWORD = config('REDIS_PASSWORD', default='')
_REDIS_AUTH = f':{_REDIS_PASSWORD}@' if _REDIS_PASSWORD else ''

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': f"redis://{_REDIS_AUTH}{config('REDIS_HOST', default='redis')}:{config('REDIS_PORT', default='6379')}/{config('REDIS_DB_CACHE', default='1')}",
    }
}

# ========================
# CELERY
# ========================
CELERY_BROKER_URL = config('CELERY_BROKER_URL')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'America/Mexico_City'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Tareas periódicas base (se sincronizan con la DB al iniciar celery_beat)
from celery.schedules import crontab  # noqa: E402
CELERY_BEAT_SCHEDULE = {
    # Backup diario a las 2:00 AM (hora México)
    'backup-db-daily': {
        'task': 'core.backup_db',
        'schedule': crontab(hour=2, minute=0),
    },
    # Limpieza de logs de auditoría > 15 días — cada día a las 3:00 AM
    'audit-limpiar-logs-diario': {
        'task': 'audit.limpiar_logs_antiguos',
        'schedule': crontab(hour=3, minute=0),
    },
}

# ========================
# DRF
# ========================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
}

# ========================
# JWT
# ========================
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ========================
# GOOGLE OAUTH
# ========================
GOOGLE_OAUTH_CLIENT_ID = config('GOOGLE_OAUTH_CLIENT_ID', default='')

# ========================
# CORS
# ========================
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:3000').split(',')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept', 'accept-encoding', 'authorization', 'content-type',
    'dnt', 'origin', 'user-agent', 'x-csrftoken', 'x-requested-with',
    'x-storefront-token',   # auth del cliente público del storefront
    'x-sucursal-id',        # sucursal activa del usuario
]

# ========================
# PASSWORDS
# ========================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ========================
# INTERNACIONALIZACIÓN
# ========================
LANGUAGE_CODE = 'es-mx'
TIME_ZONE = 'America/Mexico_City'
USE_I18N = True
USE_TZ = True

# ========================
# ARCHIVOS ESTÁTICOS Y MEDIA
# ========================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ========================
# SERPER (Google Images)
# ========================
SERPER_API_KEY = config('SERPER_API_KEY', default='')

# ========================
# AWS S3 / CLOUDFRONT
# ========================
AWS_ACCESS_KEY_ID      = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY  = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_S3_REGION_NAME     = config('AWS_S3_REGION_NAME', default='us-east-1')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='')
AWS_BACKUP_BUCKET_NAME  = config('AWS_BACKUP_BUCKET_NAME', default='pycore-backups-cycotech-563565469089-us-east-2-an')
AWS_CLOUDFRONT_DOMAIN   = config('AWS_CLOUDFRONT_DOMAIN', default='')

if AWS_STORAGE_BUCKET_NAME:
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
        },
        'staticfiles': {
            'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage',
        },
    }
    AWS_S3_CUSTOM_DOMAIN  = AWS_CLOUDFRONT_DOMAIN or f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    AWS_DEFAULT_ACL       = None          # Bucket policy controla acceso, no ACLs por objeto
    AWS_S3_FILE_OVERWRITE = False         # Nunca sobreescribir — genera nombre único si hay colisión
    AWS_S3_OBJECT_PARAMETERS = {'CacheControl': 'max-age=86400'}
    MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ========================
# FACTURACIÓN CFDI
# ========================
# Bucket S3 exclusivo para CFDIs y CSD (separado del bucket de media)
S3_CFDI_BUCKET = config('S3_CFDI_BUCKET', default='')

# Clave Fernet de 32 bytes en base64 URL-safe para cifrar el .key del CSD y su password.
# Generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
CFDI_FERNET_KEY = config('CFDI_FERNET_KEY', default='')

# Email remitente para envío de CFDIs (puede ser diferente al DEFAULT_FROM_EMAIL)
CFDI_EMAIL_FROM = config('CFDI_EMAIL_FROM', default='')

# Credenciales PAC a nivel sistema — una sola cuenta de SW Sapien para todos los tenants.
# Los tenants solo suben su CSD y configuran sus datos fiscales; nunca tocan el PAC.
# Ambiente global: 'sandbox' en development/testing, 'produccion' en producción real.
SW_SAPIEN_USUARIO  = config('SW_SAPIEN_USUARIO',  default='')
SW_SAPIEN_PASSWORD = config('SW_SAPIEN_PASSWORD', default='')
SW_SAPIEN_AMBIENTE = config('SW_SAPIEN_AMBIENTE', default='sandbox')


CSRF_TRUSTED_ORIGINS = [
    o for o in config('DJANGO_CSRF_TRUSTED_ORIGINS', default='').split(',') if o.strip()
]

# ========================
# EMAIL
# ========================
EMAIL_BACKEND  = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST     = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT     = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS  = config('EMAIL_USE_TLS', default=True,  cast=bool)   # STARTTLS — puerto 587
EMAIL_USE_SSL  = config('EMAIL_USE_SSL', default=False, cast=bool)   # SSL/TLS  — puerto 465
EMAIL_TIMEOUT  = config('EMAIL_TIMEOUT', default=10,    cast=int)    # segundos — evita que cuelgue
EMAIL_HOST_USER     = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = config('DEFAULT_FROM_EMAIL', default='PyCore ERP <noreply@pycore.app>')

# ========================
# STOREFRONT
# ========================
# MP_ACCESS_TOKEN/MP_MODE se configuran por negocio en ConfiguracionStorefront
STOREFRONT_BASE_URL = config('STOREFRONT_BASE_URL', default='http://localhost:3000')
# OTP TTL en segundos (10 minutos)
STOREFRONT_OTP_TTL = config('STOREFRONT_OTP_TTL', default=600, cast=int)

# ========================
# CHANNEL LAYERS — WEBSOCKETS (Redis DB4)
# ========================
_REDIS_HOST = config('REDIS_HOST', default='redis')
_REDIS_PORT = config('REDIS_PORT', default='6379')
_REDIS_WS_DB = config('REDIS_DB_WS', default='4')

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [f'redis://{_REDIS_AUTH}{_REDIS_HOST}:{_REDIS_PORT}/{_REDIS_WS_DB}'],
            'capacity': 1500,
            'expiry': 10,
        },
    }
}
