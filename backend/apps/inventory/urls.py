from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.inventory.views import ProductoViewSet, InventarioViewSet, MovimientoViewSet, ScanSessionViewSet

router = DefaultRouter()
router.register('productos', ProductoViewSet, basename='productos')
router.register('inventario', InventarioViewSet, basename='inventario')
router.register('movimientos', MovimientoViewSet, basename='movimientos')
router.register('scan-session', ScanSessionViewSet, basename='scan-session')

urlpatterns = [
    path('', include(router.urls)),
]
