import logging
import threading
from typing import Callable, Dict, List, Any

from django.db import transaction

logger = logging.getLogger(__name__)


class EventBus:
    """
    Bus de eventos de dominio, en memoria del proceso (los `subscribers` se
    registran vía `setup_*_event_handlers()` en el `ready()` de cada app —
    ocurre igual en el proceso web que en el worker de Celery, así que ambos
    conocen a todos los handlers).

    `publish()` NUNCA ejecuta handlers ni toca Redis en el hilo que llama —
    solo agenda la tarea Celery `events.procesar_evento` (ver tasks.py) y
    regresa. El procesamiento real ocurre en el worker, fuera del request.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self.subscribers: Dict[str, List[Callable]] = {}
        logger.info("EventBus inicializado")

    def publish(self, event_name: str, payload: Dict[str, Any]) -> bool:
        """
        Agenda el procesamiento de `event_name` en Celery.

        Se encola vía `transaction.on_commit()`: si `publish()` se llama
        dentro de un `atomic()` (el caso normal — se publica justo después
        de crear la fila que describe el evento), el worker no debe arrancar
        antes de que esa fila exista en su propia conexión. Fuera de una
        transacción, Django ejecuta el callback de inmediato, así que el
        comportamiento no cambia.
        """
        try:
            transaction.on_commit(lambda: self._encolar(event_name, payload))
            return True
        except Exception as e:
            logger.error(f"[EventBus] Error agendando {event_name}: {e}")
            return False

    def _encolar(self, event_name: str, payload: Dict[str, Any]) -> None:
        # Nunca debe romper el flujo principal: para cuando esto corre, la
        # transacción que originó el evento ya se confirmó (o nunca hubo
        # una), así que un fallo aquí solo puede ser el broker caído.
        from shared.events.tasks import procesar_evento
        try:
            procesar_evento.delay(event_name, payload)
            logger.info(f"[EventBus] Agendado: {event_name}")
        except Exception as e:
            logger.error(f"[EventBus] No se pudo agendar {event_name}: {e}")

    def procesar(self, event_name: str, payload: Dict[str, Any]) -> None:
        """
        Ejecuta de verdad los handlers suscritos a `event_name` y el puente
        a WebSockets. Solo debe invocarlo la tarea Celery `procesar_evento`
        — llamarlo desde una vista reintroduce el problema que esto arregla.
        """
        handlers = self.subscribers.get(event_name, [])
        logger.info(f"[EventBus] Procesando: {event_name} -> {len(handlers)} handlers")
        for handler in handlers:
            try:
                handler(payload)
            except Exception as e:
                logger.error(
                    f"[EventBus] Error en handler "
                    f"{getattr(handler, '__name__', repr(handler))} "
                    f"para {event_name}: {e}",
                    exc_info=True,
                )
                # No propagar — un handler secundario no debe romper el flujo principal
        self._bridge_to_websockets(event_name, payload)

    def emit_realtime(self, event_name: str, payload: Dict[str, Any]) -> None:
        """Envía un evento SOLO a los clientes WebSocket (grupos empresa +
        superadmin) sin invocar a los suscriptores del EventBus. Útil para
        empujar en tiempo real algo ya persistido (p.ej. logs de auditoría
        genéricos) evitando reprocesarlo. Igual que `publish()`, agenda y
        no toca Redis en el hilo que llama."""
        try:
            transaction.on_commit(lambda: self._encolar_ws(event_name, payload))
        except Exception as e:
            logger.warning(f"[EventBus] Error agendando push WS {event_name}: {e}")

    def _encolar_ws(self, event_name: str, payload: Dict[str, Any]) -> None:
        from shared.events.tasks import push_websocket
        try:
            push_websocket.delay(event_name, payload)
        except Exception as e:
            logger.warning(f"[EventBus] No se pudo agendar push WS {event_name}: {e}")

    def _bridge_to_websockets(self, event_name: str, payload: Dict[str, Any]) -> None:
        """Forward domain events to Channel Layer groups (tenant + superadmin global).
        Corre en el worker de Celery (ver tasks.py), nunca en el request."""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            if channel_layer is None:
                return

            message = {
                'type':    'domain_event',
                'event':   event_name,
                'payload': payload,
            }

            empresa_id = payload.get('empresa_id') or payload.get('id_empresa')
            if empresa_id:
                group_name = f"empresa_{str(empresa_id).replace('-', '_')}"[:100]
                async_to_sync(channel_layer.group_send)(group_name, message)

            # Superadmin recibe todos los eventos de todas las empresas
            async_to_sync(channel_layer.group_send)('superadmin_global', message)

        except Exception as e:
            # Bridge must never break the main event flow
            logger.warning(f"[EventBus] WS bridge error para {event_name}: {e}")

    def subscribe(self, event_name: str, handler: Callable) -> None:
        if event_name not in self.subscribers:
            self.subscribers[event_name] = []
        self.subscribers[event_name].append(handler)
        logger.info(
            f"[EventBus] Handler registrado: {getattr(handler, '__name__', repr(handler))} "
            f"-> {event_name} (total: {len(self.subscribers[event_name])})"
        )

    def get_stats(self) -> Dict:
        return {
            'handlers_registrados': {k: len(v) for k, v in self.subscribers.items()},
            'total_eventos': len(self.subscribers),
        }


event_bus = EventBus()
