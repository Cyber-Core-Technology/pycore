from decimal import Decimal
from rest_framework import serializers
from apps.finance.models import (
    CuentaBancaria, CuentaPorCobrar, CuentaPorPagar,
    PagoCliente, PagoProveedor, Gasto,
)


# ── Cuenta Bancaria ───────────────────────────────────────────────────────────

class CuentaBancariaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CuentaBancaria
        fields = [
            'id_cuenta', 'uuid', 'nombre', 'banco', 'numero_cuenta',
            'clabe', 'tipo_cuenta', 'moneda',
            'saldo_inicial', 'saldo_actual',
            'es_principal', 'activo', 'notas',
            'created_at',
        ]
        read_only_fields = fields


class CrearCuentaBancariaRequestSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    banco = serializers.CharField(required=False, default='', allow_blank=True)
    numero_cuenta = serializers.CharField(required=False, default='', allow_blank=True)
    clabe = serializers.CharField(required=False, default='', allow_blank=True, max_length=18)
    tipo_cuenta = serializers.ChoiceField(
        choices=['cheques', 'ahorro', 'inversion', 'caja'], default='cheques'
    )
    moneda = serializers.ChoiceField(choices=['MXN', 'USD', 'EUR'], default='MXN')
    saldo_inicial = serializers.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal('0')
    )
    es_principal = serializers.BooleanField(default=False)
    notas = serializers.CharField(required=False, default='', allow_blank=True)


# ── CxC ───────────────────────────────────────────────────────────────────────

class CxCSerializer(serializers.ModelSerializer):
    nombre_cliente = serializers.CharField(
        source='cliente.nombre_comercial', read_only=True
    )
    folio_venta = serializers.CharField(
        source='venta.folio', read_only=True
    )
    esta_vencida = serializers.BooleanField(read_only=True)

    class Meta:
        model = CuentaPorCobrar
        fields = [
            'id_cxc', 'uuid', 'folio',
            'cliente', 'nombre_cliente',
            'venta', 'folio_venta',
            'monto_original', 'saldo_pendiente',
            'fecha_emision', 'fecha_vencimiento',
            'estado', 'esta_vencida',
            'notas', 'created_at',
        ]
        read_only_fields = fields


class CrearCxCManualRequestSerializer(serializers.Serializer):
    """Para crear CxC manualmente sin venta asociada."""
    id_cliente = serializers.UUIDField()
    monto_original = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.01')
    )
    fecha_vencimiento = serializers.DateField()
    notas = serializers.CharField(required=False, default='', allow_blank=True)


# ── CxP ───────────────────────────────────────────────────────────────────────

class CxPSerializer(serializers.ModelSerializer):
    nombre_proveedor = serializers.CharField(
        source='proveedor.nombre_comercial', read_only=True, default=None,
    )
    folio_compra = serializers.CharField(
        source='compra.folio', read_only=True, default=None,
    )
    esta_vencida = serializers.BooleanField(read_only=True)

    class Meta:
        model = CuentaPorPagar
        fields = [
            'id_cxp', 'uuid', 'folio',
            'proveedor', 'nombre_proveedor',
            'compra', 'folio_compra',
            'monto_original', 'saldo_pendiente',
            'fecha_emision', 'fecha_vencimiento',
            'estado', 'esta_vencida',
            'notas', 'created_at',
        ]
        read_only_fields = fields


class CrearCxPDesdeCompraRequestSerializer(serializers.Serializer):
    id_compra = serializers.IntegerField()


# ── Pago Cliente ──────────────────────────────────────────────────────────────

class PagoClienteSerializer(serializers.ModelSerializer):
    folio_cxc = serializers.CharField(source='cxc.folio', read_only=True)
    nombre_cuenta = serializers.CharField(
        source='cuenta_bancaria.nombre', read_only=True
    )

    class Meta:
        model = PagoCliente
        fields = [
            'id_pago', 'uuid', 'folio',
            'cxc', 'folio_cxc',
            'cuenta_bancaria', 'nombre_cuenta',
            'monto', 'metodo_pago',
            'fecha_pago', 'referencia', 'notas',
            'created_at',
        ]
        read_only_fields = fields


