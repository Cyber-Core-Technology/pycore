from rest_framework import serializers
from apps.terceros.models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    tiene_credito = serializers.BooleanField(read_only=True)

    class Meta:
        model = Cliente
        fields = [
            'id', 'codigo', 'tipo_persona', 'nombre_comercial', 'razon_social',
            'rfc', 'regimen_fiscal', 'email', 'telefono', 'celular', 'sitio_web',
            'calle', 'numero_exterior', 'numero_interior', 'colonia',
            'codigo_postal', 'ciudad', 'estado', 'pais',
            'limite_credito', 'dias_credito', 'credito_disponible',
            'tipo_cliente', 'descuento_predeterminado',
            'activo', 'notas', 'tiene_credito', 'created_at',
        ]
        read_only_fields = ['id', 'credito_disponible', 'created_at']


class ClienteListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados."""
    class Meta:
        model = Cliente
        fields = [
            'id', 'codigo', 'nombre_comercial', 'rfc',
            'email', 'telefono', 'tipo_cliente',
            'limite_credito', 'credito_disponible', 'activo',
        ]
