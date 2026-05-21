import uuid
from django.db import models


class PushSubscription(models.Model):
    """
    Suscripción Web Push de un usuario.
    Un usuario puede tener múltiples suscripciones (distintos dispositivos/navegadores).
    Se elimina automáticamente cuando el servidor recibe HTTP 410 (Gone) del push service.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    usuario     = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.CASCADE,
        related_name='push_subscriptions',
    )
    empresa     = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='push_subscriptions',
    )

    # Los tres campos que devuelve el navegador al suscribirse
    endpoint    = models.TextField(unique=True)
    keys_p256dh = models.TextField()   # clave pública del cliente (base64url)
    keys_auth   = models.TextField()   # secreto de autenticación  (base64url)

    user_agent  = models.CharField(max_length=300, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'push_subscriptions'
        indexes  = [models.Index(fields=['usuario', 'empresa'])]
        verbose_name        = 'Suscripción Push'
        verbose_name_plural = 'Suscripciones Push'

    def __str__(self):
        return f'{self.usuario_id} — {self.endpoint[:60]}…'
