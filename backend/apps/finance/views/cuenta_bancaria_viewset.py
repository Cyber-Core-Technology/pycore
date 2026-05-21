from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.finance.services import CuentaBancariaService
from apps.finance.serializers import CuentaBancariaSerializer, CrearCuentaBancariaRequestSerializer
from apps.finance.exceptions import FinanceException


class CuentaBancariaViewSet(ViewSet):
    permission_classes = [IsAuthenticated]

    def _service(self, request):
        return CuentaBancariaService(empresa=request.user.empresa, usuario=request.user)

    def list(self, request):
        cuentas = self._service(request).listar()
        return Response(CuentaBancariaSerializer(cuentas, many=True).data)

    def create(self, request):
        ser = CrearCuentaBancariaRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            data = ser.validated_data
            # saldo_inicial = saldo_actual al crear
            data['saldo_actual'] = data.get('saldo_inicial', 0)
            cuenta = self._service(request).crear(data)
            return Response(CuentaBancariaSerializer(cuenta).data, status=status.HTTP_201_CREATED)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)

    def retrieve(self, request, pk=None):
        try:
            cuenta = self._service(request).obtener(int(pk))
            return Response(CuentaBancariaSerializer(cuenta).data)
        except FinanceException as e:
            return Response({'error': e.message}, status=e.status_code)
