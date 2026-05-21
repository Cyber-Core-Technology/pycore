"""
Genera un nuevo par de claves VAPID para Web Push.

Uso:
    docker compose exec backend python manage.py generate_vapid_keys

Copia la salida al archivo .env del proyecto.
"""
import base64

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Genera claves VAPID para Web Push Notifications'

    def handle(self, *args, **options):
        try:
            from cryptography.hazmat.primitives.asymmetric.ec import (
                generate_private_key, SECP256R1
            )
            from cryptography.hazmat.primitives.serialization import (
                Encoding, PublicFormat, PrivateFormat, NoEncryption
            )
        except ImportError:
            self.stderr.write(self.style.ERROR(
                'cryptography no disponible. Instala con: pip install cryptography'
            ))
            return

        private_key  = generate_private_key(SECP256R1())
        private_raw  = private_key.private_bytes(Encoding.Raw, PrivateFormat.Raw, NoEncryption())
        public_bytes = private_key.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)

        def b64u(b: bytes) -> str:
            return base64.urlsafe_b64encode(b).rstrip(b'=').decode()

        public_key_b64  = b64u(public_bytes)
        private_key_b64 = b64u(private_raw)

        self.stdout.write(self.style.SUCCESS('\n✅ Claves VAPID generadas — copia estas líneas en tu .env:\n'))
        self.stdout.write(f'VAPID_PUBLIC_KEY={public_key_b64}')
        self.stdout.write(f'VAPID_PRIVATE_KEY={private_key_b64}')
        self.stdout.write(f'VAPID_EMAIL=admin@tudominio.com\n')
        self.stdout.write(self.style.WARNING(
            '⚠  La clave pública también va en frontend/.env como VITE_VAPID_PUBLIC_KEY'
        ))
