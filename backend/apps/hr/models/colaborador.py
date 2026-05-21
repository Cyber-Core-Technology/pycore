import uuid
from django.db import models
from django.conf import settings
from apps.core.models.empresa import Empresa
from apps.core.models.sucursal import Sucursal


class Colaborador(models.Model):

    TIPO_CONTRATO_CHOICES = [
        ('planta', 'Planta'),
        ('temporal', 'Temporal'),
        ('honorarios', 'Honorarios'),
        ('practicante', 'Practicante'),
    ]

    ESTADO_CHOICES = [
        ('activo', 'Activo'),
        ('baja', 'Baja'),
        ('vacaciones', 'Vacaciones'),
        ('incapacidad', 'Incapacidad'),
    ]

    # Identificación
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa, on_delete=models.CASCADE, related_name='colaboradores'
    )
    sucursal = models.ForeignKey(
        Sucursal, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='colaboradores'
    )
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='colaborador'
    )
    numero_empleado = models.CharField(max_length=20, blank=True)

    # Datos personales
    nombre = models.CharField(max_length=100)
    apellido_paterno = models.CharField(max_length=100)
    apellido_materno = models.CharField(max_length=100, blank=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    curp = models.CharField(max_length=18, blank=True)
    rfc = models.CharField(max_length=13, blank=True)
    nss = models.CharField(max_length=11, blank=True)  # Número seguridad social

    # Contacto
    email = models.EmailField(blank=True)
    telefono = models.CharField(max_length=20, blank=True)

    # Laboral
    puesto = models.CharField(max_length=100)
    departamento = models.CharField(max_length=100, blank=True)
    fecha_ingreso = models.DateField()
    fecha_baja = models.DateField(null=True, blank=True)
    tipo_contrato = models.CharField(
        max_length=20, choices=TIPO_CONTRATO_CHOICES, default='planta'
    )
    salario_diario = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='activo')

    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'Colaboradores'
        verbose_name = 'Colaborador'
        verbose_name_plural = 'Colaboradores'
        ordering = ['apellido_paterno', 'nombre']
        unique_together = [['empresa', 'numero_empleado']]

    def __str__(self):
        return f"{self.nombre} {self.apellido_paterno} ({self.numero_empleado})"

    @property
    def nombre_completo(self):
        return f"{self.nombre} {self.apellido_paterno} {self.apellido_materno}".strip()

    @property
    def activo(self):
        return self.estado == 'activo'
