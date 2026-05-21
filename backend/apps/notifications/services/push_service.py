import json
import logging
import threading

from django.conf import settings

logger = logging.getLogger(__name__)


class PushService:
    """
    Envía Web Push notifications usando VAPID.
    Las suscripciones expiradas (HTTP 410) se eliminan automáticamente.
    El envío se realiza en un hilo separado para no bloquear el flujo principal.
    """

    @staticmethod
    def send_to_user(usuario, title: str, body: str, data: dict | None = None, icon: str | None = None) -> None:
        """
        Dispara el envío push a todos los dispositivos del usuario en background.
        No lanza excepciones — fallos se logean y se continúa.
        """
        from apps.notifications.models import PushSubscription

        subs = list(PushSubscription.objects.filter(usuario=usuario).values(
            'id', 'endpoint', 'keys_p256dh', 'keys_auth'
        ))
        if not subs:
            return

        payload = json.dumps({
            'title': title,
            'body':  body,
            'icon':  icon or '/web-app-manifest-192x192.png',
            'badge': '/favicon-96x96.png',
            'data':  data or {},
        })

        t = threading.Thread(
            target=PushService._send_batch,
            args=(subs, payload),
            daemon=True,
        )
        t.start()

    @staticmethod
    def _send_batch(subs: list, payload: str) -> None:
        """Envía el payload a cada suscripción. Elimina las expiradas (410)."""
        try:
            from pywebpush import webpush, WebPushException
        except ImportError:
            logger.error('[Push] pywebpush no instalado — instala con: pip install pywebpush')
            return

        vapid_private = getattr(settings, 'VAPID_PRIVATE_KEY', '')
        vapid_email   = getattr(settings, 'VAPID_EMAIL', '')

        if not vapid_private or not vapid_email:
            logger.warning('[Push] VAPID_PRIVATE_KEY o VAPID_EMAIL no configurados')
            return

        from apps.notifications.models import PushSubscription

        for sub in subs:
            try:
                webpush(
                    subscription_info={
                        'endpoint': sub['endpoint'],
                        'keys': {
                            'p256dh': sub['keys_p256dh'],
                            'auth':   sub['keys_auth'],
                        },
                    },
                    data=payload,
                    vapid_private_key=vapid_private,
                    vapid_claims={'sub': f'mailto:{vapid_email}'},
                )
                logger.debug(f"[Push] ✅ Enviado a {sub['endpoint'][:60]}")
            except WebPushException as exc:
                response = getattr(exc, 'response', None)
                status   = response.status_code if response else None
                if status == 410:
                    # Suscripción expirada — limpiar
                    PushSubscription.objects.filter(id=sub['id']).delete()
                    logger.info(f"[Push] 🗑 Suscripción expirada eliminada: {sub['id']}")
                else:
                    logger.warning(f"[Push] ⚠ Error {status} enviando push: {exc}")
            except Exception as exc:
                logger.error(f"[Push] ❌ Error inesperado: {exc}", exc_info=True)
