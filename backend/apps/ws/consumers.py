"""
EmpresaConsumer — Authenticated WebSocket consumer scoped per tenant.

Groups joined on connect:
  - empresa_<empresa_id>          ← receives all domain events for this tenant
  - usuario_<user_id>             ← receives events targeted at this user
  - sucursal_<sucursal_id>        ← optional, receives branch-level events
  - superadmin_global             ← staff users only, receives ALL domain events

Client → Server messages:
  {"type": "ping"}  → replies {"type": "pong"}

Server → Client push (via channel layer):
  {"type": "domain_event", "event": "<nombre>", "payload": {...}}
"""
import json
import logging
from datetime import datetime

from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)

SUPERADMIN_GROUP = 'superadmin_global'


def _safe_group_name(prefix: str, uid: str) -> str:
    """Channel layer group names must be alphanumeric+hyphens, max 100 chars."""
    return f"{prefix}_{str(uid).replace('-', '_')}"[:100]


class EmpresaConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get('user')
        empresa_id = self.scope.get('empresa_id')

        if not user or isinstance(user, AnonymousUser):
            logger.warning('[WS] Conexión rechazada — sin autenticación válida')
            await self.accept()
            await self.close(code=4001)
            return

        is_staff = getattr(user, 'is_staff', False)

        # Usuarios normales requieren empresa_id; el superadmin no
        if not empresa_id and not is_staff:
            logger.warning('[WS] Conexión rechazada — sin empresa_id ni permisos de staff')
            await self.accept()
            await self.close(code=4001)
            return

        self.empresa_id  = empresa_id
        self.user_id     = str(user.pk)
        self.sucursal_id = self.scope.get('sucursal_id')
        self.is_staff    = is_staff

        self.group_usuario = _safe_group_name('usuario', self.user_id)
        await self.channel_layer.group_add(self.group_usuario, self.channel_name)

        if empresa_id:
            self.group_empresa = _safe_group_name('empresa', empresa_id)
            await self.channel_layer.group_add(self.group_empresa, self.channel_name)
        else:
            self.group_empresa = None

        if is_staff:
            await self.channel_layer.group_add(SUPERADMIN_GROUP, self.channel_name)

        if self.sucursal_id and self.group_empresa:
            self.group_sucursal = _safe_group_name('sucursal', self.sucursal_id)
            await self.channel_layer.group_add(self.group_sucursal, self.channel_name)
        else:
            self.group_sucursal = None

        await self.accept()

        await self.send(text_data=json.dumps({
            'type': 'connected',
            'empresa_id': self.empresa_id,
            'user_id':    self.user_id,
            'is_staff':   self.is_staff,
            'ts':         datetime.utcnow().isoformat(),
        }))

        logger.info(
            f'[WS] Conectado: user={self.user_id} empresa={self.empresa_id} '
            f'sucursal={self.sucursal_id} staff={is_staff} channel={self.channel_name}'
        )

    async def disconnect(self, close_code):
        if not hasattr(self, 'user_id'):
            return

        await self.channel_layer.group_discard(self.group_usuario, self.channel_name)

        if self.group_empresa:
            await self.channel_layer.group_discard(self.group_empresa, self.channel_name)

        if self.group_sucursal:
            await self.channel_layer.group_discard(self.group_sucursal, self.channel_name)

        if getattr(self, 'is_staff', False):
            await self.channel_layer.group_discard(SUPERADMIN_GROUP, self.channel_name)

        logger.info(
            f'[WS] Desconectado: user={self.user_id} empresa={self.empresa_id} code={close_code}'
        )

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return
        try:
            msg = json.loads(text_data)
        except json.JSONDecodeError:
            return

        if msg.get('type') == 'ping':
            await self.send(text_data=json.dumps({
                'type': 'pong',
                'ts':   datetime.utcnow().isoformat(),
            }))

    # ──────────────────────────────────────────────
    # Handlers for messages sent via channel layer
    # ──────────────────────────────────────────────

    async def domain_event(self, event):
        """Forward a domain event from the EventBus bridge to this WS client."""
        await self.send(text_data=json.dumps({
            'type':    'event',
            'event':   event.get('event'),
            'payload': event.get('payload', {}),
            'ts':      datetime.utcnow().isoformat(),
        }))
