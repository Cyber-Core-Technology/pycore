import uuid
from django.db import models


def _empresa_logo_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return f'empresas/{instance.slug}/logo/logo.{ext}'


class Empresa(models.Model):

    PLAN_CHOICES = [
        ('basico',       'Básico'),
        ('profesional',  'Profesional'),
        ('empresarial',  'Empresarial'),
        ('elite',        'Elite'),
    ]

    TIPO_NEGOCIO_CHOICES = [
        ('informal',             'Informal'),
        ('formal_simplificado',  'Formal Simplificado'),
        ('formal_completo',      'Formal Completo'),
    ]

    # Identificación
    id_empresa     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre         = models.CharField(max_length=255)
    nombre_comercial = models.CharField(max_length=255, blank=True)
    slug           = models.SlugField(max_length=100, unique=True)

    # Fiscal
    rfc            = models.CharField(max_length=13, blank=True)
    razon_social   = models.CharField(max_length=255, blank=True)
    regimen_fiscal = models.CharField(max_length=100, blank=True)

    # Tipo y plan
    tipo_negocio   = models.CharField(max_length=30, choices=TIPO_NEGOCIO_CHOICES, default='informal')
    giro_negocio   = models.CharField(max_length=50, blank=True, default='')
    plan           = models.CharField(max_length=20, choices=PLAN_CHOICES, default='basico')

    # Contacto
    email          = models.EmailField(blank=True)
    telefono       = models.CharField(max_length=20, blank=True)
    direccion      = models.TextField(blank=True)

    # Logo
    logo           = models.ImageField(upload_to=_empresa_logo_path, null=True, blank=True)

    # Personalización de tema (solo planes empresarial/elite)
    theme_key      = models.CharField(max_length=30, default='esmeralda', blank=True)

    # Control
    activo         = models.BooleanField(default=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_empresa'
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'
        ordering = ['nombre']

    def __str__(self):
        return f"{self.nombre} ({self.slug})"
