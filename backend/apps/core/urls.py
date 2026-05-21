from django.urls import path
from apps.core.views import EmpresaViewSet, SucursalViewSet, EmpresaThemeView

empresa_list          = EmpresaViewSet.as_view({'get': 'list',     'post': 'create'})
empresa_detail        = EmpresaViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'})
empresa_configuracion = EmpresaViewSet.as_view({'patch': 'update_configuracion'})

sucursal_list   = SucursalViewSet.as_view({'get': 'list',    'post': 'create'})
sucursal_detail = SucursalViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'})

urlpatterns = [
    path('empresas/',                         empresa_list,          name='empresa-list'),
    path('empresas/<uuid:pk>/',               empresa_detail,        name='empresa-detail'),
    path('empresas/<uuid:pk>/configuracion/', empresa_configuracion, name='empresa-configuracion'),
    path('sucursales/',                       sucursal_list,         name='sucursal-list'),
    path('sucursales/<uuid:pk>/',             sucursal_detail,       name='sucursal-detail'),
    path('tema/',                             EmpresaThemeView.as_view(), name='empresa-tema'),
]
