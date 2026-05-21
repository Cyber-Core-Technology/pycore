import logging
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.sales.services import PromocionService
from apps.sales.serializers import PromocionSerializer, CrearPromocionRequestSerializer
from apps.sales.exceptions import SalesException

logger = logging.getLogger(__name__)


class PromocionViewSet(ViewSet):
    """
    GET    /sales/promociones/              → listar vigentes
    POST   /sales/promociones/              → crear
    GET    /sales/promociones/{id}/         → detalle
    POST   /sales/promociones/{id}/desactivar/ → desactivar
    GET    /sales/promociones/buscar/?codigo=X → buscar por código
    """

    permission_classes = [IsAuthenticated]

    def _service(self, request) -> PromocionService:
        return PromocionService(
            empresa=request.user.empresa, usuario=request.user
        )

    def _error(self, exc: SalesException) -> Response:
        return Response({'error': exc.message}, status=exc.status_code)

    def list(self, request):
        promos = self._service(request).listar_vigentes()
        return Response(PromocionSerializer(promos, many=True).data)

    def create(self, request):
        ser = CrearPromocionRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            promo = self._service(request).crear_promocion(ser.validated_data)
            return Response(PromocionSerializer(promo).data, status=status.HTTP_201_CREATED)
        except SalesException as e:
            return self._error(e)

    def retrieve(self, request, pk=None):
        from apps.sales.repositories import PromocionRepository
        promo = PromocionRepository().get_by_id(int(pk), request.user.empresa)
        if not promo:
            return Response({'error': 'Promoción no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PromocionSerializer(promo).data)

    @action(detail=False, methods=['get'], url_path='buscar')
    def buscar(self, request):
        """GET /sales/promociones/buscar/?codigo=XXXX"""
        codigo = request.query_params.get('codigo')
        if not codigo:
            return Response({'error': 'Parámetro código requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            promo = self._service(request).obtener_por_codigo(codigo)
            return Response(PromocionSerializer(promo).data)
        except SalesException as e:
            return self._error(e)

    @action(detail=True, methods=['post'], url_path='desactivar')
    def desactivar(self, request, pk=None):
        try:
            promo = self._service(request).desactivar_promocion(int(pk))
            return Response(PromocionSerializer(promo).data)
        except SalesException as e:
            return self._error(e)
