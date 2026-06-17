from decimal import Decimal
from rest_framework import serializers
from apps.sales.models import Venta, DetalleVenta, Devolucion, DetalleDevolucion, Promocion


# ── Promoción ─────────────────────────────────────────────────────────────────

class PromocionSerializer(serializers.ModelSerializer):
    esta_vigente = serializers.BooleanField(read_only=True)

    class Meta:
        model = Promocion
        fields = [
            'id_promocion', 'uuid', 'codigo', 'nombre', 'descripcion',
            'tipo_descuento', 'descuento', 'aplica_a', 'ids_aplicables',
            'fecha_inicio', 'fecha_fin',
            'monto_minimo_compra', 'cantidad_maxima_uso', 'cantidad_usado',
            'activo', 'esta_vigente',
        ]
        read_only_fields = fields


# ── Detalle Venta ─────────────────────────────────────────────────────────────

class DetalleVentaSerializer(serializers.ModelSerializer):
    nombre_producto = serializers.CharField(source='producto.nombre', read_only=True)
    sku_producto = serializers.CharField(source='producto.sku', read_only=True)
    variante_nombre = serializers.CharField(source='variante.nombre', read_only=True)
    unidad_medida_nombre = serializers.SerializerMethodField()
    unidad_medida_abreviacion = serializers.SerializerMethodField()
    utilidad = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = DetalleVenta
        fields = [
            'id_detalle', 'producto', 'nombre_producto', 'sku_producto',
            'variante', 'variante_nombre',
            'unidad_medida_nombre', 'unidad_medida_abreviacion',
            'cantidad',
            'precio_unitario', 'descuento', 'subtotal',
            'impuesto_tasa', 'impuesto_monto', 'total',
            'costo_unitario', 'costo_total', 'utilidad',
            'notas',
        ]
        read_only_fields = fields

    def _unidad_medida(self, obj):
        if obj.variante:
            return obj.variante.unidad_medida_efectiva
        return obj.producto.unidad_medida

    def get_unidad_medida_nombre(self, obj):
        um = self._unidad_medida(obj)
        return um.nombre if um else None

    def get_unidad_medida_abreviacion(self, obj):
        um = self._unidad_medida(obj)
        return um.abreviatura if um else None


# ── Venta ─────────────────────────────────────────────────────────────────────

class VentaSerializer(serializers.ModelSerializer):
    detalles = DetalleVentaSerializer(many=True, read_only=True)
    nombre_cliente = serializers.CharField(
        source='cliente.nombre_comercial', read_only=True
    )
    nombre_sucursal = serializers.CharField(
        source='sucursal.nombre', read_only=True
    )
    nombre_vendedor = serializers.SerializerMethodField()
    nombre_promocion = serializers.CharField(
        source='promocion.nombre', read_only=True
    )
    id_cxc = serializers.SerializerMethodField()

    def get_nombre_vendedor(self, obj):
        return f"{obj.vendedor.nombre} {obj.vendedor.apellido_paterno}".strip()

    def get_id_cxc(self, obj):
        try:
            return obj.cuenta_por_cobrar.id_cxc
        except Exception:
            return None

    class Meta:
        model = Venta
        fields = [
            'id_venta', 'uuid', 'folio',
            'cliente', 'nombre_cliente',
            'sucursal', 'nombre_sucursal',
            'vendedor', 'nombre_vendedor',
            'promocion', 'nombre_promocion',
            'fecha_venta', 'fecha_vencimiento',
            'estado',
            'subtotal', 'descuento', 'impuestos', 'total', 'saldo_pendiente',
            'metodo_pago', 'monto_recibido', 'cambio',
            'requiere_factura', 'facturado',
            'notas', 'detalles',
            'id_cxc',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class VentaLightSerializer(serializers.ModelSerializer):
    nombre_cliente = serializers.CharField(
        source='cliente.nombre_comercial', read_only=True
    )
    nombre_sucursal = serializers.CharField(
        source='sucursal.nombre', read_only=True
    )

    class Meta:
        model = Venta
        fields = [
            'id_venta', 'folio', 'nombre_cliente', 'nombre_sucursal',
            'fecha_venta', 'estado', 'total', 'saldo_pendiente', 'metodo_pago',
        ]


# ── Detalle Devolución ────────────────────────────────────────────────────────

class DetalleDevolucionSerializer(serializers.ModelSerializer):
    nombre_producto = serializers.CharField(source='producto.nombre', read_only=True)

    class Meta:
        model = DetalleDevolucion
        fields = [
            'id_detalle', 'detalle_venta',
            'producto', 'nombre_producto', 'variante',
            'cantidad', 'precio_unitario', 'subtotal', 'impuesto_monto', 'total',
        ]
        read_only_fields = fields


class DevolucionSerializer(serializers.ModelSerializer):
    detalles = DetalleDevolucionSerializer(many=True, read_only=True)
    folio_venta = serializers.CharField(source='venta.folio', read_only=True)

    class Meta:
        model = Devolucion
        fields = [
            'id_devolucion', 'uuid', 'folio', 'folio_venta',
            'venta', 'sucursal',
            'fecha_devolucion', 'motivo', 'observaciones',
            'subtotal', 'impuestos', 'total',
            'metodo_reembolso', 'reembolsado',
            'detalles', 'created_at',
        ]
        read_only_fields = fields


# ── Requests ──────────────────────────────────────────────────────────────────

class ItemVentaRequestSerializer(serializers.Serializer):
    id_producto = serializers.UUIDField()
    id_variante = serializers.UUIDField(required=False, allow_null=True)
    cantidad = serializers.DecimalField(
        max_digits=12, decimal_places=4, min_value=Decimal('0.0001')
    )
    precio_unitario = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0'),
        required=False, allow_null=True,
    )
    descuento = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        required=False, default=Decimal('0'),
    )
    impuesto_tasa = serializers.DecimalField(
        max_digits=5, decimal_places=2, required=False, allow_null=True,
    )
    notas = serializers.CharField(
        max_length=255, required=False, default='', allow_blank=True
    )


