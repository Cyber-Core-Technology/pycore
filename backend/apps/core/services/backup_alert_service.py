"""
Avisos por correo sobre el estado del backup de la base de datos.

Un backup que falla en silencio es peor que no tener backup: da confianza
falsa. Estos avisos son best-effort — nunca hacen fallar a la tarea que los
invoca, solo dejan rastro en el log si el correo no sale.
"""
import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils import timezone

logger = logging.getLogger(__name__)


class BackupAlertService:

    @staticmethod
    def _enviar(asunto: str, cuerpo: str) -> bool:
        destino = getattr(settings, 'BACKUP_ALERT_EMAIL', '') \
            or getattr(settings, 'SUPPORT_EMAIL', '') \
            or settings.DEFAULT_FROM_EMAIL

        # El entorno va en el asunto: una alerta de desarrollo no debe
        # confundirse con una caída del respaldo de producción.
        entorno = getattr(settings, 'ENVIRONMENT', 'development')
        etiqueta = '' if entorno == 'production' else f'[{entorno.upper()}] '

        pie = (
            f'\n\n—\nPyCore SGC · entorno: {entorno} · '
            f'{timezone.localtime().strftime("%d/%m/%Y %H:%M")} '
            f'(hora de México)\nTarea: core.backup_db\n'
        )

        try:
            msg = EmailMultiAlternatives(
                subject=etiqueta + asunto,
                body=cuerpo + pie,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[destino],
            )
            msg.send()
            logger.info('[BACKUP] Alerta enviada a %s: %s', destino, asunto)
            return True
        except Exception as exc:
            logger.error('[BACKUP] No se pudo enviar la alerta "%s": %s', asunto, exc)
            return False

    @staticmethod
    def alertar_fallo(error: str, intentos: int) -> bool:
        """El backup falló y ya agotó los reintentos: hoy no hay respaldo."""
        return BackupAlertService._enviar(
            asunto='🔴 [PyCore] El backup de la base de datos FALLÓ',
            cuerpo=(
                f'El backup diario falló tras {intentos} intento(s) y no se subió '
                f'ningún archivo a S3.\n\n'
                f'No hay respaldo del día de hoy.\n\n'
                f'Error:\n{error}\n\n'
                f'Revisar:\n'
                f'  docker compose logs celery_worker | grep BACKUP\n'
            ),
        )

    @staticmethod
    def alertar_tamano_sospechoso(
        key: str, tamano_kb: int, tamano_previo_kb: int,
        fecha_previa: str, caida_pct: int,
    ) -> bool:
        """
        El backup se subió pero encogió bruscamente respecto al anterior.
        Suele indicar un dump parcial o que se respaldó la base equivocada.
        """
        return BackupAlertService._enviar(
            asunto='🟠 [PyCore] El backup encogió de forma sospechosa',
            cuerpo=(
                f'El backup se subió correctamente, pero es {caida_pct}% más '
                f'pequeño que el anterior.\n\n'
                f'  Backup de hoy:    {tamano_kb} KB  ({key})\n'
                f'  Backup anterior:  {tamano_previo_kb} KB  ({fecha_previa})\n\n'
                f'Puede ser legítimo (se purgaron logs de auditoría, se dio de baja '
                f'un tenant) o puede ser un dump incompleto.\n\n'
                f'Para confirmar que el respaldo sirve:\n'
                f'  docker compose exec backend python manage.py verificar_backup\n'
            ),
        )

    @staticmethod
    def alertar_sin_backup_previo(dias: int) -> bool:
        """No hay ningún backup en los últimos N días con el cual comparar."""
        return BackupAlertService._enviar(
            asunto='🟠 [PyCore] No se encontraron backups previos en S3',
            cuerpo=(
                f'El backup de hoy se subió, pero no existe ningún backup en los '
                f'{dias} días anteriores para comparar.\n\n'
                f'Si el sistema lleva más de {dias} días en operación, significa que '
                f'la tarea no se está ejecutando a diario o que la política de '
                f'retención de S3 está borrando de más.\n'
            ),
        )
