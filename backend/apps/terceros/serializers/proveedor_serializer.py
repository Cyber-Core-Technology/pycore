from rest_framework import serializers
from apps.terceros.models import Proveedor


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = [
            'id', 'codigo', 'tipo_persona', 'nombre_comercial', 'razon_social',
            'rfc', 'email', 'telefono', 'celular', 'sitio_web', 'contacto_principal',
            'calle', 'numero_exterior', 'numero_interior', 'colonia',
            'codigo_postal', 'ciudad', 'estado', 'pais',
            'dias_credito', 'descuento_pronto_pago', 'dias_pronto_pago',
            'tipo_proveedor', 'activo', 'notas', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ProveedorListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados."""
    class Meta:
        model = Proveedor
        fields = [
            'id', 'codigo', 'nombre_comercial', 'rfc',
            'email', 'telefono', 'contacto_principal',
            'tipo_proveedor', 'dias_credito', 'activo',
        ]
