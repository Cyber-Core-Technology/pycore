from rest_framework import serializers
from apps.audit.models import LogAuditoria


class LogAuditoriaSerializer(serializers.ModelSerializer):
    accion_display = serializers.CharField(source='get_accion_display', read_only=True)
    empresa_nombre = serializers.SerializerMethodField()
    empresa_slug   = serializers.SerializerMethodField()

    class Meta:
        model = LogAuditoria
        fields = [
            'id',
            'empresa', 'empresa_nombre', 'empresa_slug',
            'usuario', 'usuario_email',
            'accion', 'accion_display',
            'tabla', 'id_registro',
            'ip_address',
            'created_at',
        ]

    def get_empresa_nombre(self, obj):
        return obj.empresa.nombre if obj.empresa_id else ''

    def get_empresa_slug(self, obj):
        return obj.empresa.slug if obj.empresa_id else ''
