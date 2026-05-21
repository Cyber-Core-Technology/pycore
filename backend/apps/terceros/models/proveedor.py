import uuid
from django.db import models
from apps.core.models.empresa import Empresa

TIPO_PERSONA = [
    ('fisica', 'Física'),
    ('moral', 'Moral'),
]

TIPO_PROVEEDOR = [
    ('materia_prima', 'Materia Prima'),
    ('servicios', 'Servicios'),
    ('equipos', 'Equipos'),
    ('consumibles', 'Consumibles'),
    ('otro', 'Otro'),
]


class Proveedor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa, on_delete=models.CASCADE, related_name='proveedores'
    )
    codigo = models.CharField(max_length=20, blank=True)

    # Datos fiscales
    tipo_persona = models.CharField(max_length=10, choices=TIPO_PERSONA, default='moral')
    nombre_comercial = models.CharField(max_length=200)
    razon_social = models.CharField(max_length=255, blank=True)
    rfc = models.CharField(max_length=13, blank=True)

    # Contacto
    email = models.EmailField(blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    celular = models.CharField(max_length=20, blank=True)
    sitio_web = models.CharField(max_length=255, blank=True)
    contacto_principal = models.CharField(max_length=150, blank=True)

    # Dirección
    calle = models.CharField(max_length=200, blank=True)
    numero_exterior = models.CharField(max_length=20, blank=True)
    numero_interior = models.CharField(max_length=20, blank=True)
    colonia = models.CharField(max_length=100, blank=True)
    codigo_postal = models.CharField(max_length=10, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=100, blank=True)
    pais = models.CharField(max_length=100, default='México')

    # Términos comerciales
    dias_credito = models.IntegerField(default=0)
    descuento_pronto_pago = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    dias_pronto_pago = models.IntegerField(default=0)

    # Clasificación
    tipo_proveedor = models.CharField(max_length=20, choices=TIPO_PROVEEDOR, blank=True)

    # Control
    activo = models.BooleanField(default=True)
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'terceros_proveedores'
        verbose_name = 'Proveedor'
        verbose_name_plural = 'Proveedores'
        indexes = [
            models.Index(fields=['empresa', 'activo']),
            models.Index(fields=['empresa', 'nombre_comercial']),
        ]

    def __str__(self):
        return f'{self.nombre_comercial} ({self.empresa})'
