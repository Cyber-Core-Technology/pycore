from django.urls import path
from apps.storefront.views import (
    StorefrontConfigView,
    StorefrontPreviewView,
    StorefrontBulkVisibilidadView,
    StorefrontBannerUploadView,
    PedidosGestionView,
    PedidoEstadoView,
    ClienteStorefrontDetalleView,
    StorefrontHomeView,
    StorefrontProductosView,
    SlugCheckView,
)

# Rutas autenticadas (ERP management) — prefijo: /api/v1/storefront/
urlpatterns = [
    path('config/',                  StorefrontConfigView.as_view(),         name='storefront-config'),
    path('config/check-slug/',       SlugCheckView.as_view(),                name='storefront-check-slug'),
    path('config/preview/',   StorefrontPreviewView.as_view(),        name='storefront-preview'),
    path('config/banner/',    StorefrontBannerUploadView.as_view(),   name='storefront-banner-upload'),
    path('config/productos/', StorefrontBulkVisibilidadView.as_view(), name='storefront-bulk-visibilidad'),
    path('pedidos/',                              PedidosGestionView.as_view(), name='storefront-pedidos-gestion'),
    path('pedidos/<uuid:pedido_id>/estado/',      PedidoEstadoView.as_view(),   name='storefront-pedido-estado'),
    path('clientes/<uuid:cliente_id>/',           ClienteStorefrontDetalleView.as_view(), name='storefront-cliente-detalle'),
]

# Rutas públicas (sin auth) — prefijo: /api/v1/store/
public_urlpatterns = [
    path('<slug:slug>/',           StorefrontHomeView.as_view(),     name='store-home'),
    path('<slug:slug>/productos/', StorefrontProductosView.as_view(), name='store-productos'),
]
