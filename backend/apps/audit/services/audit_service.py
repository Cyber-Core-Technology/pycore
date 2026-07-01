import logging
from apps.audit.repositories import LogAuditoriaRepository

logger = logging.getLogger(__name__)


class AuditService:

    def __init__(self):
        self.repo = LogAuditoriaRepository()

    def registrar(self, accion: str, payload: dict,
                  id_empresa=None, id_usuario=None,
                  usuario_email='', tabla='', id_registro='',
                  ip_address=None, datos_nuevos=None,
                  datos_anteriores=None, user_agent='') -> None:
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
            resolved_ua = user_agent or payload.get('user_agent')
            if resolved_ua:
                kwargs['user_agent'] = resolved_ua
            if datos_nuevos is not None:
                kwargs['datos_nuevos'] = datos_nuevos
            if datos_anteriores is not None:
                kwargs['datos_anteriores'] = datos_anteriores

            self.repo.create(**kwargs)
        except Exception as e:
            # Audit nunca debe romper el flujo del sistema
            logger.error(f"[Audit] ❌ Error registrando log {accion}: {e}")

    def listar(self, id_empresa, filters: dict = None):
        return self.repo.list_by_empresa(id_empresa, filters)

    def listar_all(self, filters: dict = None):
        return self.repo.list_all(filters)
