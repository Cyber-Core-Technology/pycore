import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

RETENTION_DAYS = 15


@shared_task(name='audit.limpiar_logs_antiguos')
def limpiar_logs_antiguos():
    """Elimina logs de auditoría con más de RETENTION_DAYS días."""
    from apps.audit.models import LogAuditoria
    corte = timezone.now() - timedelta(days=RETENTION_DAYS)
    deleted, _ = LogAuditoria.objects.filter(created_at__lt=corte).delete()
    logger.info(f"[Audit] 🗑️ Limpieza: {deleted} logs eliminados (> {RETENTION_DAYS} días)")
    return deleted
