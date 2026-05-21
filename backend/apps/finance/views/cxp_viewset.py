from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.finance.services import CxPService
from apps.finance.serializers import CxPSerializer
from apps.finance.exceptions import FinanceException


class CxPViewSet(ViewSet):
    """
    GET    /finance/cxp/                        → listar
    GET    /finance/cxp/{id}/                   → detalle
    POST   /finance/cxp/desde-compra/          → crear desde compra recibida
    POST   /finance/cxp/{id}/cancelar/          → cancelar
    GET    /finance/cxp/{id}/pagos/             → pagos de esta CxP
    """
    permission_classes = [IsAuthenticated]

    def _service(self, request):
        return CxPService(empresa=request.user.empresa, usuario=request.user)

    def list(self, request):
        filters = {k: v for k, v in {
            'estado': request.query_params.get('estado'),
            'proveedor': request.query_params.get('id_proveedor'),
            'vencidas': request.query_params.get('vencidas'),
            'fecha_desde': request.query_params.get('fecha_desde'),
            'fecha_hasta': request.query_params.get('fecha_hasta'),
        }.items() if v}
        cxps = self._service(request).listar(filters)
        return Response(CxPSerializer(cxps, many=True).data)

    def retrieve(self, request, pk=None):
        try:
            cxp = self._service(request).obtener(int(pk))
            return Response(CxPSerializer(cxp).data)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)

    @action(detail=False, methods=['post'], url_path='desde-compra')
    def desde_compra(self, request):
        """POST /finance/cxp/desde-compra/ body: {id_compra: N}"""
        id_compra = request.data.get('id_compra')
        if not id_compra:
            return Response({'error': 'id_compra requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from apps.purchases.models import Compra
            compra = Compra.objects.get(
                id_compra=int(id_compra),
                empresa=request.user.empresa,
            )
            if compra.estado not in ('recibida', 'recibida_parcial'):
                return Response(
                    {'error': 'Solo se puede crear CxP para compras recibidas.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            cxp = self._service(request).crear_desde_compra(compra)
            return Response(CxPSerializer(cxp).data, status=status.HTTP_201_CREATED)
        except Compra.DoesNotExist:
            return Response({'error': 'Compra no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancelar(self, request, pk=None):
        try:
            cxp = self._service(request).cancelar(int(pk))
            return Response(CxPSerializer(cxp).data)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)

    @action(detail=True, methods=['get'], url_path='pagos')
    def pagos(self, request, pk=None):
        from apps.finance.services import PagoProveedorService
        from apps.finance.serializers import PagoProveedorSerializer
        pagos = PagoProveedorService(
            empresa=request.user.empresa, usuario=request.user
        ).listar_por_cxp(int(pk))
        return Response(PagoProveedorSerializer(pagos, many=True).data)
