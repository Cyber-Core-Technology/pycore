# apps/shared/events/tasks.py
"""
Tareas Celery que ejecutan el EventBus fuera del proceso que atiende la
petición HTTP.

`EventBus.publish()` / `emit_realtime()` ya no corren handlers ni hablan con
Redis en el hilo del request — solo agendan aquí y regresan de inmediato.
Antes corrían en línea: un fan-out de ~90 eventos disparado por un solo
request (aplicar un conteo físico) ejecutaba ~90 handlers síncronos —cada
uno con sus propias escrituras a la BD— más ~180 llamadas bloqueantes a
Redis, todo dentro de la misma petición HTTP. Con las peticiones así de
lentas, el cliente reintentaba, y cada intento abandonado dejaba su conexión
a Postgres huérfana. Repetido lo suficiente, agotó max_connections y tumbó
el login para todos (incidente 2026-09-14).
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name='events.procesar_evento', ignore_result=True)
def procesar_evento(event_name: str, payload: dict) -> None:
    """Ejecuta los handlers suscritos a `event_name` y, al terminar, empuja
    el evento a los grupos de WebSocket correspondientes. Agendada por
    `EventBus.publish()` — nunca se llama directamente desde una vista."""
    from shared.events.event_bus import event_bus
    event_bus.procesar(event_name, payload)


@shared_task(name='events.push_websocket', ignore_result=True)
def push_websocket(event_name: str, payload: dict) -> None:
    """Empuja un evento directo a WebSocket sin pasar por los handlers del
    EventBus. Agendada por `EventBus.emit_realtime()`."""
    from shared.events.event_bus import event_bus
    event_bus._bridge_to_websockets(event_name, payload)
