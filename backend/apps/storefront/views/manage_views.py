import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from rest_framework.parsers import MultiPartParser

from apps.storefront.models import ConfiguracionStorefront, PedidoStorefront, ClienteStorefront
from apps.storefront.serializers import (
    StorefrontConfigSerializer,
    StorefrontPublicSerializer,
    ProductoPublicoSerializer,
    ProductoVisibilidadSerializer,
    PedidoGestionSerializer,
    PedidoEstadoSerializer,
    ClienteStorefrontERPSerializer,
)
from apps.storefront.services import StorefrontService, PedidoService


class SlugCheckView(APIView):
    """
    GET /api/v1/storefront/config/check-slug/?slug=mi-tienda
    Devuelve {"available": true/false} sin modificar nada.
    Excluye el slug actual de la empresa del usuario para que no se marque como tomado.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        slug = request.query_params.get('slug', '').lower().strip()
        if not slug:
            return Response({'available': False}, status=status.HTTP_400_BAD_REQUEST)

        empresa = getattr(request.user, 'empresa', None)
        qs = ConfiguracionStorefront.objects.filter(slug=slug)
        if empresa:
            qs = qs.exclude(empresa=empresa)

        return Response({'available': not qs.exists()})


class StorefrontConfigView(APIView):
    """
    GET  /api/v1/storefront/config/   → obtiene (o crea) la configuración del storefront
    PATCH /api/v1/storefront/config/  → actualiza la configuración
    """
    permission_classes = [IsAuthenticated]

    def _get_empresa(self, request):
        empresa = getattr(request.user, 'empresa', None)
        return empresa

    def get(self, request):
        empresa = self._get_empresa(request)
        if not empresa:
            return Response({'detail': 'Sin empresa asignada.'}, status=status.HTTP_403_FORBIDDEN)

        config = StorefrontService.get_or_create_config(empresa)
        return Response(StorefrontConfigSerializer(config).data)

    def patch(self, request):
        empresa = self._get_empresa(request)
        if not empresa:
            return Response({'detail': 'Sin empresa asignada.'}, status=status.HTTP_403_FORBIDDEN)

        config = StorefrontService.get_or_create_config(empresa)
        serializer = StorefrontConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class StorefrontPreviewView(APIView):
    """
    GET /api/v1/storefront/config/preview/
    Devuelve los datos tal como los vería el público, sin activar el storefront.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return Response({'detail': 'Sin empresa asignada.'}, status=status.HTTP_403_FORBIDDEN)

        config = StorefrontService.get_or_create_config(empresa)
        productos = StorefrontService.get_productos_publicos(config)

        return Response({
            'config':    StorefrontPublicSerializer(config).data,
            'productos': ProductoPublicoSerializer(
                productos[:20], many=True, context={'config': config}
            ).data,
        })


class PedidosGestionView(APIView):
    """
    GET  /api/v1/storefront/pedidos/?estado=pendiente  → lista pedidos del negocio
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return Response({'detail': 'Sin empresa asignada.'}, status=status.HTTP_403_FORBIDDEN)

        qs = (
            PedidoStorefront.objects
            .filter(empresa=empresa)
            .prefetch_related('detalles')
            .select_related('cliente')
            .order_by('-created_at')
        )
        estado = request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)

        return Response(PedidoGestionSerializer(qs, many=True).data)


class PedidoEstadoView(APIView):
    """
    PATCH /api/v1/storefront/pedidos/<id>/estado/  → cambia estado del pedido
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pedido_id):
        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return Response({'detail': 'Sin empresa asignada.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            pedido = PedidoStorefront.objects.get(id=pedido_id, empresa=empresa)
        except PedidoStorefront.DoesNotExist:
            return Response({'detail': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        ser = PedidoEstadoSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        nuevo_estado = ser.validated_data['estado']
        pedido.estado = nuevo_estado
        pedido.save(update_fields=['estado', 'updated_at'])

        # Crear venta ERP + descontar inventario al entregar/confirmar pago
        if nuevo_estado in ('entregado', 'pagado'):
            PedidoService.crear_venta_desde_pedido(pedido, usuario=request.user)

        return Response(PedidoGestionSerializer(pedido).data)


class StorefrontBannerUploadView(APIView):
    """
    POST   /api/v1/storefront/config/banner/  → sube un archivo y actualiza banner_url
    DELETE /api/v1/storefront/config/banner/  → elimina el banner actual
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    ALLOWED_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB

    def _get_config(self, request):
        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return None, Response({'detail': 'Sin empresa asignada.'}, status=status.HTTP_403_FORBIDDEN)
        config = StorefrontService.get_or_create_config(empresa)
        return config, None

    def post(self, request):
        config, err = self._get_config(request)
        if err:
            return err

        archivo = request.FILES.get('banner')
        if not archivo:
            return Response({'detail': 'No se recibió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)

        if archivo.content_type not in self.ALLOWED_TYPES:
            return Response({'detail': 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.'}, status=status.HTTP_400_BAD_REQUEST)

        if archivo.size > self.MAX_SIZE:
            return Response({'detail': 'El archivo excede el límite de 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        # Eliminar banner anterior del storage
        if config.banner_url:
            storage_path = f"storefront/banners/{config.empresa_id}"
            for ext_try in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
                candidate = storage_path + ext_try
                if default_storage.exists(candidate):
                    default_storage.delete(candidate)
                    break

        # Guardar nuevo archivo via Django storage (filesystem local o S3 según settings)
        ext = os.path.splitext(archivo.name)[1].lower() or '.jpg'
        storage_path = f"storefront/banners/{config.empresa_id}{ext}"

        saved_path = default_storage.save(storage_path, ContentFile(archivo.read()))
        config.banner_url = default_storage.url(saved_path)
        config.save(update_fields=['banner_url', 'updated_at'])

        return Response({'banner_url': config.banner_url}, status=status.HTTP_200_OK)

    def delete(self, request):
        config, err = self._get_config(request)
        if err:
            return err

        if config.banner_url:
            storage_path = f"storefront/banners/{config.empresa_id}"
            for ext_try in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
                candidate = storage_path + ext_try
                if default_storage.exists(candidate):
                    default_storage.delete(candidate)
                    break

        config.banner_url = ''
        config.save(update_fields=['banner_url', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ClienteStorefrontDetalleView(APIView):
    """
    GET /api/v1/storefront/clientes/<id>/
    Detalle de un cliente de la tienda online para el panel ERP.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, cliente_id):
        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return Response({'detail': 'Sin empresa asignada.'}, status=status.HTTP_403_FORBIDDEN)
        try:
            cliente = ClienteStorefront.objects.get(id=cliente_id, empresa=empresa)
        except ClienteStorefront.DoesNotExist:
            return Response({'detail': 'Cliente no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ClienteStorefrontERPSerializer(cliente).data)


class StorefrontBulkVisibilidadView(APIView):
    """
    PATCH /api/v1/storefront/config/productos/
    Actualiza visibilidad_publica en bulk para la empresa del usuario.
    Body: [{"id": "uuid", "visibilidad_publica": "publico_sin_stock"}, ...]
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return Response({'detail': 'Sin empresa asignada.'}, status=status.HTTP_403_FORBIDDEN)

        if not isinstance(request.data, list):
            return Response({'detail': 'Se esperaba un array.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ProductoVisibilidadSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        try:
            updated = StorefrontService.bulk_update_visibilidad(empresa, serializer.validated_data)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'updated': updated})
