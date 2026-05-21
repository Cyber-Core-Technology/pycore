import logging
from django.db.models import Q

from apps.storefront.models import ConfiguracionStorefront
from apps.inventory.models import Producto

logger = logging.getLogger(__name__)


class StorefrontService:

    @staticmethod
    def get_or_create_config(empresa) -> ConfiguracionStorefront:
        """Obtiene la config del storefront del negocio, creándola si no existe."""
        config, _ = ConfiguracionStorefront.objects.get_or_create(
            empresa=empresa,
            defaults={'slug': empresa.slug, 'nombre_tienda': empresa.nombre},
        )
        return config

    @staticmethod
    def actualizar_config(empresa, data: dict) -> ConfiguracionStorefront:
        config = StorefrontService.get_or_create_config(empresa)
        for key, value in data.items():
            setattr(config, key, value)
        config.save()
        return config

    @staticmethod
    def get_config_by_slug(slug: str):
        """Busca la config pública por slug. Retorna None si no existe o está inactiva."""
        try:
            return ConfiguracionStorefront.objects.select_related('empresa').get(
                slug=slug, activo=True
            )
        except ConfiguracionStorefront.DoesNotExist:
            return None

    @staticmethod
    def get_productos_publicos(config: ConfiguracionStorefront, q: str = '', categoria_nombre: str = ''):
        """Productos visibles en el catálogo público."""
        qs = (
            Producto.objects
            .filter(
                empresa=config.empresa,
                activo=True,
                visibilidad_publica__in=['publico_sin_stock', 'publico_con_stock'],
            )
            .select_related('categoria', 'unidad_medida')
            .order_by('nombre')
        )

        if not config.mostrar_agotados:
            # Filtrar productos con stock cuando mostrar_agotados=False
            # Solo ocultamos los publico_con_stock que tengan stock=0
            # Los publico_sin_stock siempre se muestran
            pass  # Se gestiona en el frontend por ahora; simplificación MVP

        if q:
            qs = qs.filter(
                Q(nombre__icontains=q) |
                Q(descripcion__icontains=q) |
                Q(codigo_barras__icontains=q)
            )

        if categoria_nombre:
            qs = qs.filter(categoria__nombre__iexact=categoria_nombre)

        return qs

    @staticmethod
    def get_producto_detalle(config: ConfiguracionStorefront, producto_slug: str):
        """Retorna un producto público por slug. None si no existe o no es visible."""
        try:
            return (
                Producto.objects
                .filter(
                    empresa=config.empresa,
                    slug=producto_slug,
                    activo=True,
                    visibilidad_publica__in=['publico_sin_stock', 'publico_con_stock'],
                )
                .select_related('categoria', 'unidad_medida')
                .get()
            )
        except Producto.DoesNotExist:
            return None

    @staticmethod
    def get_productos_relacionados(config: ConfiguracionStorefront, producto, limit: int = 6):
        """Productos de la misma categoría, excluyendo el actual."""
        qs = (
            Producto.objects
            .filter(
                empresa=config.empresa,
                activo=True,
                visibilidad_publica__in=['publico_sin_stock', 'publico_con_stock'],
            )
            .select_related('categoria', 'unidad_medida')
            .exclude(pk=producto.pk)
            .order_by('nombre')
        )
        if producto.categoria_id:
            qs = qs.filter(categoria=producto.categoria)
        return qs[:limit]

    @staticmethod
    def bulk_update_visibilidad(empresa, updates: list) -> int:
        """
        Actualiza visibilidad_publica en bulk.
        updates = [{'id': uuid_str, 'visibilidad_publica': 'publico_sin_stock'}, ...]
        Valida que todos los productos pertenezcan a la empresa antes de actualizar.
        """
        ids = [item['id'] for item in updates]
        # Verificar que todos pertenezcan a la empresa
        count_empresa = Producto.objects.filter(id__in=ids, empresa=empresa).count()
        if count_empresa != len(ids):
            raise ValueError('Algunos productos no pertenecen a esta empresa.')

        updated = 0
        for item in updates:
            Producto.objects.filter(id=item['id'], empresa=empresa).update(
                visibilidad_publica=item['visibilidad_publica']
            )
            updated += 1

        return updated
