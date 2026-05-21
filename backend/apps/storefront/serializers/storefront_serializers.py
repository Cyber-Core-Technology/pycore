from rest_framework import serializers
from django.db.models import Sum

from apps.storefront.models import ConfiguracionStorefront
from apps.inventory.models import Producto


# ── ERP Management (authenticated) ────────────────────────────────────────

class StorefrontConfigSerializer(serializers.ModelSerializer):
    """Serializador completo para el panel del negocio."""
    mp_access_token = serializers.CharField(
        required=False, allow_blank=True,
        write_only=False,   # el negocio puede ver/editar su propio token
        style={'input_type': 'password'},
    )

    class Meta:
        model = ConfiguracionStorefront
        fields = [
            'id', 'slug',
            'nombre_tienda', 'descripcion', 'banner_url',
            'color_primario', 'color_secundario',
            'activo', 'mostrar_precios', 'mostrar_stock', 'mostrar_agotados',
            'pagina_detalle_activa',
            'whatsapp', 'email_pub', 'sitio_web',
            'mp_access_token', 'mp_mode',
            'meta_titulo', 'meta_descripcion',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_slug(self, value):
        value = value.lower().strip()
        qs = ConfiguracionStorefront.objects.filter(slug=value)
        # Si es una actualización, excluir la instancia actual
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Este slug ya está en uso por otro negocio.')
        return value


class ProductoVisibilidadSerializer(serializers.Serializer):
    """Para actualización masiva de visibilidad en el panel del negocio."""
    id = serializers.UUIDField()
    visibilidad_publica = serializers.ChoiceField(
        choices=['privado', 'publico_sin_stock', 'publico_con_stock']
    )


# ── Public (no auth) ──────────────────────────────────────────────────────

class StorefrontPublicSerializer(serializers.ModelSerializer):
    """Solo expone campos seguros para el público."""
    nombre_empresa = serializers.CharField(source='empresa.nombre', read_only=True)
    logo_url       = serializers.CharField(source='empresa.logo', read_only=True)
    acepta_mp      = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracionStorefront
        fields = [
            'slug', 'nombre_tienda', 'nombre_empresa', 'descripcion',
            'logo_url', 'banner_url',
            'color_primario', 'color_secundario',
            'mostrar_precios', 'mostrar_stock', 'mostrar_agotados',
            'pagina_detalle_activa',
            'whatsapp', 'email_pub', 'sitio_web',
            'meta_titulo', 'meta_descripcion',
            'acepta_mp',
        ]

    def get_acepta_mp(self, obj) -> bool:
        return bool(obj.mp_access_token)


class ProductoPublicoSerializer(serializers.ModelSerializer):
    """Producto para el catálogo público — sin datos financieros internos."""
    categoria_nombre      = serializers.CharField(source='categoria.nombre', read_only=True, default='')
    unidad_medida_nombre  = serializers.CharField(source='unidad_medida.nombre', read_only=True, default='')
    stock_disponible      = serializers.SerializerMethodField()
    precio_venta          = serializers.SerializerMethodField()

    class Meta:
        model = Producto
        fields = [
            'id', 'slug', 'nombre', 'descripcion', 'tipo',
            'imagen_url', 'sku', 'codigo_barras',
            'categoria_nombre', 'unidad_medida_nombre',
            'visibilidad_publica',
            'precio_venta',
            'stock_disponible',
        ]

    def get_precio_venta(self, obj):
        config = self.context.get('config')
        if config and not config.mostrar_precios:
            return None
        return str(obj.precio_venta)

    def get_stock_disponible(self, obj):
        if obj.visibilidad_publica != 'publico_con_stock':
            return None
        config = self.context.get('config')
        if config and not config.mostrar_stock:
            return None
        # Suma del stock disponible en todas las sucursales
        from apps.inventory.models import Inventario
        result = Inventario.objects.filter(producto=obj).aggregate(
            total=Sum('stock_actual')
        )
        return int(result['total'] or 0)


class ProductoDetallePublicoSerializer(ProductoPublicoSerializer):
    """Versión extendida para la página de detalle individual del producto."""
    slug             = serializers.CharField(read_only=True)
    descripcion_larga = serializers.CharField(read_only=True)
    galeria_imagenes  = serializers.JSONField(read_only=True)
    ficha_tecnica     = serializers.JSONField(read_only=True)
    relacionados      = serializers.SerializerMethodField()

    class Meta(ProductoPublicoSerializer.Meta):
        fields = ProductoPublicoSerializer.Meta.fields + [
            'slug', 'descripcion_larga', 'galeria_imagenes', 'ficha_tecnica',
            'relacionados',
        ]

    def get_relacionados(self, obj):
        config = self.context.get('config')
        relacionados = self.context.get('relacionados', [])
        return ProductoPublicoSerializer(
            relacionados, many=True, context={'config': config}
        ).data
