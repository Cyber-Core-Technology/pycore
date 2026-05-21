import logging
from shared.events import event_bus, DomainEvents, BaseEventHandler

logger = logging.getLogger(__name__)


class OnVentaCreadaHandler(BaseEventHandler):
    """
    Escucha: venta.creada
    Acción: Si metodo_pago == 'credito', crea CxC automáticamente.
    """

    def process(self, payload: dict) -> None:
        if payload.get('metodo_pago') != 'credito':
            return

        from apps.core.models import Empresa
        from apps.sales.models import Venta
        from apps.finance.services.cxc_service import CxCService

        try:
            empresa = Empresa.objects.get(id_empresa=payload['id_empresa'])
            venta = Venta.objects.get(id=payload['venta_id'])
            service = CxCService(empresa=empresa)
            cxc = service.crear_desde_venta(venta)
            logger.info(f"[Finance] ✅ CxC creada desde venta {payload['folio']}: {cxc.folio}")
        except Exception as e:
            logger.error(f"[Finance] ❌ Error creando CxC desde venta {payload.get('folio')}: {e}")
            raise


class OnVentaCanceladaHandler(BaseEventHandler):
    """
    Escucha: venta.cancelada
    Acción: Cancela la CxC asociada a la venta si existe.
    """

    def process(self, payload: dict) -> None:
        from apps.core.models import Empresa
        from apps.finance.repositories import CxCRepository

        try:
            empresa = Empresa.objects.get(id_empresa=payload['id_empresa'])
            repo = CxCRepository()
            cxc = repo.get_by_venta(payload['venta_id'], empresa)
            if not cxc:
                logger.info(f"[Finance] Sin CxC para venta cancelada {payload.get('folio')}")
                return
            from apps.finance.services.cxc_service import CxCService
            service = CxCService(empresa=empresa)
            service.cancelar(cxc.id)
            logger.info(f"[Finance] ✅ CxC cancelada por venta cancelada {payload.get('folio')}")
        except Exception as e:
            logger.error(f"[Finance] ❌ Error cancelando CxC: {e}")
            raise


class OnCompraRecibidaHandler(BaseEventHandler):
    """
    Escucha: compra.recibida
    Acción: Crea CxP automáticamente.
    """

    def process(self, payload: dict) -> None:
        from apps.core.models import Empresa
        from apps.purchases.models import Compra
        from apps.finance.services.cxp_service import CxPService

        try:
            empresa = Empresa.objects.get(id_empresa=payload['id_empresa'])
            compra = Compra.objects.get(id=payload['compra_id'])
            service = CxPService(empresa=empresa)
            cxp = service.crear_desde_compra(compra)
            logger.info(f"[Finance] ✅ CxP creada desde compra {payload['folio']}: {cxp.folio}")
        except Exception as e:
            logger.error(f"[Finance] ❌ Error creando CxP desde compra {payload.get('folio')}: {e}")
            raise


class OnCompraCanceladaHandler(BaseEventHandler):
    """
    Escucha: compra.cancelada
    Acción: Cancela la CxP asociada si existe.
    """

    def process(self, payload: dict) -> None:
        from apps.core.models import Empresa
        from apps.finance.repositories import CxPRepository

        try:
            empresa = Empresa.objects.get(id_empresa=payload['id_empresa'])
            repo = CxPRepository()
            cxp = repo.get_by_compra(payload['compra_id'], empresa)
            if not cxp:
                logger.info(f"[Finance] Sin CxP para compra cancelada {payload.get('folio')}")
                return
            from apps.finance.services.cxp_service import CxPService
            service = CxPService(empresa=empresa)
            service.cancelar(cxp.id)
            logger.info(f"[Finance] ✅ CxP cancelada por compra cancelada {payload.get('folio')}")
        except Exception as e:
            logger.error(f"[Finance] ❌ Error cancelando CxP: {e}")
            raise


def setup_finance_event_handlers():
    """Registra todos los handlers de finance en el event bus."""
    event_bus.subscribe(DomainEvents.VENTA_CREADA,    OnVentaCreadaHandler().handle)
    event_bus.subscribe(DomainEvents.VENTA_CANCELADA, OnVentaCanceladaHandler().handle)
    event_bus.subscribe(DomainEvents.COMPRA_RECIBIDA, OnCompraRecibidaHandler().handle)
    event_bus.subscribe(DomainEvents.COMPRA_CANCELADA, OnCompraCanceladaHandler().handle)
    logger.info("✅ Finance event handlers configurados")
