from rest_framework import serializers
from apps.catalogs.models import Categoria


class CategoriaSerializer(serializers.ModelSerializer):
    padre_nombre = serializers.CharField(source='padre.nombre', read_only=True)
    ruta_completa = serializers.CharField(read_only=True)
    subcategorias_count = serializers.SerializerMethodField()

    class Meta:
        model = Categoria
        fields = [
            'id', 'codigo', 'nombre', 'descripcion',
            'padre', 'padre_nombre', 'ruta_completa',
            'subcategorias_count', 'activo', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_subcategorias_count(self, obj):
        return obj.subcategorias.filter(activo=True).count()


class CategoriaTreeSerializer(serializers.ModelSerializer):
    subcategorias = serializers.SerializerMethodField()

    class Meta:
        model = Categoria
        fields = ['id', 'codigo', 'nombre', 'descripcion', 'subcategorias']

    def get_subcategorias(self, obj):
        hijos = obj.subcategorias.filter(activo=True)
        return CategoriaTreeSerializer(hijos, many=True).data

