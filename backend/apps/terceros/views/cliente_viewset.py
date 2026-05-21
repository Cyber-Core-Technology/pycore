from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.terceros.serializers import ClienteSerializer, ClienteListSerializer
from apps.terceros.services import ClienteService

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