class RegistrarPagoClienteRequestSerializer(serializers.Serializer):
    id_cxc = serializers.IntegerField()
    monto = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.01')
    )
    metodo_pago = serializers.ChoiceField(
        choices=['efectivo', 'tarjeta_debito', 'tarjeta_credito',
                 'transferencia', 'cheque', 'otro']
    )
    fecha_pago = serializers.DateField(required=False)
    id_cuenta_bancaria = serializers.IntegerField(required=False, allow_null=True)
    referencia = serializers.CharField(required=False, default='', allow_blank=True)
    notas = serializers.CharField(required=False, default='', allow_blank=True)


# ── Pago Proveedor ────────────────────────────────────────────────────────────

class PagoProveedorSerializer(serializers.ModelSerializer):
    folio_cxp = serializers.CharField(source='cxp.folio', read_only=True)
    nombre_cuenta = serializers.CharField(
        source='cuenta_bancaria.nombre', read_only=True
    )

    class Meta:
        model = PagoProveedor
        fields = [
            'id_pago', 'uuid', 'folio',
            'cxp', 'folio_cxp',
            'cuenta_bancaria', 'nombre_cuenta',
            'monto', 'metodo_pago',
            'fecha_pago', 'referencia', 'notas',
            'created_at',
        ]
        read_only_fields = fields


class RegistrarPagoProveedorRequestSerializer(serializers.Serializer):
    id_cxp = serializers.IntegerField()
    monto = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.01')
    )
    metodo_pago = serializers.ChoiceField(
        choices=['efectivo', 'tarjeta_debito', 'tarjeta_credito',
                 'transferencia', 'cheque', 'otro']
    )
    fecha_pago = serializers.DateField(required=False)
    id_cuenta_bancaria = serializers.IntegerField(required=False, allow_null=True)
    referencia = serializers.CharField(required=False, default='', allow_blank=True)
    notas = serializers.CharField(required=False, default='', allow_blank=True)


# ── Gasto ─────────────────────────────────────────────────────────────────────

class GastoSerializer(serializers.ModelSerializer):
    nombre_sucursal = serializers.CharField(
        source='sucursal.nombre', read_only=True
    )
    nombre_cuenta = serializers.CharField(
        source='cuenta_bancaria.nombre', read_only=True
    )

    class Meta:
        model = Gasto
        fields = [
            'id_gasto', 'uuid', 'folio',
            'sucursal', 'nombre_sucursal',
            'cuenta_bancaria', 'nombre_cuenta',
            'concepto', 'categoria',
            'monto', 'impuesto_monto', 'total',
            'metodo_pago', 'fecha_gasto',
            'referencia', 'comprobante_url', 'notas',
            'created_at',
        ]
        read_only_fields = fields


class RegistrarGastoRequestSerializer(serializers.Serializer):
    concepto = serializers.CharField(max_length=255)
    categoria = serializers.ChoiceField(
        choices=['renta', 'servicios', 'nomina', 'mantenimiento',
                 'marketing', 'transporte', 'impuestos', 'otro'],
        default='otro',
    )
    monto = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0.01')
    )
    impuesto_monto = serializers.DecimalField(
        max_digits=12, decimal_places=2, default=Decimal('0')
    )
    metodo_pago = serializers.ChoiceField(
        choices=['efectivo', 'tarjeta_debito', 'tarjeta_credito',
                 'transferencia', 'cheque', 'otro']
    )
    fecha_gasto = serializers.DateField(required=False)
    id_sucursal = serializers.UUIDField(required=False, allow_null=True)
    id_cuenta_bancaria = serializers.IntegerField(required=False, allow_null=True)
    referencia = serializers.CharField(required=False, default='', allow_blank=True)
    notas = serializers.CharField(required=False, default='', allow_blank=True)
