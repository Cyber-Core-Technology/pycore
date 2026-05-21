import json
import uuid
from decimal import Decimal
from apps.audit.models import LogAuditoria


def _serialize_payload(obj):
    """Convierte tipos no serializables a string para JSONField."""
    if isinstance(obj, uuid.UUID):
        return str(obj)
    if isinstance(obj, Decimal):
        return float(obj)
    return str(obj)


def _clean_payload(payload: dict) -> dict:
    """Serializa y deserializa para limpiar UUIDs y Decimals del payload."""
    return json.loads(json.dumps(payload, default=_serialize_payload))


class LogAuditoriaRepository:
    def create(self, **kwargs) -> LogAuditoria:
        if 'payload' in kwargs and isinstance(kwargs['payload'], dict):
            kwargs['payload'] = _clean_payload(kwargs['payload'])
        return LogAuditoria.objects.create(**kwargs)

    def _apply_filters(self, qs, filters: dict):
        if filters.get('accion'):
            qs = qs.filter(accion=filters['accion'])
        if filters.get('tabla'):
            qs = qs.filter(tabla__icontains=filters['tabla'])
        if filters.get('id_registro'):
            qs = qs.filter(id_registro=filters['id_registro'])
        if filters.get('id_usuario'):
            qs = qs.filter(usuario_id=filters['id_usuario'])
        if filters.get('usuario_email'):
            qs = qs.filter(usuario_email__icontains=filters['usuario_email'])
        if filters.get('fecha_desde'):
            qs = qs.filter(created_at__date__gte=filters['fecha_desde'])
        if filters.get('fecha_hasta'):
            qs = qs.filter(created_at__date__lte=filters['fecha_hasta'])
        return qs

    def list_by_empresa(self, id_empresa, filters: dict = None):
        qs = LogAuditoria.objects.select_related('empresa').filter(empresa_id=id_empresa)
        return self._apply_filters(qs, filters or {})

    def list_all(self, filters: dict = None):
        qs = LogAuditoria.objects.select_related('empresa').all()
        return self._apply_filters(qs, filters or {})