class CrearVentaRequestSerializer(serializers.Serializer):
    id_cliente = serializers.UUIDField(required=False, allow_null=True)
    id_sucursal = serializers.UUIDField()
    id_promocion = serializers.IntegerField(required=False, allow_null=True)
    metodo_pago = serializers.ChoiceField(
        choices=[c[0] for c in Venta.METODO_PAGO_CHOICES]
    )
    monto_recibido = serializers.DecimalField(
        max_digits=12, decimal_places=2,
        required=False, allow_null=True,
        min_value=Decimal('0'),
    )
    requiere_factura = serializers.BooleanField(required=False, default=False)
    notas = serializers.CharField(required=False, default='', allow_blank=True)
    items = ItemVentaRequestSerializer(many=True, min_length=1)


class CancelarVentaRequestSerializer(serializers.Serializer):
    motivo = serializers.CharField(required=False, default='', allow_blank=True)


class EnviarTicketRequestSerializer(serializers.Serializer):
    """Email opcional; si no se envía, se usa el del cliente de la venta."""
    email = serializers.EmailField(required=False, allow_blank=True)


class ItemDevolucionRequestSerializer(serializers.Serializer):
    id_detalle_venta = serializers.IntegerField()
    cantidad = serializers.DecimalField(
        max_digits=12, decimal_places=4, min_value=Decimal('0.0001')
    )


class CrearDevolucionRequestSerializer(serializers.Serializer):
    motivo = serializers.CharField(max_length=255)
    observaciones = serializers.CharField(required=False, default='', allow_blank=True)
    metodo_reembolso = serializers.ChoiceField(
        choices=[c[0] for c in Devolucion.METODO_REEMBOLSO_CHOICES],
        required=False, allow_null=True,
    )
    items = ItemDevolucionRequestSerializer(many=True, min_length=1)


class CrearPromocionRequestSerializer(serializers.Serializer):
    codigo = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    nombre = serializers.CharField(max_length=100)
    descripcion = serializers.CharField(required=False, default='', allow_blank=True)
    tipo_descuento = serializers.ChoiceField(choices=['porcentaje', 'monto_fijo'])
    descuento = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.01')
    )
    aplica_a = serializers.ChoiceField(choices=['total', 'producto', 'categoria'])
    ids_aplicables = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )
    fecha_inicio = serializers.DateField()
    fecha_fin = serializers.DateField()
    monto_minimo_compra = serializers.DecimalField(
        max_digits=12, decimal_places=2, required=False, allow_null=True
    )
    cantidad_maxima_uso = serializers.IntegerField(required=False, allow_null=True)
