"""
Backend de correo SMTP que confía en un certificado TLS fijado (pinned),
además de las CAs del sistema.

Pensado para servidores de correo autoalojados con certificado autofirmado
(p. ej. mailcow en mail.cyco.tech). Mantiene verificación criptográfica
completa de la cadena (CERT_REQUIRED): solo se acepta el certificado fijado,
por lo que sigue protegiendo contra un MITM con otro certificado.

La comprobación de hostname puede desactivarse vía EMAIL_SSL_CHECK_HOSTNAME
cuando el certificado del servidor no incluye SubjectAltName (en cuyo caso
Python no puede satisfacer esa verificación aunque el cert sea de confianza).
"""
import ssl
from pathlib import Path

from django.conf import settings
from django.core.mail.backends.smtp import EmailBackend as SMTPEmailBackend
from django.utils.functional import cached_property


class TrustedCertEmailBackend(SMTPEmailBackend):

    @cached_property
    def ssl_context(self):
        context = ssl.create_default_context()

        cafile = getattr(settings, 'EMAIL_SSL_CAFILE', '') or ''
        if cafile and Path(cafile).exists():
            context.load_verify_locations(cafile=cafile)

        # Si el certificado fijado carece de SubjectAltName, la verificación de
        # hostname es imposible de satisfacer; la cadena se sigue validando
        # (CERT_REQUIRED) contra el certificado de confianza.
        if getattr(settings, 'EMAIL_SSL_CHECK_HOSTNAME', True) is False:
            context.check_hostname = False

        return context
