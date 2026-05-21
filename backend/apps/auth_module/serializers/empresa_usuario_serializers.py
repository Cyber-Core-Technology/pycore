from rest_framework import serializers
from apps.auth_module.models import Usuario, Rol
import re


class UsuarioEmpresaListSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(read_only=True)
    roles = serializers.SerializerMethodField()
    foto_url = serializers.CharField(read_only=True)
    is_active = serializers.BooleanField(source='activo', read_only=True)
    date_joined = serializers.DateTimeField(source='created_at', read_only=True)
    jefe_id = serializers.UUIDField(source='jefe.id', read_only=True, allow_null=True, default=None)

    class Meta:
        model = Usuario
        fields = [
            'id', 'email', 'username', 'nombre_completo',
            'foto_url', 'roles', 'is_active', 'date_joined', 'jefe_id',
        ]

    def get_roles(self, obj):
        return list(
            obj.usuario_roles.select_related('rol')
            .values_list('rol__nombre', flat=True)
        )


class CrearUsuarioEmpresaSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    apellido_paterno = serializers.CharField(max_length=100)
    apellido_materno = serializers.CharField(max_length=100, allow_blank=True, default='')
    email = serializers.EmailField()
    username = serializers.CharField(max_length=50)
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    roles = serializers.ListField(
        child=serializers.CharField(), min_length=1,
        help_text='Lista de nombres de roles: admin, vendedor, almacenista, contador, rrhh, gerente',
    )

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        return data

    def validate_email(self, value):
        if Usuario.objects.filter(email=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con este email.')
        return value

    def validate_username(self, value):
        if Usuario.objects.filter(username=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con este username.')
        return value


class ActualizarUsuarioSerializer(serializers.Serializer):
    """PATCH de usuario: todos los campos son opcionales."""
    roles            = serializers.ListField(child=serializers.CharField(), required=False)
    jefe_id          = serializers.UUIDField(required=False, allow_null=True)
    nombre           = serializers.CharField(max_length=100, required=False)
    apellido_paterno = serializers.CharField(max_length=100, required=False)
    apellido_materno = serializers.CharField(max_length=100, allow_blank=True, required=False)
    telefono         = serializers.CharField(max_length=20,  allow_blank=True, required=False)
    email            = serializers.EmailField(required=False)

    def validate_email(self, value):
        # Excludes current user — checked in the view with the instance
        return value


# Keep alias for backwards compat
ActualizarRolesSerializer = ActualizarUsuarioSerializer
