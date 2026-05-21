from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.inventory.serializers import InventarioSerializer, AjusteSerializer, EntradaSerializer
from apps.inventory.services import InventarioService, MovimientoService, ProductoService
from apps.core.models.sucursal import Sucursal

inv_service = InventarioService()
mov_service = MovimientoService()
prod_service = ProductoService()


class InventarioViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _empresa(self, request):
        return request.user.empresa

    def list(self, request):
        sucursal_id = request.query_params.get('sucursal')
        empresa = self._empresa(request)
        if sucursal_id:
            try:
                sucursal = Sucursal.objects.get(id_sucursal=sucursal_id, empresa=empresa)
                qs = inv_service.listar_por_sucursal(empresa, sucursal)
            except Sucursal.DoesNotExist:
                return Response({'detail': 'Sucursal no encontrada.'}, status=404)
        else:
            qs = inv_service.listar_por_empresa(empresa)
        return Response(InventarioSerializer(qs, many=True).data)

    @action(detail=False, methods=['get'], url_path='alertas')
    def alertas_stock(self, request):
        items = inv_service.stock_bajo_minimo(self._empresa(request))
        return Response(InventarioSerializer(items, many=True).data)

    @action(detail=False, methods=['post'], url_path='entrada')
    def registrar_entrada(self, request):
        serializer = EntradaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        empresa = self._empresa(request)

        producto = prod_service.obtener(empresa, str(data['producto_id']))
        sucursal = Sucursal.objects.get(id_sucursal=data["sucursal_id"], empresa=empresa)
        variante = None
        if data.get('variante_id'):
            from apps.inventory.models import VarianteProducto
            variante = VarianteProducto.objects.get(id=data['variante_id'], producto=producto)

        movimiento = mov_service.registrar_entrada(
            empresa=empresa,
            sucursal=sucursal,
            producto=producto,
            cantidad=data['cantidad'],
            costo_unitario=data.get('costo_unitario', 0),
            variante=variante,
            tipo_referencia='ajuste',
            motivo=data.get('motivo', ''),
        )
        from apps.inventory.serializers import MovimientoSerializer
        return Response(MovimientoSerializer(movimiento).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='ajuste')
    def registrar_ajuste(self, request):
        serializer = AjusteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        empresa = self._empresa(request)

        producto = prod_service.obtener(empresa, str(data['producto_id']))
        sucursal = Sucursal.objects.get(id_sucursal=data["sucursal_id"], empresa=empresa)
        variante = None
        if data.get('variante_id'):
            from apps.inventory.models import VarianteProducto
            variante = VarianteProducto.objects.get(id=data['variante_id'], producto=producto)

        movimiento = mov_service.registrar_ajuste(
            empresa=empresa,
            sucursal=sucursal,
            producto=producto,
            cantidad_nueva=data['cantidad_nueva'],
            variante=variante,
            motivo=data.get('motivo', 'Ajuste manual'),
        )
        from apps.inventory.serializers import MovimientoSerializer
        return Response(MovimientoSerializer(movimiento).data, status=status.HTTP_201_CREATED)
