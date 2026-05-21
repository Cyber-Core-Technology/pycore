import logging
from datetime import timedelta
from django.db import transaction
from django.utils import timezone

from apps.finance.repositories import CxCRepository
from apps.finance.exceptions import CxCNotFoundException, CxCCanceladaException, CxCYaExisteException
from apps.finance.events import publicar_cxc_creada, publicar_cxc_cancelada

logger = logging.getLogger(__name__)


class CxCService:

    def __init__(self, empresa, usuario=None):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = CxCRepository()

    def _generar_folio(self) -> str:
        prefijo = f"CXC-{timezone.now().strftime('%Y%m')}-"
        ultimo = self.repo.get_ultimo_folio(self.empresa)
        if ultimo and ultimo.startswith(prefijo):
            try:
                ultimo_num = int(ultimo.split('-')[-1])
            except ValueError:
                ultimo_num = 0
        else:
            ultimo_num = 0
        return f"{prefijo}{ultimo_num + 1:04d}"

    def listar(self, filters: dict = None):
        return self.repo.list_by_empresa(self.empresa, filters)

    def obtener(self, id_cxc: int):
        cxc = self.repo.get_by_id(id_cxc, self.empresa)
        if not cxc:
            raise CxCNotFoundException()
        return cxc

    @transaction.atomic
    def crear_desde_venta(self, venta) -> object:
        """
        Crea CxC automáticamente a partir de una venta a crédito.
        Llamado desde el endpoint manual o el event handler.
        """
        existing = self.repo.get_by_venta(venta.pk, self.empresa)
        if existing:
            raise CxCYaExisteException()

        from apps.terceros.models import Cliente
        cliente = venta.cliente

        fecha_vencimiento = (
            venta.fecha_vencimiento or
            timezone.now().date() + timedelta(days=cliente.dias_credito or 30)
        )

        cxc = self.repo.create(
            empresa=self.empresa,
            folio=self._generar_folio(),
            cliente=cliente,
            venta=venta,
            monto_original=venta.total,
            saldo_pendiente=venta.total,
            fecha_vencimiento=fecha_vencimiento,
            estado='pendiente',
            created_by=self.usuario,
        )

        publicar_cxc_creada(cxc)
        logger.info(f"✅ CxC creada: {cxc.folio} — ${cxc.monto_original}")
        return cxc

    @transaction.atomic
    def cancelar(self, id_cxc: int) -> object:
        cxc = self.obtener(id_cxc)
        if cxc.estado == 'cancelada':
            raise CxCCanceladaException()
        cxc.estado = 'cancelada'
        self.repo.save(cxc)
        publicar_cxc_cancelada(cxc)
        logger.info(f"✅ CxC cancelada: {cxc.folio}")
        return cxc

    def actualizar_estados_vencidos(self):
        """Actualiza a 'vencida' las CxC que pasaron su fecha_vencimiento."""
        from django.utils import timezone
        vencidas = self.repo.list_by_empresa(
            self.empresa,
            {'vencidas': True}
        ).filter(estado__in=['pendiente', 'pagada_parcial'])
        count = vencidas.update(estado='vencida')
        logger.info(f"✅ {count} CxC marcadas como vencidas")
        return count
