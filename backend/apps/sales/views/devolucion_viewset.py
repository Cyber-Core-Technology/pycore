import logging
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.sales.services import DevolucionService
from apps.sales.serializers import DevolucionSerializer, CrearDevolucionRequestSerializer
from apps.sales.exceptions import SalesException

logger = logging.getLogger(__name__)


class DevolucionViewSet(ViewSet):
    """
    GET    /sales/devoluciones/                → listar todas
    POST   /sales/ventas/{id_venta}/devolver/  → crear devolución sobre una venta
    GET    /sales/devoluciones/{id}/           → detalle
    """

    permission_classes = [IsAuthenticated]

    def _service(self, request) -> DevolucionService:
        return DevolucionService(
            empresa=request.user.empresa, usuario=request.user
        )

    def _error(self, exc: SalesException) -> Response:
        return Response({'error': exc.message}, status=exc.status_code)

    def list(self, request):
        filters = {k: v for k, v in {
            'fecha_desde': request.query_params.get('fecha_desde'),
            'fecha_hasta': request.query_params.get('fecha_hasta'),
        }.items() if v}
        devs = self._service(request).listar_devoluciones(filters)
        return Response(DevolucionSerializer(devs, many=True).data)

    def retrieve(self, request, pk=None):
        try:
            dev = self._service(request).obtener_devolucion(int(pk))
            return Response(DevolucionSerializer(dev).data)
        except SalesException as e:
            return self._error(e)

    def create_for_venta(self, request, venta_pk=None):
        """POST /sales/ventas/{id_venta}/devolver/"""
        ser = CrearDevolucionRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            dev = self._service(request).crear_devolucion(
                int(venta_pk), ser.validated_data
            )
            return Response(
                DevolucionSerializer(dev).data,
                status=status.HTTP_201_CREATED,
            )
        except SalesException as e:
            return self._error(e)
