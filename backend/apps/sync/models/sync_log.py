import uuid
from django.db import models


class SyncLog(models.Model):

    ESTADO_CHOICES = [
        ('ok', 'Sincronizado'),
        ('conflicto', 'Con conflictos'),
        ('error', 'Error'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        db_index=True,
        related_name='sync_logs',
    )
    usuario = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='sync_logs',
    )
    sucursal = models.ForeignKey(
        'core.Sucursal',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='sync_logs',
    )

    ventas_recibidas = models.IntegerField(default=0)
    ventas_ok = models.IntegerField(default=0)
    ventas_conflicto = models.IntegerField(default=0)
    ventas_duplicadas = models.IntegerField(default=0)

    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ok')
    detalle = models.JSONField(default=dict)

    dispositivo_id = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sync_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['empresa', 'created_at']),
        ]

    def __str__(self):
        return f"Sync empresa={self.empresa_id} — {self.estado} — {self.created_at}"
