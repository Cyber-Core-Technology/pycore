from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.sales.views import VentaViewSet, DevolucionViewSet, PromocionViewSet

router = DefaultRouter()
router.register(r'ventas', VentaViewSet, basename='ventas')
router.register(r'devoluciones', DevolucionViewSet, basename='devoluciones')
router.register(r'promociones', PromocionViewSet, basename='promociones')

# Ruta anidada para crear devolución desde una venta
urlpatterns = router.urls + [
    path(
        'ventas/<int:venta_pk>/devolver/',
        DevolucionViewSet.as_view({'post': 'create_for_venta'}),
        name='venta-devolver',
    ),
]
