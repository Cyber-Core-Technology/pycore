from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.terceros.serializers import ProveedorSerializer, ProveedorListSerializer
from apps.terceros.services import ProveedorService
from apps.terceros.import_specs import proveedor_importer
from apps.terceros.import_utils import parsear_archivo_xlsx_csv, MAX_ROWS

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

    # ── Importación masiva ───────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='plantilla-importacion')
    def plantilla_importacion(self, request):
        """GET /api/v1/terceros/proveedores/plantilla-importacion/ — descarga la plantilla .xlsx"""
        return proveedor_importer().generar_plantilla()

    @action(detail=False, methods=['post'], url_path='previsualizar-importacion',
            parser_classes=[MultiPartParser])
    def previsualizar_importacion(self, request):
        """POST — parsea y valida el archivo sin crear registros."""
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'detail': 'No se recibió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)
        filas_raw = parsear_archivo_xlsx_csv(archivo)
        if isinstance(filas_raw, Response):
            return filas_raw
        if len(filas_raw) > MAX_ROWS:
            return Response(
                {'detail': f'El archivo excede el límite de {MAX_ROWS} filas por importación.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(proveedor_importer().previsualizar(self._empresa(request), filas_raw))

    @action(detail=False, methods=['post'], url_path='importar',
            parser_classes=[MultiPartParser, JSONParser])
    def importar(self, request):
        """POST — importa proveedores desde archivo (multipart) o filas JSON pre-editadas."""
        modo = request.data.get('modo', 'atomico')
        json_filas = request.data.get('filas')
        if isinstance(json_filas, list):
            filas_raw = json_filas
        else:
            archivo = request.FILES.get('archivo')
            if not archivo:
                return Response(
                    {'detail': 'Se requiere el campo "archivo" o un cuerpo JSON con "filas".'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            filas_raw = parsear_archivo_xlsx_csv(archivo)
            if isinstance(filas_raw, Response):
                return filas_raw

        if not filas_raw:
            return Response({'detail': 'No hay filas para importar.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(filas_raw) > MAX_ROWS:
            return Response({'detail': f'El lote excede el límite de {MAX_ROWS} filas.'},
                            status=status.HTTP_400_BAD_REQUEST)

        data, http_status = proveedor_importer().importar(self._empresa(request), filas_raw, modo)
        return Response(data, status=http_status)
