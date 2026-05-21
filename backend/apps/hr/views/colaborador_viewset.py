from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.hr.services import ColaboradorService
from apps.hr.serializers import ColaboradorSerializer, ColaboradorWriteSerializer, ColaboradorListSerializer
from apps.hr.exceptions import ColaboradorNotFoundException


class ColaboradorViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_service(self, request):
        return ColaboradorService(
            empresa=request.user.empresa,
            usuario=request.user,
        )

    def list(self, request):
        filters = {k: v for k, v in request.query_params.items()}
        colaboradores = self.get_service(request).listar(filters)
        serializer = ColaboradorListSerializer(colaboradores, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            colaborador = self.get_service(request).obtener(pk)
            return Response(ColaboradorSerializer(colaborador).data)
        except ColaboradorNotFoundException as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        serializer = ColaboradorWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        colaborador = self.get_service(request).crear(serializer.validated_data)
        return Response(
            ColaboradorSerializer(colaborador).data,
            status=status.HTTP_201_CREATED
        )

    def partial_update(self, request, pk=None):
        try:
            serializer = ColaboradorWriteSerializer(data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            colaborador = self.get_service(request).actualizar(pk, serializer.validated_data)
            return Response(ColaboradorSerializer(colaborador).data)
        except ColaboradorNotFoundException as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'], url_path='baja')
    def dar_baja(self, request, pk=None):
        try:
            fecha_baja = request.data.get('fecha_baja')
            colaborador = self.get_service(request).dar_baja(pk, fecha_baja)
            return Response(ColaboradorSerializer(colaborador).data)
        except ColaboradorNotFoundException as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)
