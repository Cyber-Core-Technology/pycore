import uuid
from django.db import models


class ConfiguracionStorefront(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    empresa = models.OneToOneField(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='storefront_config',
    )

    # Identificación pública — slug único, no editable después de activar
    slug = models.SlugField(max_length=60, unique=True)

    # Branding
    nombre_tienda    = models.CharField(max_length=200, blank=True)
    descripcion      = models.TextField(blank=True)
    banner_url       = models.CharField(max_length=500, blank=True)
    color_primario   = models.CharField(max_length=7, default='#1BAE91')
    color_secundario = models.CharField(max_length=7, default='#0E7C66')

    # Visibilidad
    activo          = models.BooleanField(default=False)
    mostrar_precios = models.BooleanField(default=True)
    mostrar_stock   = models.BooleanField(default=False)   # cantidad exacta
    mostrar_agotados = models.BooleanField(default=True)   # mantiene visibles sin stock

    # Contacto público
    whatsapp  = models.CharField(max_length=20, blank=True)
    email_pub = models.EmailField(blank=True)
    sitio_web = models.URLField(blank=True)

    # Pagos en línea — Mercado Pago (por negocio)
    mp_access_token = models.CharField(max_length=300, blank=True)
    mp_mode         = models.CharField(
        max_length=20,
        choices=[('sandbox', 'Sandbox/Pruebas'), ('production', 'Producción')],
        default='sandbox',
    )

    # Página de detalle de producto (tipo Mercado Libre / Amazon)
    pagina_detalle_activa = models.BooleanField(
        default=False,
        help_text='Activa páginas individuales por producto con galería, ficha técnica y productos relacionados.',
    )

    # SEO
    meta_titulo      = models.CharField(max_length=60, blank=True)
    meta_descripcion = models.CharField(max_length=160, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'storefront_configuracion'
        verbose_name = 'Configuración Storefront'
        verbose_name_plural = 'Configuraciones Storefront'

    def __str__(self):
        return f'Storefront {self.slug} ({self.empresa.nombre})'
