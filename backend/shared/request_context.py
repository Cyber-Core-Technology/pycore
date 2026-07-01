import threading

_local = threading.local()


def set_request_context(ip_address: str = '', user_id: str = '',
                        user_email: str = '', empresa_id: str = '') -> None:
    _local.ip_address  = ip_address
    _local.user_id     = user_id
    _local.user_email  = user_email
    _local.empresa_id  = empresa_id
    _local.audit_count = 0


def get_request_context() -> dict:
    return {
        'ip_address':  getattr(_local, 'ip_address',  ''),
        'user_id':     getattr(_local, 'user_id',     ''),
        'user_email':  getattr(_local, 'user_email',  ''),
        'empresa_id':  getattr(_local, 'empresa_id',  ''),
    }


def mark_audited() -> None:
    """Marca que la request actual ya generó al menos un log de auditoría
    (vía evento de dominio), para que el middleware genérico no la duplique."""
    _local.audit_count = getattr(_local, 'audit_count', 0) + 1


def was_audited() -> bool:
    return getattr(_local, 'audit_count', 0) > 0


def clear_request_context() -> None:
    _local.ip_address  = ''
    _local.user_id     = ''
    _local.user_email  = ''
    _local.empresa_id  = ''
    _local.audit_count = 0
