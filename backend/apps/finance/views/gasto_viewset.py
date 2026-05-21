from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.finance.services import GastoService
from apps.finance.serializers import GastoSerializer, RegistrarGastoRequestSerializer
from apps.finance.exceptions import FinanceException


class GastoViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    def _service(self, request):
        return GastoService(empresa=request.user.empresa, usuario=request.user)

    def list(self, request):
        filters = {k: v for k, v in {
            'categoria': request.query_params.get('categoria'),
            'fecha_desde': request.query_params.get('fecha_desde'),
            'fecha_hasta': request.query_params.get('fecha_hasta'),
        }.items() if v}
        gastos = self._service(request).listar(filters)
        return Response(GastoSerializer(gastos, many=True).data)

    def create(self, request):
        ser = RegistrarGastoRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            gasto = self._service(request).registrar(ser.validated_data)
            return Response(GastoSerializer(gasto).data, status=status.HTTP_201_CREATED)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)

    def retrieve(self, request, pk=None):
        try:
            gasto = self._service(request).obtener(int(pk))
            return Response(GastoSerializer(gasto).data)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)
