import uuid
from django.db import models
from .empresa import Empresa


class Configuracion(models.Model):

    id_config    = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa      = models.OneToOneField(Empresa, on_delete=models.CASCADE, related_name='configuracion')

    # Moneda y formato
    moneda       = models.CharField(max_length=10, default='MXN')
    decimales    = models.PositiveSmallIntegerField(default=2)

    # Facturación
    genera_cfdi  = models.BooleanField(default=False)
    serie_factura = models.CharField(max_length=10, default='A')
    folio_actual  = models.PositiveIntegerField(default=1)

    # Inventario
    maneja_inventario   = models.BooleanField(default=True)
    alerta_stock_minimo = models.BooleanField(default=True)

    # Notificaciones
    email_notificaciones = models.EmailField(blank=True)

    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_configuracion'
        verbose_name = 'Configuración'
        verbose_name_plural = 'Configuraciones'

    def __str__(self):
        return f"Config — {self.empresa.nombre}"
