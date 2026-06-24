from rest_framework import serializers


class LoginSerializer(serializers.Serializer):
    email       = serializers.EmailField()
    password    = serializers.CharField(write_only=True, min_length=6)
    trust_token = serializers.CharField(required=False, allow_blank=True, default='')


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(required=False, allow_blank=True, default='')


class TokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class SucursalRegistroSerializer(serializers.Serializer):
    """Sucursal adicional (además de la principal) capturada en el registro."""
    nombre = serializers.CharField(max_length=255)
    codigo = serializers.CharField(max_length=20, required=False, allow_blank=True)


class RegisterSerializer(serializers.Serializer):
    # Datos de empresa
    nombre_empresa = serializers.CharField(max_length=200)
    rfc = serializers.CharField(max_length=13, required=False, allow_blank=True)
    tipo_negocio = serializers.ChoiceField(
        choices=['informal', 'formal_simplificado', 'formal_completo'],
        default='informal',
    )
    giro_negocio = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')

    # Plan de suscripción inicial
    plan = serializers.ChoiceField(
        choices=['basico', 'profesional', 'empresarial'],
        default='basico',
        required=False,
    )

    # Sucursales adicionales a la principal (el cobro es por sucursal)
    sucursales = SucursalRegistroSerializer(many=True, required=False, default=list)

    # Datos de usuario admin
    email = serializers.EmailField()
    username = serializers.CharField(max_length=50, required=False, allow_blank=True)
    nombre = serializers.CharField(max_length=100)
    apellido_paterno = serializers.CharField(max_length=100, required=False, allow_blank=True)
    apellido_materno = serializers.CharField(max_length=100, required=False, allow_blank=True)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Las contraseñas no coinciden.'})
        if not data.get('username'):
            data['username'] = data['email'].split('@')[0][:50]
        return data
