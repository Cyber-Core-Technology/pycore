import random
import logging
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)

_TTL = getattr(settings, 'STOREFRONT_OTP_TTL', 600)   # 10 min


def _cache_key(slug: str, email: str) -> str:
    return f'sf_otp:{slug}:{email.lower().strip()}'


class OtpService:

    @staticmethod
    def generar_y_enviar(slug: str, email: str, nombre_tienda: str = '') -> bool:
        """
        Genera un OTP de 6 dígitos, lo guarda en Redis y envía el correo.
        Retorna True si se envió correctamente.
        """
        codigo = f'{random.randint(0, 999999):06d}'

        asunto = f'Tu código de verificación — {nombre_tienda or slug}'
        cuerpo = (
            f'Tu código de verificación es:\n\n'
            f'  {codigo}\n\n'
            f'Válido por {_TTL // 60} minutos. No lo compartas con nadie.\n\n'
            f'Si no solicitaste este código, ignora este mensaje.'
        )

        try:
            cache.set(_cache_key(slug, email), codigo, timeout=_TTL)
            send_mail(
                subject=asunto,
                message=cuerpo,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            logger.info('OTP enviado a %s para tienda %s', email, slug)
            return True
        except Exception as exc:
            logger.error('Error enviando OTP a %s: %s', email, exc)
            cache.delete(_cache_key(slug, email))
            return False

    @staticmethod
    def verificar(slug: str, email: str, codigo: str) -> bool:
        """Verifica el OTP y lo elimina (uso único)."""
        key = _cache_key(slug, email)
        stored = cache.get(key)
        if stored and stored == codigo.strip():
            cache.delete(key)
            return True
        return False
