import logging

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.purchases.services import CompraService
from apps.purchases.serializers import (
    CompraSerializer,
    CompraLightSerializer,
    CrearCompraRequestSerializer,
    ActualizarCompraRequestSerializer,
    CancelarCompraRequestSerializer,
    RecibirMercanciaRequestSerializer,
)
from apps.purchases.exceptions import PurchasesException

logger = logging.getLogger(__name__)


class CompraViewSet(ViewSet):
    """
    Endpoints del módulo de compras.

        GET    /purchases/compras/                  → listar (filtros: estado, id_proveedor, id_sucursal, fecha_desde, fecha_hasta)
        POST   /purchases/compras/                  → crear en borrador
        GET    /purchases/compras/{id}/             → detalle completo con líneas
        PATCH  /purchases/compras/{id}/             → actualizar (solo borrador)
        POST   /purchases/compras/{id}/confirmar/   → borrador → activo
        POST   /purchases/compras/{id}/cancelar/    → borrador|activo → cancelada
        POST   /purchases/compras/{id}/recibir/     → registrar recepción de mercancía
    """

    permission_classes = [IsAuthenticated]

    def _service(self, request) -> CompraService:
        return CompraService(
            empresa=request.user.empresa,
            usuario=request.user,
        )

    def _error(self, exc: PurchasesException) -> Response:
        return Response({'error': exc.message}, status=exc.status_code)

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def list(self, request):
        filters = {k: v for k, v in {
            'estado': request.query_params.get('estado'),
            'id_proveedor': request.query_params.get('id_proveedor'),
            'id_sucursal': request.query_params.get('id_sucursal'),
            'fecha_desde': request.query_params.get('fecha_desde'),
            'fecha_hasta': request.query_params.get('fecha_hasta'),
        }.items() if v}

        compras = self._service(request).listar_compras(filters)
        return Response(CompraLightSerializer(compras, many=True).data)

    def create(self, request):
        ser = CrearCompraRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            compra = self._service(request).crear_compra(ser.validated_data)
            return Response(CompraSerializer(compra).data, status=status.HTTP_201_CREATED)
        except PurchasesException as e:
            return self._error(e)

    def retrieve(self, request, pk=None):
        try:
            compra = self._service(request).obtener_compra(int(pk))
            return Response(CompraSerializer(compra).data)
        except PurchasesException as e:
            return self._error(e)

    def partial_update(self, request, pk=None):
        ser = ActualizarCompraRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            compra = self._service(request).actualizar_compra(int(pk), ser.validated_data)
            return Response(CompraSerializer(compra).data)
        except PurchasesException as e:
            return self._error(e)

    # ── Acciones de estado ────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='confirmar')
    def confirmar(self, request, pk=None):
        """POST /purchases/compras/{id}/confirmar/  →  borrador → activo"""
        try:
            compra = self._service(request).confirmar_compra(int(pk))
            return Response(CompraSerializer(compra).data)
        except PurchasesException as e:
            return self._error(e)

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancelar(self, request, pk=None):
        """POST /purchases/compras/{id}/cancelar/  →  publica compra.cancelada"""
        ser = CancelarCompraRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            compra = self._service(request).cancelar_compra(
                int(pk), motivo=ser.validated_data.get('motivo', '')
            )
            return Response(CompraSerializer(compra).data)
        except PurchasesException as e:
            return self._error(e)

    @action(detail=True, methods=['post'], url_path='recibir')
    def recibir(self, request, pk=None):
        """
        POST /purchases/compras/{id}/recibir/

        Registra recepción total o parcial. Dispara compra.recibida.
        inventory crea la entrada de mercancía.
        finance crea la Cuenta Por Pagar.

        Body:
        {
            "items": [
                { "id_detalle": 1, "cantidad_recibida": 50 },
                { "id_detalle": 2, "cantidad_recibida": 20 }
            ]
        }
        """
        ser = RecibirMercanciaRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            compra = self._service(request).recibir_mercancia(
                int(pk), items_recibidos=ser.validated_data['items']
            )
            return Response(CompraSerializer(compra).data)
        except PurchasesException as e:
            return self._error(e)
