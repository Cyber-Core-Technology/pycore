from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # API v1
    path('api/v1/core/',      include('apps.core.urls')),
    path('api/v1/auth/',      include('apps.auth_module.urls')),
    path('api/v1/usuarios/',  include('apps.auth_module.empresa_urls')),
    path('api/v1/catalogs/',  include('apps.catalogs.urls')),
    path('api/v1/terceros/',  include('apps.terceros.urls')),
    path('api/v1/inventory/', include('apps.inventory.urls')),
    path('api/v1/purchases/', include('apps.purchases.urls')),
    path('api/v1/sales/',     include('apps.sales.urls')),
    path('api/v1/finance/',   include('apps.finance.urls')),
    path('api/v1/hr/',        include('apps.hr.urls')),
    path('api/v1/audit/',     include('apps.audit.urls')),
    path('api/v1/sync/',      include('apps.sync.urls')),
    path('api/v1/tezca/',        include('apps.tezca.urls')),
    path('api/v1/facturacion/', include('apps.facturacion.urls')),
    path('api/v1/notificaciones/', include('apps.notifications.urls')),
    # Storefront — ERP (auth) y público (sin auth)
    path('api/v1/storefront/', include('apps.storefront.urls')),
    path('api/v1/store/',      include('apps.storefront.public_urls')),
    # Billing / Stripe
    path('api/v1/billing/',    include('apps.billing.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
