import uuid
from django.db import models
from django.utils.text import slugify
from apps.core.models.empresa import Empresa
from apps.catalogs.models.categoria import Categoria
from apps.catalogs.models.unidad_medida import UnidadMedida
from apps.catalogs.models.impuesto import Impuesto

TIPO_PRODUCTO = [
    ('producto', 'Producto'),
    ('servicio', 'Servicio'),
    ('combo', 'Combo'),
]

VISIBILIDAD_PUBLICA_CHOICES = [
    ('privado',           'Privado'),
    ('publico_sin_stock', 'Público sin stock'),
    ('publico_con_stock', 'Público con stock'),
]


class Producto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa, on_delete=models.CASCADE, related_name='productos'
    )

    # Identificación
    codigo = models.CharField(max_length=50, blank=True)
    sku = models.CharField(max_length=50, blank=True)
    codigo_barras = models.CharField(max_length=50, blank=True)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_PRODUCTO, default='producto')

    # Clasificación
    categoria = models.ForeignKey(
        Categoria, on_delete=models.SET_NULL, null=True, blank=True, related_name='productos'
    )
    unidad_medida = models.ForeignKey(
        UnidadMedida, on_delete=models.RESTRICT, null=True, blank=True, related_name='productos'
    )
    impuesto = models.ForeignKey(
        Impuesto, on_delete=models.SET_NULL, null=True, blank=True, related_name='productos'
    )

    # Precios
    precio_venta = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    precio_compra = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    precio_mayoreo = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Control de inventario
    maneja_inventario = models.BooleanField(default=True)
    stock_minimo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock_maximo = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tiene_variantes = models.BooleanField(default=False)

    # ── Campos SAT / CFDI 4.0 ──────────────────────────────────────────────────
    clave_prod_serv = models.CharField(
        max_length=20, blank=True, default='01010101',
        help_text='Clave del catálogo SAT c_ClaveProdServ (ej: 43232408 para software).',
    )
    clave_unidad_sat = models.CharField(
        max_length=10, blank=True, default='H87',
        help_text='Clave del catálogo SAT c_ClaveUnidad (ej: H87=Pieza, E48=Servicio).',
    )
    objeto_impuesto = models.CharField(
        max_length=3, blank=True, default='02',
        choices=[
            ('01', '01 - No objeto de impuesto'),
            ('02', '02 - Sí objeto de impuesto'),
            ('03', '03 - Sí objeto, no obligado al desglose'),
        ],
        help_text='c_ObjetoImp: si el concepto causa IVA o no.',
    )

    # Storefront
    visibilidad_publica = models.CharField(
        max_length=20,
        choices=VISIBILIDAD_PUBLICA_CHOICES,
        default='privado',
        db_index=True,
    )

    # Storefront — página de detalle
    slug = models.SlugField(
        max_length=220, blank=True,
        help_text='Slug SEO generado automáticamente del nombre. Único por empresa.',
    )
    descripcion_larga = models.TextField(blank=True)
    galeria_imagenes  = models.JSONField(
        default=list, blank=True,
        help_text='Lista de URLs de imágenes adicionales. Ej: ["https://...","https://..."]',
    )
    ficha_tecnica = models.JSONField(
        default=list, blank=True,
        help_text='Lista de pares {clave, valor}. Ej: [{"clave":"Material","valor":"Algodón 100%"}]',
    )

    # Control
    activo = models.BooleanField(default=True)
    imagen_url = models.CharField(max_length=500, blank=True)
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inventory_productos'
        verbose_name = 'Producto'
        verbose_name_plural = 'Productos'
        indexes = [
            models.Index(fields=['empresa', 'activo']),
            models.Index(fields=['empresa', 'nombre']),
            models.Index(fields=['empresa', 'visibilidad_publica']),
            models.Index(fields=['empresa', 'slug']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['empresa', 'slug'],
                condition=models.Q(slug__gt=''),
                name='uniq_producto_slug_por_empresa',
            )
        ]

    def __str__(self):
        return f'{self.nombre} ({self.empresa})'

    def save(self, *args, **kwargs):
        if not self.slug:
            self._generar_slug()
        super().save(*args, **kwargs)

    def _generar_slug(self):
        base = slugify(self.nombre)[:200] or 'producto'
        slug = base
        n = 1
        qs = Producto.objects.filter(empresa=self.empresa, slug=slug)
        if self.pk:
            qs = qs.exclude(pk=self.pk)
        while qs.exists():
            slug = f'{base}-{n}'
            n += 1
            qs = Producto.objects.filter(empresa=self.empresa, slug=slug)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
        self.slug = slug
