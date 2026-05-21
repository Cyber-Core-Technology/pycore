from rest_framework import serializers
from apps.core.models import Empresa, Configuracion


class ConfiguracionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Configuracion
        fields = [
            'moneda', 'decimales', 'genera_cfdi',
            'serie_factura', 'folio_actual',
            'maneja_inventario', 'alerta_stock_minimo',
            'email_notificaciones',
        ]


class EmpresaSerializer(serializers.ModelSerializer):
    configuracion = ConfiguracionSerializer(read_only=True)

    class Meta:
        model = Empresa
        fields = [
            'id_empresa', 'nombre', 'nombre_comercial', 'slug',
            'rfc', 'razon_social', 'regimen_fiscal',
            'tipo_negocio', 'plan',
            'email', 'telefono', 'direccion',
            'logo', 'activo', 'fecha_registro',
            'configuracion',
        ]
        read_only_fields = ['id_empresa', 'fecha_registro', 'slug']


class EmpresaCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = [
            'nombre', 'nombre_comercial',
            'rfc', 'razon_social', 'regimen_fiscal',
            'tipo_negocio', 'plan',
            'email', 'telefono', 'direccion',
        ]

    def validate_rfc(self, value):
        if value and len(value) not in [12, 13]:
            raise serializers.ValidationError('El RFC debe tener 12 o 13 caracteres.')
        return value.upper() if value else value
