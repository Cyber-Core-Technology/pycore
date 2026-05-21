from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework import status

from apps.storefront.serializers import StorefrontPublicSerializer, ProductoPublicoSerializer, ProductoDetallePublicoSerializer
from apps.storefront.services import StorefrontService


class StorefrontPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = 'page_size'
    max_page_size = 100


class StorefrontHomeView(APIView):
    """
    GET /api/v1/store/{slug}/
    Datos públicos del storefront. 404 si no existe o está inactivo.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        config = StorefrontService.get_config_by_slug(slug)
        if not config:
            return Response(
                {'detail': 'Tienda no encontrada o no disponible.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(StorefrontPublicSerializer(config).data)


class StorefrontProductosView(APIView):
    """
    GET /api/v1/store/{slug}/productos/?q=&categoria=&page=
    Catálogo público paginado.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug):
        config = StorefrontService.get_config_by_slug(slug)
        if not config:
            return Response(
                {'detail': 'Tienda no encontrada o no disponible.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        q                = request.query_params.get('q', '')
        categoria_nombre = request.query_params.get('categoria', '')
        qs               = StorefrontService.get_productos_publicos(config, q=q, categoria_nombre=categoria_nombre)

        paginator = StorefrontPagination()
        page      = paginator.paginate_queryset(qs, request)
        serializer = ProductoPublicoSerializer(page, many=True, context={'config': config})
        return paginator.get_paginated_response(serializer.data)


class StorefrontProductoDetalleView(APIView):
    """
    GET /api/v1/store/{slug}/productos/{producto_slug}/
    Página de detalle de un producto individual.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, slug, producto_slug):
        config = StorefrontService.get_config_by_slug(slug)
        if not config:
            return Response(
                {'detail': 'Tienda no encontrada o no disponible.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not config.pagina_detalle_activa:
            return Response(
                {'detail': 'Página de detalle no disponible para esta tienda.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        producto = StorefrontService.get_producto_detalle(config, producto_slug)
        if not producto:
            return Response(
                {'detail': 'Producto no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        relacionados = StorefrontService.get_productos_relacionados(config, producto)
        serializer = ProductoDetallePublicoSerializer(
            producto,
            context={'config': config, 'relacionados': list(relacionados)},
        )
        return Response(serializer.data)
