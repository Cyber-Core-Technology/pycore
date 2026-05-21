from rest_framework import serializers
from apps.auth_module.models import Usuario


class UsuarioPerfilSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)
    empresa = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nombre', 'apellido_paterno',
            'apellido_materno', 'nombre_completo', 'telefono', 'foto_url',
            'idioma', 'zona_horaria', 'tema', 'verificado',
            'ultimo_acceso', 'empresa', 'roles',
            'two_fa_enabled', 'two_fa_method',
        ]
        read_only_fields = ['id', 'email', 'verificado', 'ultimo_acceso', 'empresa', 'roles',
                            'two_fa_enabled', 'two_fa_method']

    def get_empresa(self, obj):
        if not obj.empresa:
            return None
        return {
            'id': str(obj.empresa.id_empresa),
            'nombre': obj.empresa.nombre,
            'slug': obj.empresa.slug,
            'plan': obj.empresa.plan,
        }

    def get_roles(self, obj):
        return list(
            obj.usuario_roles.select_related('rol')
            .values_list('rol__nombre', flat=True)
        )


class UsuarioActualizarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'nombre', 'apellido_paterno', 'apellido_materno',
            'telefono', 'foto_url', 'idioma', 'zona_horaria', 'tema',
        ]


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nuevo = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password_nuevo'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        return data
