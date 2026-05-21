from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.finance.services import PagoClienteService
from apps.finance.serializers import PagoClienteSerializer, RegistrarPagoClienteRequestSerializer
from apps.finance.exceptions import FinanceException


class PagoClienteViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    def _service(self, request):
        return PagoClienteService(empresa=request.user.empresa, usuario=request.user)

    def list(self, request):
        filters = {k: v for k, v in {
            'fecha_desde': request.query_params.get('fecha_desde'),
            'fecha_hasta': request.query_params.get('fecha_hasta'),
        }.items() if v}
        pagos = self._service(request).listar(filters)
        return Response(PagoClienteSerializer(pagos, many=True).data)

    def create(self, request):
        ser = RegistrarPagoClienteRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            pago = self._service(request).registrar_pago(ser.validated_data)
            return Response(PagoClienteSerializer(pago).data, status=status.HTTP_201_CREATED)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)
