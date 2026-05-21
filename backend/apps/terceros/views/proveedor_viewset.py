from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.terceros.serializers import ProveedorSerializer, ProveedorListSerializer
from apps.terceros.services import ProveedorService

service = ProveedorService()


class ProveedorViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _empresa(self, request):
        return request.user.empresa

    def list(self, request):
        q = request.query_params.get('q')
        if q:
            qs = service.buscar(self._empresa(request), q)
        else:
            qs = service.listar(self._empresa(request))
        return Response(ProveedorListSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        obj = service.obtener(self._empresa(request), pk)
        return Response(ProveedorSerializer(obj).data)

    def create(self, request):
        serializer = ProveedorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = service.crear(self._empresa(request), serializer.validated_data)
        return Response(ProveedorSerializer(obj).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        serializer = ProveedorSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = service.actualizar(self._empresa(request), pk, serializer.validated_data)
        return Response(ProveedorSerializer(obj).data)

    def destroy(self, request, pk=None):
        service.eliminar(self._empresa(request), pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
