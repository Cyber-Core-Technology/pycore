from rest_framework import serializers
from apps.catalogs.models import UnidadMedida


class UnidadMedidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadMedida
        fields = [
            'id', 'codigo', 'nombre', 'abreviatura',
            'tipo', 'activo', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
