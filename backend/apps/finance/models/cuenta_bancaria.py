import uuid
from django.db import models


class CuentaBancaria(models.Model):
    """
    Cuentas bancarias de la empresa.
    Pagos de clientes y a proveedores pueden asociarse a una cuenta.
    """

    TIPO_CUENTA_CHOICES = [
        ('cheques', 'Cheques'),
        ('ahorro', 'Ahorro'),
        ('inversion', 'Inversión'),
        ('caja', 'Caja'),
    ]

    MONEDA_CHOICES = [
        ('MXN', 'Peso Mexicano'),
        ('USD', 'Dólar Americano'),
        ('EUR', 'Euro'),
    ]

    id_cuenta = models.AutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='cuentas_bancarias',
    )

    nombre = models.CharField(max_length=100)
    banco = models.CharField(max_length=100, blank=True, default='')
    numero_cuenta = models.CharField(max_length=50, blank=True, default='')
    clabe = models.CharField(max_length=18, blank=True, default='')
    tipo_cuenta = models.CharField(
        max_length=20, choices=TIPO_CUENTA_CHOICES, default='cheques'
    )
    moneda = models.CharField(max_length=3, choices=MONEDA_CHOICES, default='MXN')

    saldo_actual = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    saldo_inicial = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    es_principal = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    notas = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.PROTECT,
        db_column='created_by',
        related_name='cuentas_bancarias_creadas',
        null=True, blank=True,
    )

    class Meta:
        db_table = 'cuentas_bancarias'
        ordering = ['-es_principal', 'nombre']
        indexes = [
            models.Index(fields=['empresa', 'activo']),
        ]

    def __str__(self):
        return f"{self.nombre} — {self.banco} ({self.moneda})"
