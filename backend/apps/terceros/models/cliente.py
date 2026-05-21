import uuid
from django.db import models
from apps.core.models.empresa import Empresa

TIPO_PERSONA = [
    ('fisica', 'Física'),
    ('moral', 'Moral'),
]

TIPO_CLIENTE = [
    ('minorista', 'Minorista'),
    ('mayorista', 'Mayorista'),
    ('distribuidor', 'Distribuidor'),
]


class Cliente(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa, on_delete=models.CASCADE, related_name='clientes'
    )
    codigo = models.CharField(max_length=20, blank=True)

    # Datos fiscales
    tipo_persona = models.CharField(max_length=10, choices=TIPO_PERSONA, default='fisica')
    nombre_comercial = models.CharField(max_length=200)
    razon_social = models.CharField(max_length=255, blank=True)
    rfc = models.CharField(max_length=13, blank=True)
    regimen_fiscal = models.CharField(max_length=10, blank=True)

    # ── Campos SAT / CFDI 4.0 (nuevos en versión 4.0 del estándar) ──────────
    codigo_postal_fiscal = models.CharField(
        max_length=5, blank=True,
        help_text='CP del domicilio fiscal del receptor (requerido en CFDI 4.0).',
    )
    uso_cfdi_default = models.CharField(
        max_length=10, blank=True, default='G03',
        help_text='Uso CFDI predeterminado para este cliente (c_UsoCFDI SAT).',
    )

    # Contacto
    email = models.EmailField(blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    celular = models.CharField(max_length=20, blank=True)
    sitio_web = models.CharField(max_length=255, blank=True)

    # Dirección
    calle = models.CharField(max_length=200, blank=True)
    numero_exterior = models.CharField(max_length=20, blank=True)
    numero_interior = models.CharField(max_length=20, blank=True)
    colonia = models.CharField(max_length=100, blank=True)
    codigo_postal = models.CharField(max_length=10, blank=True)
    ciudad = models.CharField(max_length=100, blank=True)
    estado = models.CharField(max_length=100, blank=True)
    pais = models.CharField(max_length=100, default='México')

    # Crédito
    limite_credito = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    dias_credito = models.IntegerField(default=0)
    credito_disponible = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Clasificación
    tipo_cliente = models.CharField(max_length=50, choices=TIPO_CLIENTE, blank=True)
    descuento_predeterminado = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Control
    activo = models.BooleanField(default=True)
    notas = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'terceros_clientes'
        verbose_name = 'Cliente'
        verbose_name_plural = 'Clientes'
        indexes = [
            models.Index(fields=['empresa', 'activo']),
            models.Index(fields=['empresa', 'nombre_comercial']),
        ]

    def __str__(self):
        return f'{self.nombre_comercial} ({self.empresa})'

    @property
    def tiene_credito(self):
        return self.limite_credito > 0

    def actualizar_credito_disponible(self, monto_usado):
        self.credito_disponible = self.limite_credito - monto_usado
        self.save(update_fields=['credito_disponible'])
