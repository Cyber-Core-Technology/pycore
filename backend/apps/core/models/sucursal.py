import uuid
from django.db import models
from .empresa import Empresa


class Sucursal(models.Model):

    id_sucursal  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa      = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name='sucursales')
    nombre       = models.CharField(max_length=255)
    codigo       = models.CharField(max_length=20)

    # Ubicación
    direccion    = models.TextField(blank=True)
    ciudad       = models.CharField(max_length=100, blank=True)
    estado       = models.CharField(max_length=100, blank=True)
    cp           = models.CharField(max_length=10, blank=True)

    # Contacto
    telefono     = models.CharField(max_length=20, blank=True)
    email        = models.EmailField(blank=True)

    # Es la sucursal principal
    es_principal = models.BooleanField(default=False)
    activo       = models.BooleanField(default=True)

    fecha_registro      = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_sucursal'
        verbose_name = 'Sucursal'
        verbose_name_plural = 'Sucursales'
        unique_together = ('empresa', 'codigo')
        ordering = ['empresa', 'nombre']

    def __str__(self):
        return f"{self.empresa.nombre} — {self.nombre}"
