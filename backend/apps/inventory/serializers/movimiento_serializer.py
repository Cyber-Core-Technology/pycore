from rest_framework import serializers
from apps.inventory.models import MovimientoInventario


class MovimientoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    sucursal_nombre = serializers.CharField(source='sucursal.nombre', read_only=True)
    variante_nombre = serializers.CharField(source='variante.nombre', read_only=True)

    class Meta:
        model = MovimientoInventario
        fields = [
            'id', 'folio', 'tipo_movimiento',
            'producto', 'producto_nombre',
            'variante', 'variante_nombre',
            'sucursal', 'sucursal_nombre',
            'cantidad', 'costo_unitario', 'costo_total',
            'stock_antes', 'stock_despues',
            'tipo_referencia', 'referencia_id', 'motivo', 'observaciones',
            'created_at',
        ]
        read_only_fields = ['id', 'folio', 'stock_antes', 'stock_despues', 'created_at']


class AjusteSerializer(serializers.Serializer):
    producto_id = serializers.UUIDField()
    sucursal_id = serializers.UUIDField()
    variante_id = serializers.UUIDField(required=False, allow_null=True)
    cantidad_nueva = serializers.DecimalField(max_digits=12, decimal_places=2)
    motivo = serializers.CharField(max_length=255, default='Ajuste manual')


class EntradaSerializer(serializers.Serializer):
    producto_id = serializers.UUIDField()
    sucursal_id = serializers.UUIDField()
    variante_id = serializers.UUIDField(required=False, allow_null=True)
    cantidad = serializers.DecimalField(max_digits=12, decimal_places=2)
    costo_unitario = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    motivo = serializers.CharField(max_length=255, default='Entrada manual')
