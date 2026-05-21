from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.catalogs.serializers import CategoriaSerializer, CategoriaTreeSerializer
from apps.catalogs.services import CategoriaService

service = CategoriaService()


class CategoriaViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _get_empresa(self, request):
        return request.user.empresa

    def list(self, request):
        empresa = self._get_empresa(request)
        todos = request.query_params.get('todos') == '1'
        qs = service.listar(empresa, todos=todos)
        return Response(CategoriaSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        empresa = self._get_empresa(request)
        obj = service.obtener(empresa, pk)
        return Response(CategoriaSerializer(obj).data)

    def create(self, request):
        empresa = self._get_empresa(request)
        serializer = CategoriaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = service.crear(empresa, serializer.validated_data)
        return Response(CategoriaSerializer(obj).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        empresa = self._get_empresa(request)
        serializer = CategoriaSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = service.actualizar(empresa, pk, serializer.validated_data)
        return Response(CategoriaSerializer(obj).data)

    def destroy(self, request, pk=None):
        empresa = self._get_empresa(request)
        service.eliminar(empresa, pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='arbol')
    def arbol(self, request):
        empresa = self._get_empresa(request)
        raices = service.listar_raices(empresa)
        return Response(CategoriaTreeSerializer(raices, many=True).data)
