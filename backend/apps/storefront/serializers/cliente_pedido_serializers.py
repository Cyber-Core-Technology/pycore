from rest_framework import serializers
from apps.storefront.models import ClienteStorefront, PedidoStorefront, DetallePedido
from apps.storefront.models.pedido_storefront import ESTADO_PEDIDO


# ── Auth cliente ───────────────────────────────────────────────────────────

class ClienteRegistroSerializer(serializers.Serializer):
    nombre   = serializers.CharField(max_length=120)
    email    = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    telefono = serializers.CharField(max_length=20, required=False, default='', allow_blank=True)


class ClienteLoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ClienteRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ClientePerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ClienteStorefront
        fields = [
            'id', 'email', 'nombre', 'telefono',
            'rfc', 'razon_social', 'tipo_persona', 'regimen_fiscal',
            'calle', 'numero_exterior', 'numero_interior', 'colonia',
            'codigo_postal', 'ciudad', 'estado', 'pais',
            'created_at', 'auth_provider',
            'two_fa_enabled', 'two_fa_method',
        ]
        read_only_fields = ['id', 'email', 'created_at', 'auth_provider',
                            'two_fa_enabled', 'two_fa_method']
        extra_kwargs = {
            # Campos opcionales — el cliente puede dejarlos vacíos
            'telefono':       {'allow_blank': True},
            'rfc':            {'allow_blank': True},
            'razon_social':   {'allow_blank': True},
            'tipo_persona':   {'allow_blank': True},
            'regimen_fiscal': {'allow_blank': True},
            'calle':          {'allow_blank': True},
            'numero_exterior':{'allow_blank': True},
            'numero_interior':{'allow_blank': True},
            'colonia':        {'allow_blank': True},
            'codigo_postal':  {'allow_blank': True},
            'ciudad':         {'allow_blank': True},
            'estado':         {'allow_blank': True},
            'pais':           {'allow_blank': True},
        }


# ── Pedidos ────────────────────────────────────────────────────────────────

class DetalleInputSerializer(serializers.Serializer):
    producto_id = serializers.UUIDField()
    cantidad    = serializers.IntegerField(min_value=1)


class PedidoCreateSerializer(serializers.Serializer):
    metodo_pago   = serializers.ChoiceField(choices=['efectivo_en_tienda', 'mercado_pago'])
    notas_cliente = serializers.CharField(required=False, default='', allow_blank=True)
    detalles      = DetalleInputSerializer(many=True, min_length=1)


class DetallePedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DetallePedido
        fields = ['id', 'producto_id', 'nombre_snapshot', 'precio_snapshot', 'cantidad', 'subtotal']


class PedidoSerializer(serializers.ModelSerializer):
    detalles       = DetallePedidoSerializer(many=True, read_only=True)
    cliente_nombre = serializers.CharField(source='cliente.nombre', read_only=True)

    class Meta:
        model  = PedidoStorefront
        fields = [
            'id', 'numero_pedido', 'ticket_uuid',
            'estado', 'metodo_pago',
            'subtotal', 'total',
            'notas_cliente',
            'mp_checkout_url',
            'cliente_nombre',
            'detalles',
            'created_at',
        ]


class ClienteStorefrontERPSerializer(serializers.ModelSerializer):
    """Detalle de un ClienteStorefront para consulta desde el panel ERP."""
    num_pedidos = serializers.SerializerMethodField()

    class Meta:
        model  = ClienteStorefront
        fields = [
            'id', 'email', 'nombre', 'telefono', 'activo',
            'rfc', 'razon_social', 'tipo_persona', 'regimen_fiscal',
            'calle', 'numero_exterior', 'numero_interior', 'colonia',
            'codigo_postal', 'ciudad', 'estado', 'pais',
            'email_verificado', 'acepto_privacidad', 'created_at', 'num_pedidos',
        ]

    def get_num_pedidos(self, obj):
        return obj.pedidos.count()


# ── Serializers para gestión ERP (staff del negocio) ───────────────────────

class PedidoGestionSerializer(serializers.ModelSerializer):
    """Vista completa del pedido para el panel ERP del negocio."""
    detalles        = DetallePedidoSerializer(many=True, read_only=True)
    cliente_nombre  = serializers.CharField(source='cliente.nombre', read_only=True)
    cliente_email   = serializers.CharField(source='cliente.email', read_only=True)
    cliente_telefono = serializers.CharField(source='cliente.telefono', read_only=True)

    class Meta:
        model  = PedidoStorefront
        fields = [
            'id', 'numero_pedido', 'ticket_uuid',
            'estado', 'metodo_pago',
            'subtotal', 'total',
            'notas_cliente',
            'mp_checkout_url', 'mp_payment_id',
            'cliente_nombre', 'cliente_email', 'cliente_telefono',
            'detalles',
            'created_at', 'updated_at',
        ]
        read_only_fields = [f for f in fields if f != 'estado']


class PedidoEstadoSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=[e[0] for e in ESTADO_PEDIDO])
