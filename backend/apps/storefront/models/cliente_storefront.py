import uuid
from django.db import models
from django.contrib.auth.hashers import make_password, check_password


class ClienteStorefront(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='clientes_storefront',
    )

    AUTH_PROVIDER_EMAIL  = 'email'
    AUTH_PROVIDER_GOOGLE = 'google'
    AUTH_PROVIDER_CHOICES = [
        (AUTH_PROVIDER_EMAIL,  'Email'),
        (AUTH_PROVIDER_GOOGLE, 'Google'),
    ]

    email         = models.EmailField()
    nombre        = models.CharField(max_length=120)
    telefono      = models.CharField(max_length=20, blank=True)
    password      = models.CharField(max_length=255, blank=True)
    auth_provider = models.CharField(max_length=20, choices=AUTH_PROVIDER_CHOICES, default=AUTH_PROVIDER_EMAIL)
    google_id     = models.CharField(max_length=255, null=True, blank=True, unique=True)

    activo            = models.BooleanField(default=True)
    email_verificado  = models.BooleanField(default=False)

    # Doble factor de autenticación (opcional)
    two_fa_enabled = models.BooleanField(default=False)
    two_fa_method  = models.CharField(max_length=10, blank=True)   # 'totp' | 'email'
    totp_secret    = models.CharField(max_length=64, blank=True)

    # Datos fiscales / personales (opcionales, el cliente los completa desde su cuenta)
    rfc             = models.CharField(max_length=13, blank=True)
    razon_social    = models.CharField(max_length=255, blank=True)
    tipo_persona    = models.CharField(max_length=10, blank=True)   # fisica | moral
    regimen_fiscal  = models.CharField(max_length=10, blank=True)

    # Dirección
    calle            = models.CharField(max_length=200, blank=True)
    numero_exterior  = models.CharField(max_length=20, blank=True)
    numero_interior  = models.CharField(max_length=20, blank=True)
    colonia          = models.CharField(max_length=100, blank=True)
    codigo_postal    = models.CharField(max_length=10, blank=True)
    ciudad           = models.CharField(max_length=100, blank=True)
    estado           = models.CharField(max_length=100, blank=True)
    pais             = models.CharField(max_length=100, default='México', blank=True)

    acepto_privacidad        = models.BooleanField(default=False)
    fecha_acepto_privacidad  = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'storefront_clientes'
        unique_together = [('empresa', 'email')]
        verbose_name = 'Cliente Storefront'
        verbose_name_plural = 'Clientes Storefront'

    def __str__(self):
        return f'{self.nombre} <{self.email}>'

    def set_password(self, raw_password: str):
        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password(raw_password, self.password)
