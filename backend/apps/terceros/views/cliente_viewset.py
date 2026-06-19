from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.terceros.serializers import ClienteSerializer, ClienteListSerializer
from apps.terceros.services import ClienteService
from apps.terceros.import_specs import cliente_importer
from apps.terceros.import_utils import parsear_archivo_xlsx_csv, MAX_ROWS

service = ClienteService()


def _storefront_as_lista(sf_qs):
    """Convierte un queryset de ClienteStorefront al formato de ClienteListSerializer."""
    result = []
    for c in sf_qs:
        result.append({
            'id':                str(c.id),
            'codigo':            '',
            'nombre_comercial':  c.nombre,
            'rfc':               c.rfc,
            'email':             c.email,
            'telefono':          c.telefono,
            'tipo_cliente':      '',
            'limite_credito':    '0.00',
            'credito_disponible': '0.00',
            'activo':            c.activo,
            'origen':            'storefront',
        })
    return result


class ClienteViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _empresa(self, request):
        return request.user.empresa

    def list(self, request):
        from apps.storefront.models import ClienteStorefront

        empresa = self._empresa(request)
        q = request.query_params.get('q')

        if q:
            erp_qs = service.buscar(empresa, q)
            sf_qs  = ClienteStorefront.objects.filter(
                empresa=empresa,
                nombre__icontains=q,
            ) | ClienteStorefront.objects.filter(
                empresa=empresa,
                email__icontains=q,
            )
        else:
            erp_qs = service.listar(empresa)
            sf_qs  = ClienteStorefront.objects.filter(empresa=empresa).order_by('activo', 'nombre')

        erp_data = ClienteListSerializer(erp_qs, many=True).data
        # Marcar clientes ERP con origen
        erp_list = [dict(item, origen='erp') for item in erp_data]
        sf_list  = _storefront_as_lista(sf_qs)

        return Response({'count': len(erp_list) + len(sf_list), 'results': erp_list + sf_list})

    def retrieve(self, request, pk=None):
        obj = service.obtener(self._empresa(request), pk)
        return Response(ClienteSerializer(obj).data)

    def create(self, request):
        serializer = ClienteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = service.crear(self._empresa(request), serializer.validated_data)
        return Response(ClienteSerializer(obj).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        serializer = ClienteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        obj = service.actualizar(self._empresa(request), pk, serializer.validated_data)
        return Response(ClienteSerializer(obj).data)

    def destroy(self, request, pk=None):
        service.eliminar(self._empresa(request), pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Importación masiva ───────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='plantilla-importacion')
    def plantilla_importacion(self, request):
        """GET /api/v1/terceros/clientes/plantilla-importacion/ — descarga la plantilla .xlsx"""
        return cliente_importer().generar_plantilla()

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
        return Response(cliente_importer().previsualizar(self._empresa(request), filas_raw))

    @action(detail=False, methods=['post'], url_path='importar',
            parser_classes=[MultiPartParser, JSONParser])
    def importar(self, request):
        """POST — importa clientes desde archivo (multipart) o filas JSON pre-editadas."""
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

        data, http_status = cliente_importer().importar(self._empresa(request), filas_raw, modo)
        return Response(data, status=http_status)
