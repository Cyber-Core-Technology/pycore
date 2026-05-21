from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.terceros.views import ClienteViewSet, ProveedorViewSet

router = DefaultRouter()
router.register('clientes', ClienteViewSet, basename='clientes')
router.register('proveedores', ProveedorViewSet, basename='proveedores')

urlpatterns = [
    path('', include(router.urls)),
]
