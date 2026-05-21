from rest_framework import serializers
from apps.hr.models import Colaborador


class ColaboradorSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    usuario_id = serializers.UUIDField(
        source='usuario.id', read_only=True, allow_null=True
    )
    usuario_username = serializers.CharField(
        source='usuario.username', read_only=True, allow_null=True
    )
    usuario_email = serializers.EmailField(
        source='usuario.email', read_only=True, allow_null=True
    )

    class Meta:
        model = Colaborador
        fields = [
            'id', 'numero_empleado', 'nombre', 'apellido_paterno',
            'apellido_materno', 'nombre_completo', 'fecha_nacimiento',
            'curp', 'rfc', 'nss', 'email', 'telefono', 'puesto',
            'departamento', 'fecha_ingreso', 'fecha_baja', 'tipo_contrato',
            'salario_diario', 'estado', 'sucursal',
            'usuario_id', 'usuario_username', 'usuario_email',
            'created_at',
        ]
        read_only_fields = ['id', 'numero_empleado', 'created_at']


class ColaboradorWriteSerializer(serializers.ModelSerializer):
    """Serializer de escritura — acepta usuario (FK) para vincular al colaborador."""
    nombre_completo = serializers.ReadOnlyField()

    class Meta:
        model = Colaborador
        fields = [
            'id', 'numero_empleado', 'nombre', 'apellido_paterno',
            'apellido_materno', 'nombre_completo', 'fecha_nacimiento',
            'curp', 'rfc', 'nss', 'email', 'telefono', 'puesto',
            'departamento', 'fecha_ingreso', 'fecha_baja', 'tipo_contrato',
            'salario_diario', 'estado', 'sucursal', 'usuario',
            'created_at',
        ]
        read_only_fields = ['id', 'numero_empleado', 'created_at']


class ColaboradorListSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    tiene_usuario = serializers.SerializerMethodField()

    class Meta:
        model = Colaborador
        fields = [
            'id', 'numero_empleado', 'nombre_completo',
            'puesto', 'departamento', 'estado', 'sucursal', 'tiene_usuario',
        ]

    def get_tiene_usuario(self, obj):
        return obj.usuario_id is not None
