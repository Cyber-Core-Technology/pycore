from decimal import Decimal
from rest_framework import serializers
from apps.purchases.models import Compra, DetalleCompra


# ── Detalle ───────────────────────────────────────────────────────────────────

class DetalleCompraSerializer(serializers.ModelSerializer):
    cantidad_pendiente          = serializers.DecimalField(max_digits=12, decimal_places=4, read_only=True)
    esta_completamente_recibida = serializers.BooleanField(read_only=True)
    nombre_producto             = serializers.CharField(source='producto.nombre', read_only=True)
    sku_producto                = serializers.CharField(source='producto.sku',    read_only=True)
    variante_nombre             = serializers.CharField(source='variante.nombre', read_only=True)
    unidad_abreviatura          = serializers.SerializerMethodField()

    class Meta:
        model = DetalleCompra
        fields = [
            'id_detalle',
            'producto', 'nombre_producto', 'sku_producto',
            'variante', 'variante_nombre',
            'unidad_abreviatura',
            'cantidad', 'cantidad_recibida', 'cantidad_pendiente',
            'esta_completamente_recibida',
            'precio_unitario', 'descuento', 'subtotal',
            'impuesto_tasa', 'impuesto_monto', 'total',
        ]
        read_only_fields = fields

    def get_unidad_abreviatura(self, obj):
        if obj.variante:
            um = obj.variante.unidad_medida_efectiva
        else:
            um = obj.producto.unidad_medida
        return um.abreviatura if um else None


class DetalleCompraLightSerializer(serializers.ModelSerializer):
    nombre_producto = serializers.CharField(
        source='producto.nombre', read_only=True
    )

    class Meta:
        model = DetalleCompra
        fields = [
            'id_detalle',
            'producto',
            'nombre_producto',
            'variante',
            'cantidad',
            'cantidad_recibida',
            'precio_unitario',
            'total',
        ]


# ── Compra ────────────────────────────────────────────────────────────────────

class CompraSerializer(serializers.ModelSerializer):
    detalles = DetalleCompraSerializer(many=True, read_only=True)
    nombre_proveedor = serializers.CharField(
        source='proveedor.nombre_comercial', read_only=True
    )
    nombre_sucursal = serializers.CharField(
        source='sucursal.nombre', read_only=True
    )

    class Meta:
        model = Compra
        fields = [
            'id_compra', 'uuid', 'folio',
            'proveedor', 'nombre_proveedor',
            'sucursal', 'nombre_sucursal',
            'fecha_compra', 'fecha_entrega', 'fecha_vencimiento',
            'estado',
            'subtotal', 'descuento', 'impuestos', 'total', 'saldo_pendiente',
            'metodo_pago',
            'numero_factura', 'orden_compra', 'notas',
            'detalles',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class CompraLightSerializer(serializers.ModelSerializer):
    nombre_proveedor = serializers.CharField(
        source='proveedor.nombre_comercial', read_only=True
    )
    nombre_sucursal = serializers.CharField(
        source='sucursal.nombre', read_only=True
    )

    class Meta:
        model = Compra
        fields = [
            'id_compra', 'folio',
            'nombre_proveedor', 'nombre_sucursal',
            'fecha_compra', 'fecha_entrega',
            'estado', 'total', 'saldo_pendiente', 'metodo_pago',
        ]


# ── Requests ──────────────────────────────────────────────────────────────────

class ItemCompraRequestSerializer(serializers.Serializer):
    id_producto = serializers.UUIDField()
    id_variante = serializers.UUIDField(required=False, allow_null=True)
    cantidad = serializers.DecimalField(
        max_digits=12, decimal_places=4, min_value=Decimal('0.0001')
    )
    precio_unitario = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0')
    )
    descuento = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, default=Decimal('0')
    )
    impuesto_tasa = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True
    )


class ItemRecepcionSerializer(serializers.Serializer):
    id_detalle = serializers.IntegerField()
    cantidad_recibida = serializers.DecimalField(
        max_digits=12, decimal_places=4, min_value=Decimal('0.0001')
    )


class CrearCompraRequestSerializer(serializers.Serializer):
    id_proveedor = serializers.UUIDField()   # ← UUID
    id_sucursal = serializers.UUIDField()    # ← UUID
    fecha_entrega = serializers.DateField(required=False, allow_null=True)
    fecha_vencimiento = serializers.DateField(required=False, allow_null=True)
    metodo_pago = serializers.ChoiceField(
        choices=[c[0] for c in Compra.METODO_PAGO_CHOICES],
        required=False, allow_null=True,
    )
    numero_factura = serializers.CharField(required=False, default='', allow_blank=True)
    orden_compra = serializers.CharField(required=False, default='', allow_blank=True)
    notas = serializers.CharField(required=False, default='', allow_blank=True)
    items = ItemCompraRequestSerializer(many=True, min_length=1)


class ActualizarCompraRequestSerializer(serializers.Serializer):
    fecha_entrega = serializers.DateField(required=False, allow_null=True)
    fecha_vencimiento = serializers.DateField(required=False, allow_null=True)
    metodo_pago = serializers.ChoiceField(
        choices=[c[0] for c in Compra.METODO_PAGO_CHOICES],
        required=False, allow_null=True,
    )
    numero_factura = serializers.CharField(required=False, allow_blank=True)
    orden_compra = serializers.CharField(required=False, allow_blank=True)
    notas = serializers.CharField(required=False, allow_blank=True)
    items = ItemCompraRequestSerializer(many=True, required=False)


class CancelarCompraRequestSerializer(serializers.Serializer):
    motivo = serializers.CharField(required=False, default='', allow_blank=True)


class RecibirMercanciaRequestSerializer(serializers.Serializer):
    items = ItemRecepcionSerializer(many=True, min_length=1)
