import json
import logging
import threading
from typing import Callable, Dict, List, Any

import redis
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class EventBus:
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
        self._redis_client = None
        self._async_mode = getattr(settings, 'EVENTBUS_ASYNC', False)
        logger.info(f"EventBus inicializado (modo: {'async/Redis' if self._async_mode else 'sincrono'})")

    @property
    def redis_client(self):
        if self._redis_client is None:
            self._redis_client = redis.Redis(
                host=getattr(settings, 'REDIS_HOST', 'redis'),
                port=getattr(settings, 'REDIS_PORT', 6379),
                db=getattr(settings, 'REDIS_EVENTS_DB', 3),
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                health_check_interval=30,
            )
        return self._redis_client

    def publish(self, event_name: str, payload: Dict[str, Any]) -> bool:
        try:
            if self._async_mode:
                return self._publish_redis(event_name, payload)
            else:
                return self._publish_sync(event_name, payload)
        except Exception as e:
            logger.error(f"[EventBus] Error inesperado publicando {event_name}: {e}")
            return False

    def _publish_sync(self, event_name: str, payload: Dict[str, Any]) -> bool:
        handlers = self.subscribers.get(event_name, [])
        logger.info(f"[EventBus] Publicado (sync): {event_name} -> {len(handlers)} handlers")
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
        return True

    def _publish_redis(self, event_name: str, payload: Dict[str, Any]) -> bool:
        try:
            event_data = {
                'event_name': event_name,
                'payload': payload,
                'timestamp': timezone.now().isoformat(),
                'version': '1.0',
            }
            channel = f'events:{event_name}'
            count = self.redis_client.publish(channel, json.dumps(event_data, default=str))
            logger.info(f"[EventBus] Publicado (Redis): {event_name} -> {count} suscriptores")
            self._bridge_to_websockets(event_name, payload)
            return True
        except redis.RedisError as e:
            logger.error(f"[EventBus] Redis error publicando {event_name}: {e}")
            return False

    def emit_realtime(self, event_name: str, payload: Dict[str, Any]) -> None:
        """Envía un evento SOLO a los clientes WebSocket (grupos empresa +
        superadmin) sin invocar a los suscriptores del EventBus. Útil para
        empujar en tiempo real algo ya persistido (p.ej. logs de auditoría
        genéricos) evitando reprocesarlo."""
        self._bridge_to_websockets(event_name, payload)

    def _bridge_to_websockets(self, event_name: str, payload: Dict[str, Any]) -> None:
        """Forward domain events to Channel Layer groups (tenant + superadmin global)."""
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

    def start_listening(self) -> None:
        if not self._async_mode:
            logger.warning("[EventBus] start_listening() ignorado — modo sincrono activo")
            return
        if not self.subscribers:
            logger.warning("[EventBus] No hay handlers registrados — listener detenido")
            return
        logger.info(f"[EventBus] Iniciando listener Redis en {len(self.subscribers)} canales...")
        try:
            pubsub = self.redis_client.pubsub()
            channels = [f'events:{name}' for name in self.subscribers.keys()]
            pubsub.subscribe(*channels)
            for message in pubsub.listen():
                if message['type'] == 'message':
                    self._handle_message(message)
        except redis.RedisError as e:
            logger.error(f"[EventBus] Redis error en listener: {e}")
        except KeyboardInterrupt:
            logger.info("[EventBus] Listener detenido")

    def _handle_message(self, message: Dict) -> None:
        try:
            event_data = json.loads(message['data'])
            event_name = event_data['event_name']
            payload = event_data['payload']
            for handler in self.subscribers.get(event_name, []):
                try:
                    handler(payload)
                except Exception as e:
                    logger.error(
                        f"[EventBus] Error en handler "
                        f"{getattr(handler, '__name__', repr(handler))} "
                        f"para {event_name}: {e}",
                        exc_info=True,
                    )
        except Exception as e:
            logger.error(f"[EventBus] Error procesando mensaje: {e}", exc_info=True)

    def health_check(self) -> bool:
        try:
            return self.redis_client.ping()
        except Exception:
            return False

    def get_stats(self) -> Dict:
        return {
            'handlers_registrados': {k: len(v) for k, v in self.subscribers.items()},
            'total_eventos': len(self.subscribers),
            'redis_ok': self.health_check(),
            'modo': 'async' if self._async_mode else 'sync',
        }


event_bus = EventBus()
