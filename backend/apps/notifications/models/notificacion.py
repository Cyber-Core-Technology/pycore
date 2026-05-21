# apps/notifications/models/notificacion.py
import uuid
from django.db import models


class Notificacion(models.Model):

    class Tipo(models.TextChoices):
        TEZCA_INSIGNIA = 'tezca_insignia', 'Insignia TEZCA'
        ADMIN_MENSAJE  = 'admin_mensaje',  'Mensaje de Admin'
        SISTEMA        = 'sistema',        'Sistema'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='notificaciones',
        db_index=True,
    )
    destinatario = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.CASCADE,
        related_name='notificaciones_recibidas',
        db_index=True,
    )
    remitente = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.SET_NULL,
        related_name='notificaciones_enviadas',
        null=True,
        blank=True,
    )

    tipo    = models.CharField(max_length=30, choices=Tipo.choices, default=Tipo.SISTEMA, db_index=True)
    titulo  = models.CharField(max_length=160)
    mensaje = models.TextField()
    icono   = models.CharField(max_length=60, default='bell')  # nombre icono lucide o emoji

    leida = models.BooleanField(default=False, db_index=True)

    metadata   = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'notificaciones'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['destinatario', 'leida']),
            models.Index(fields=['empresa', 'tipo']),
        ]
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'

    def __str__(self):
        return f'[{self.tipo}] {self.titulo} → {self.destinatario_id}'
