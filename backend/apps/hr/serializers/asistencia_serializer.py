from rest_framework import serializers
from apps.hr.models import Asistencia


class AsistenciaSerializer(serializers.ModelSerializer):

    class Meta:
        model = Asistencia
        fields = [
            'id', 'colaborador', 'fecha', 'hora_registro',
            'tipo', 'estado', 'notas', 'registrado_por', 'created_at',
        ]
        read_only_fields = ['id', 'registrado_por', 'created_at']


class AsistenciaListSerializer(serializers.ModelSerializer):
    colaborador_nombre = serializers.CharField(
        source='colaborador.nombre_completo', read_only=True
    )
    colaborador_numero = serializers.CharField(
        source='colaborador.numero_empleado', read_only=True
    )

    class Meta:
        model = Asistencia
        fields = [
            'id', 'colaborador_nombre', 'colaborador_numero',
            'fecha', 'hora_registro', 'tipo', 'estado',
        ]
