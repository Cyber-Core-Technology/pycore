from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.catalogs.serializers import UnidadMedidaSerializer
from apps.catalogs.services import UnidadMedidaService

service = UnidadMedidaService()


class UnidadMedidaViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _get_empresa(self, request):
        return request.user.empresa

    def list(self, request):
        todos = request.query_params.get('todos') == '1'
        qs = service.listar(self._get_empresa(request), todos=todos)
        return Response(UnidadMedidaSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        obj = service.obtener(self._get_empresa(request), pk)
        return Response(UnidadMedidaSerializer(obj).data)

    def create(self, request):
        serializer = UnidadMedidaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = service.crear(self._get_empresa(request), serializer.validated_data)
        return Response(UnidadMedidaSerializer(obj).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        serializer = UnidadMedidaSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = service.actualizar(self._get_empresa(request), pk, serializer.validated_data)
        return Response(UnidadMedidaSerializer(obj).data)

    def destroy(self, request, pk=None):
        service.eliminar(self._get_empresa(request), pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
