from django.urls import path
from apps.auth_module.views import (
    UsuariosEmpresaListCreateView,
    UsuariosEmpresaDetailView,
    UsuarioSucursalesView,
    UsuarioSucursalDeleteView,
)

urlpatterns = [
    path('', UsuariosEmpresaListCreateView.as_view(), name='usuarios-empresa-list'),
    path('<uuid:pk>/', UsuariosEmpresaDetailView.as_view(), name='usuarios-empresa-detail'),
    path('<uuid:pk>/sucursales/', UsuarioSucursalesView.as_view(), name='usuario-sucursales'),
    path('<uuid:pk>/sucursales/<uuid:sucursal_id>/', UsuarioSucursalDeleteView.as_view(), name='usuario-sucursal-delete'),
]
