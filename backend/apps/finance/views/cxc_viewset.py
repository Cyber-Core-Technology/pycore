from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.finance.services import CxCService
from apps.finance.serializers import CxCSerializer
from apps.finance.exceptions import FinanceException


def _tiene_permiso(user, modulo: str, accion: str) -> bool:
    """Returns True if the user has the given modulo+accion via any of their roles."""
    if user.is_superuser or user.is_staff:
        return True
    from apps.auth_module.models import RolPermiso
    return RolPermiso.objects.filter(
        rol__usuario_roles__usuario=user,
        permiso__modulo=modulo,
        permiso__accion=accion,
    ).exists()


class CxCViewSet(ViewSet):
    """
    GET    /finance/cxc/                        → listar          (finanzas.ver)
    GET    /finance/cxc/{id}/                   → detalle         (finanzas.ver)
    POST   /finance/cxc/desde-venta/            → crear desde venta a crédito (finanzas.crear)
    POST   /finance/cxc/{id}/cancelar/          → cancelar        (finanzas.ver)
    GET    /finance/cxc/{id}/pagos/             → pagos de esta CxC (finanzas.ver)
    """
    permission_classes = [IsAuthenticated]

    def _service(self, request):
        return CxCService(empresa=request.user.empresa, usuario=request.user)

    def _require(self, request, modulo: str, accion: str):
        """Returns a 403 Response if the user lacks the permission, else None."""
        if not _tiene_permiso(request.user, modulo, accion):
            return Response(
                {'error': 'No tienes permiso para realizar esta acción.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def list(self, request):
        denied = self._require(request, 'finanzas', 'ver')
        if denied:
            return denied
        filters = {k: v for k, v in {
            'estado': request.query_params.get('estado'),
            'cliente': request.query_params.get('id_cliente'),
            'vencidas': request.query_params.get('vencidas'),
            'fecha_desde': request.query_params.get('fecha_desde'),
            'fecha_hasta': request.query_params.get('fecha_hasta'),
        }.items() if v}
        cxcs = self._service(request).listar(filters)
        return Response(CxCSerializer(cxcs, many=True).data)

    def retrieve(self, request, pk=None):
        denied = self._require(request, 'finanzas', 'ver')
        if denied:
            return denied
        try:
            cxc = self._service(request).obtener(int(pk))
            return Response(CxCSerializer(cxc).data)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)

    @action(detail=False, methods=['post'], url_path='desde-venta')
    def desde_venta(self, request):
        """POST /finance/cxc/desde-venta/ body: {id_venta: N}"""
        import logging
        logger = logging.getLogger(__name__)

        denied = self._require(request, 'finanzas', 'crear')
        if denied:
            return denied

        id_venta = request.data.get('id_venta')
        if not id_venta:
            return Response({'error': 'id_venta requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from apps.sales.models import Venta
            venta = Venta.objects.get(
                id_venta=int(id_venta),
                empresa=request.user.empresa,
            )
            if venta.metodo_pago != 'credito':
                return Response(
                    {'error': 'Solo se puede crear CxC para ventas a crédito.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not venta.cliente:
                return Response(
                    {'error': 'La venta no tiene cliente asociado. Las ventas a crédito requieren un cliente registrado.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cxc = self._service(request).crear_desde_venta(venta)
            return Response(CxCSerializer(cxc).data, status=status.HTTP_201_CREATED)
        except Venta.DoesNotExist:
            return Response({'error': 'Venta no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)
        except Exception as e:
            logger.error(f'[CxCViewSet.desde_venta] Error inesperado: {e}', exc_info=True)
            return Response(
                {'error': f'Error interno al crear la CxC: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancelar(self, request, pk=None):
        denied = self._require(request, 'finanzas', 'ver')
        if denied:
            return denied
        try:
            cxc = self._service(request).cancelar(int(pk))
            return Response(CxCSerializer(cxc).data)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)

    @action(detail=True, methods=['get'], url_path='pagos')
    def pagos(self, request, pk=None):
        denied = self._require(request, 'finanzas', 'ver')
        if denied:
            return denied
        from apps.finance.services import PagoClienteService
        from apps.finance.serializers import PagoClienteSerializer
        pagos = PagoClienteService(
            empresa=request.user.empresa, usuario=request.user
        ).listar_por_cxc(int(pk))
        return Response(PagoClienteSerializer(pagos, many=True).data)
