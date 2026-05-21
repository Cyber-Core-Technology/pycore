import threading

_local = threading.local()


def set_request_context(ip_address: str = '', user_id: str = '', user_email: str = '') -> None:
    _local.ip_address  = ip_address
    _local.user_id     = user_id
    _local.user_email  = user_email


def get_request_context() -> dict:
    return {
        'ip_address':  getattr(_local, 'ip_address',  ''),
        'user_id':     getattr(_local, 'user_id',     ''),
        'user_email':  getattr(_local, 'user_email',  ''),
    }


def clear_request_context() -> None:
    _local.ip_address  = ''
    _local.user_id     = ''
    _local.user_email  = ''
