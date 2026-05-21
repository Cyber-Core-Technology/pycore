from rest_framework import serializers
from apps.catalogs.models import Impuesto


class ImpuestoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Impuesto
        fields = [
            'id', 'codigo', 'nombre', 'tasa',
            'tipo', 'es_retencion', 'activo', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
