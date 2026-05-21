from rest_framework import serializers
from apps.inventory.models import Inventario


class InventarioSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_sku = serializers.CharField(source='producto.sku', read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    variante_nombre = serializers.CharField(source='variante.nombre', read_only=True)
    stock_disponible = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    valor_inventario = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    bajo_minimo = serializers.BooleanField(read_only=True)
    # Gramaje: indica si la cantidad es decimal (peso/volumen) y en qué unidad
    es_por_peso = serializers.SerializerMethodField()
    unidad_abreviatura = serializers.SerializerMethodField()

    class Meta:
        model = Inventario
        fields = [
            'id', 'producto', 'producto_nombre', 'producto_sku',
            'variante', 'variante_nombre',
            'sucursal', 'sucursal_nombre',
            'stock_actual', 'stock_reservado', 'stock_disponible',
            'costo_promedio', 'valor_inventario',
            'ubicacion', 'pasillo', 'estante',
            'bajo_minimo',
            'es_por_peso', 'unidad_abreviatura',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']

    def get_es_por_peso(self, obj):
        if obj.variante:
            return obj.variante.es_por_peso
        um = obj.producto.unidad_medida
        return um is not None and um.tipo in ('peso', 'volumen', 'longitud', 'area')

    def get_unidad_abreviatura(self, obj):
        if obj.variante:
            um = obj.variante.unidad_medida_efectiva
        else:
            um = obj.producto.unidad_medida
        return um.abreviatura if um else None
