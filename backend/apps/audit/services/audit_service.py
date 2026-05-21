import logging
from apps.audit.repositories import LogAuditoriaRepository

logger = logging.getLogger(__name__)


class AuditService:

    def __init__(self):
        self.repo = LogAuditoriaRepository()

    def registrar(self, accion: str, payload: dict,
                  id_empresa=None, id_usuario=None,
                  usuario_email='', tabla='', id_registro='',
                  ip_address=None) -> None:
        try:
            kwargs = dict(
                accion=accion,
                payload=payload,
                empresa_id=id_empresa or payload.get('id_empresa'),
                usuario_id=id_usuario or payload.get('usuario_id'),
                usuario_email=usuario_email or payload.get('usuario_email', payload.get('email', '')),
                tabla=tabla,
                id_registro=str(id_registro) if id_registro else '',
            )
            resolved_ip = ip_address or payload.get('ip_address')
            if resolved_ip:
                kwargs['ip_address'] = resolved_ip
            if payload.get('user_agent'):
                kwargs['user_agent'] = payload['user_agent']

            self.repo.create(**kwargs)
        except Exception as e:
            # Audit nunca debe romper el flujo del sistema
            logger.error(f"[Audit] ❌ Error registrando log {accion}: {e}")

    def listar(self, id_empresa, filters: dict = None):
        return self.repo.list_by_empresa(id_empresa, filters)

    def listar_all(self, filters: dict = None):
        return self.repo.list_all(filters)
