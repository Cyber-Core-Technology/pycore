from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.hr.services import AsistenciaService
from apps.hr.serializers import AsistenciaSerializer, AsistenciaListSerializer
from apps.hr.exceptions import AsistenciaNotFoundException, ColaboradorNotFoundException


class AsistenciaViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_service(self, request):
        return AsistenciaService(
            empresa=request.user.empresa,
            usuario=request.user,
        )

    def list(self, request):
        filters = {k: v for k, v in request.query_params.items()}
        asistencias = self.get_service(request).listar(filters)
        serializer = AsistenciaListSerializer(asistencias, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            asistencia = self.get_service(request).obtener(pk)
            return Response(AsistenciaSerializer(asistencia).data)
        except AsistenciaNotFoundException as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        try:
            serializer = AsistenciaSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            asistencia = self.get_service(request).registrar(serializer.validated_data)
            return Response(
                AsistenciaSerializer(asistencia).data,
                status=status.HTTP_201_CREATED
            )
        except ColaboradorNotFoundException as e:
            return Response({'error': e.message}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='resumen-dia')
    def resumen_dia(self, request):
        fecha = request.query_params.get('fecha')
        resumen = self.get_service(request).resumen_dia(fecha)
        return Response(resumen)
