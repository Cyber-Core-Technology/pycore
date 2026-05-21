from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.catalogs.views import CategoriaViewSet, UnidadMedidaViewSet, ImpuestoViewSet

router = DefaultRouter()
router.register('categorias', CategoriaViewSet, basename='categorias')
router.register('unidades-medida', UnidadMedidaViewSet, basename='unidades-medida')
router.register('impuestos', ImpuestoViewSet, basename='impuestos')

urlpatterns = [
    path('', include(router.urls)),
]
