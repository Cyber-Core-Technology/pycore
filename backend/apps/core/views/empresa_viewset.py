from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from apps.core.services import EmpresaService, OnboardingService
from apps.core.serializers import EmpresaSerializer, EmpresaCreateSerializer, ConfiguracionSerializer
from apps.core.exceptions import EmpresaAlreadyExistsException


class EmpresaViewSet(ViewSet):

    def list(self, request):
        """GET /api/v1/core/empresas/"""
        empresas = EmpresaService.listar()
        serializer = EmpresaSerializer(empresas, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """GET /api/v1/core/empresas/{id}/"""
        empresa = EmpresaService.obtener(pk)
        if not empresa:
            return Response({'error': 'Empresa no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = EmpresaSerializer(empresa)
        return Response(serializer.data)

    def create(self, request):
        """POST /api/v1/core/empresas/"""
        serializer = EmpresaCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            empresa = OnboardingService.registrar_empresa(serializer.validated_data)
            return Response(EmpresaSerializer(empresa).data, status=status.HTTP_201_CREATED)
        except EmpresaAlreadyExistsException as e:
            return Response({'error': str(e)}, status=status.HTTP_409_CONFLICT)

    def partial_update(self, request, pk=None):
        """PATCH /api/v1/core/empresas/{id}/"""
        empresa = EmpresaService.actualizar(pk, request.data)
        if not empresa:
            return Response({'error': 'Empresa no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(EmpresaSerializer(empresa).data)

    def destroy(self, request, pk=None):
        """DELETE /api/v1/core/empresas/{id}/"""
        eliminado = EmpresaService.eliminar(pk)
        if not eliminado:
            return Response({'error': 'Empresa no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def update_configuracion(self, request, pk=None):
        """PATCH /api/v1/core/empresas/{id}/configuracion/"""
        empresa = EmpresaService.obtener(pk)
        if not empresa:
            return Response({'error': 'Empresa no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            conf = empresa.configuracion
        except Exception:
            return Response({'error': 'Configuración no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ConfiguracionSerializer(conf, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)
