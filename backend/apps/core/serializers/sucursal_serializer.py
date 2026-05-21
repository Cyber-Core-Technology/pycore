from rest_framework import serializers
from apps.core.models import Sucursal


class SucursalSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)

    class Meta:
        model = Sucursal
        fields = [
            'id_sucursal', 'empresa', 'empresa_nombre',
            'nombre', 'codigo',
            'direccion', 'ciudad', 'estado', 'cp',
            'telefono', 'email',
            'es_principal', 'activo', 'fecha_registro',
        ]
        read_only_fields = ['id_sucursal', 'fecha_registro']


class SucursalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sucursal
        fields = [
            'nombre', 'codigo',
            'direccion', 'ciudad', 'estado', 'cp',
            'telefono', 'email', 'es_principal',
        ]
