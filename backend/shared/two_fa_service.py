import io
import base64
import logging
import random

import pyotp
import qrcode
import jwt
from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)

_OTP_TTL   = 300    # 5 minutos para email OTP
_TEMP_TTL  = 300    # 5 minutos para temp_token
_TRUST_TTL = 86400  # 24 horas para trust token ("recordar dispositivo")

ISSUER_ERP        = 'PyCore ERP'
ISSUER_STOREFRONT = 'PyCore Tienda'

TWO_FA_METHOD_TOTP  = 'totp'
TWO_FA_METHOD_EMAIL = 'email'


def _email_otp_key(user_id: str, user_type: str) -> str:
    return f'2fa_email_otp:{user_type}:{user_id}'


class TwoFAService:

    # ── TOTP ─────────────────────────────────────────────────────────────────

    @staticmethod
    def generate_totp_secret() -> str:
        return pyotp.random_base32()

    @staticmethod
    def get_totp_uri(secret: str, email: str, user_type: str = 'usuario') -> str:
        issuer = ISSUER_ERP if user_type == 'usuario' else ISSUER_STOREFRONT
        return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)

    @staticmethod
    def generate_qr_base64(uri: str) -> str:
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode()

    @staticmethod
    def verify_totp(secret: str, code: str) -> bool:
        return pyotp.TOTP(secret).verify(code.strip(), valid_window=1)

    # ── Email OTP ─────────────────────────────────────────────────────────────

    @staticmethod
    def send_email_otp(user_id: str, email: str, user_type: str) -> bool:
        code = f'{random.randint(0, 999999):06d}'
        cache.set(_email_otp_key(user_id, user_type), code, timeout=_OTP_TTL)
        subject = 'Tu código de verificación de dos pasos — PyCore'
        body = (
            f'Tu código de verificación es:\n\n'
            f'  {code}\n\n'
            f'Válido por {_OTP_TTL // 60} minutos. No lo compartas con nadie.\n\n'
            f'Si no intentabas iniciar sesión, ignora este mensaje.'
        )
        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            return True
        except Exception as exc:
            logger.error('Error enviando 2FA email OTP a %s: %s', email, exc)
            cache.delete(_email_otp_key(user_id, user_type))
            return False

    @staticmethod
    def verify_email_otp(user_id: str, user_type: str, code: str) -> bool:
        key = _email_otp_key(user_id, user_type)
        stored = cache.get(key)
        if stored and stored == code.strip():
            cache.delete(key)
            return True
        return False

    # ── Temp token ────────────────────────────────────────────────────────────

    @staticmethod
    def generate_temp_token(user_id: str, user_type: str, method: str, empresa_id: str = '', slug: str = '') -> str:
        now = timezone.now()
        payload = {
            'tipo':       '2fa_pending',
            'user_id':    user_id,
            'user_type':  user_type,   # 'usuario' | 'cliente'
            'method':     method,
            'empresa_id': empresa_id,
            'slug':       slug,
            'iat': int(now.timestamp()),
            'exp': int(now.timestamp()) + _TEMP_TTL,
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

    @staticmethod
    def verify_temp_token(token: str) -> dict:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            raise ValueError('El código de sesión ha expirado. Inicia sesión de nuevo.')
        except Exception:
            raise ValueError('Token de verificación inválido.')
        if payload.get('tipo') != '2fa_pending':
            raise ValueError('Token inválido.')
        return payload

    # ── Trust token (recordar dispositivo 24h) ────────────────────────────────

    @staticmethod
    def generate_trust_token(user_id: str, user_type: str) -> str:
        now = timezone.now()
        payload = {
            'tipo':      '2fa_trust',
            'user_id':   user_id,
            'user_type': user_type,
            'iat': int(now.timestamp()),
            'exp': int(now.timestamp()) + _TRUST_TTL,
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

    @staticmethod
    def verify_trust_token(token: str, user_id: str, user_type: str) -> bool:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        except Exception:
            return False
        return (
            payload.get('tipo') == '2fa_trust'
            and payload.get('user_id') == user_id
            and payload.get('user_type') == user_type
        )
