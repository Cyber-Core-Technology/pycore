# apps/inventory/serializers/response/barcode_response.py
from rest_framework import serializers


class ProductoBarcodeDataSerializer(serializers.Serializer):
    """
    Representa los datos del producto encontrado (interno o externo).
    Los campos de precio y stock son nullable porque los productos
    externos no tienen esa información.
    """
    id_producto     = serializers.IntegerField(allow_null=True)
    uuid            = serializers.UUIDField(allow_null=True)
    id_variante     = serializers.IntegerField(allow_null=True)
    nombre          = serializers.CharField()
    descripcion     = serializers.CharField(allow_blank=True)
    sku             = serializers.CharField(allow_null=True)
    codigo_barras   = serializers.CharField()
    precio_venta    = serializers.DecimalField(
                        max_digits=12, decimal_places=2, allow_null=True
                      )
    precio_compra   = serializers.DecimalField(
                        max_digits=12, decimal_places=2, allow_null=True
                      )
    precio_mayoreo  = serializers.DecimalField(
                        max_digits=12, decimal_places=2, allow_null=True
                      )
    imagen_url      = serializers.URLField(allow_null=True)
    stock_disponible = serializers.IntegerField(allow_null=True)
    unidad_medida   = serializers.CharField(allow_null=True)
    categoria       = serializers.CharField(allow_null=True)
    activo          = serializers.BooleanField()
    es_vendible     = serializers.BooleanField()
    meta            = serializers.DictField(allow_null=True)


class BarcodeLookupResponseSerializer(serializers.Serializer):
    """
    Respuesta unificada del endpoint de búsqueda por barcode.

    origen:
      - "interno"      → producto existe en el inventario del tenant
      - "externo"      → encontrado en API pública, aún no existe en BD
      - "no_encontrado"→ no se halló en ninguna fuente
    """
    origen     = serializers.ChoiceField(
                   choices=["interno", "externo", "no_encontrado"]
                 )
    encontrado = serializers.BooleanField()
    producto   = ProductoBarcodeDataSerializer()
