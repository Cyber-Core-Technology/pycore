from rest_framework import serializers
from apps.inventory.models import Producto, VarianteProducto


class VarianteSerializer(serializers.ModelSerializer):
    precio_venta_efectivo  = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    precio_compra_efectivo = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    unidad_medida_nombre   = serializers.CharField(source='unidad_medida.nombre',      read_only=True)
    unidad_medida_abreviatura = serializers.CharField(source='unidad_medida.abreviatura', read_only=True)
    es_por_peso            = serializers.BooleanField(read_only=True)

    class Meta:
        model = VarianteProducto
        fields = [
            'id', 'nombre', 'sku', 'codigo_barras', 'atributos',
            'unidad_medida', 'unidad_medida_nombre', 'unidad_medida_abreviatura',
            'es_por_peso',
            'precio_venta', 'precio_compra',
            'precio_venta_efectivo', 'precio_compra_efectivo',
            'activo',
        ]
        read_only_fields = ['id']


class ProductoSerializer(serializers.ModelSerializer):
    variantes = VarianteSerializer(many=True, read_only=True)
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    unidad_medida_nombre = serializers.CharField(source='unidad_medida.nombre', read_only=True)
    impuesto_nombre = serializers.CharField(source='impuesto.nombre', read_only=True)
    impuesto_tasa = serializers.SerializerMethodField()

    def get_impuesto_tasa(self, obj):
        if obj.impuesto and obj.impuesto.activo:
            return obj.impuesto.tasa
        return None

    class Meta:
        model = Producto
        fields = [
            'id', 'codigo', 'sku', 'codigo_barras', 'nombre', 'descripcion', 'tipo',
            'categoria', 'categoria_nombre',
            'unidad_medida', 'unidad_medida_nombre',
            'impuesto', 'impuesto_nombre', 'impuesto_tasa',
            'precio_venta', 'precio_compra', 'precio_mayoreo',
            'maneja_inventario', 'stock_minimo', 'stock_maximo',
            'tiene_variantes', 'activo', 'imagen_url', 'notas',
            'visibilidad_publica',
            'slug', 'descripcion_larga', 'galeria_imagenes', 'ficha_tecnica',
            'variantes', 'created_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at']


class ProductoListSerializer(serializers.ModelSerializer):
    categoria_nombre          = serializers.CharField(source='categoria.nombre',          read_only=True)
    unidad_medida_nombre      = serializers.CharField(source='unidad_medida.nombre',      read_only=True)
    unidad_medida_abreviacion = serializers.CharField(source='unidad_medida.abreviatura', read_only=True)
    impuesto_tasa             = serializers.SerializerMethodField()
    es_por_peso               = serializers.SerializerMethodField()
    stock_disponible          = serializers.SerializerMethodField()

    def get_impuesto_tasa(self, obj):
        if obj.impuesto and obj.impuesto.activo:
            return obj.impuesto.tasa
        return None

    def get_es_por_peso(self, obj):
        um = obj.unidad_medida
        return um is not None and um.tipo == 'peso'

    def get_stock_disponible(self, obj):
        val = getattr(obj, 'stock_disponible_anotado', None)
        if val is None:
            return None
        return float(val)

    class Meta:
        model = Producto
        fields = [
            'id', 'codigo', 'sku', 'nombre', 'tipo',
            'categoria_nombre', 'unidad_medida_nombre', 'unidad_medida_abreviacion',
            'precio_venta', 'precio_compra',
            'maneja_inventario', 'stock_minimo', 'tiene_variantes', 'es_por_peso', 'activo',
            'visibilidad_publica', 'imagen_url',
            'impuesto_tasa', 'stock_disponible',
        ]
