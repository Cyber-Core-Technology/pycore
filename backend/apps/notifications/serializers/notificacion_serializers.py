# apps/notifications/serializers/notificacion_serializers.py
from rest_framework import serializers
from apps.notifications.models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    remitente_nombre = serializers.SerializerMethodField()

    class Meta:
        model  = Notificacion
        fields = [
            'id', 'tipo', 'titulo', 'mensaje', 'icono',
            'leida', 'metadata', 'created_at', 'remitente_nombre',
        ]
        read_only_fields = fields

    def get_remitente_nombre(self, obj):
        if obj.remitente:
            return obj.remitente.nombre_completo or obj.remitente.username
        return None


class BroadcastSerializer(serializers.Serializer):
    titulo    = serializers.CharField(max_length=160)
    mensaje   = serializers.CharField()
    rol_slug  = serializers.CharField(required=False, allow_blank=True, help_text='Slug del rol destino, vacío = todos')
