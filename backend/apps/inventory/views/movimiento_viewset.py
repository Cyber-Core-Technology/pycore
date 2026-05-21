from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.inventory.serializers import MovimientoSerializer
from apps.inventory.repositories import MovimientoRepository

repo = MovimientoRepository()


class MovimientoViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _empresa(self, request):
        return request.user.empresa

    def list(self, request):
        qs = repo.get_by_empresa(self._empresa(request))
        return Response(MovimientoSerializer(qs, many=True).data)
