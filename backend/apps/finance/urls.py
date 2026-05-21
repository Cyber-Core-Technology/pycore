from rest_framework.routers import DefaultRouter
from apps.finance.views import (
    CuentaBancariaViewSet, CxCViewSet, CxPViewSet,
    PagoClienteViewSet, PagoProveedorViewSet, GastoViewSet,
)

router = DefaultRouter()
router.register(r'cuentas-bancarias', CuentaBancariaViewSet, basename='cuentas-bancarias')
router.register(r'cxc', CxCViewSet, basename='cxc')
router.register(r'cxp', CxPViewSet, basename='cxp')
router.register(r'pagos-clientes', PagoClienteViewSet, basename='pagos-clientes')
router.register(r'pagos-proveedores', PagoProveedorViewSet, basename='pagos-proveedores')
router.register(r'gastos', GastoViewSet, basename='gastos')

urlpatterns = router.urls
