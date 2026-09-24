import logging

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.core.models.empresa import Empresa


class _Errores(logging.Handler):
    """Cuenta los errores que el handler de venta registra y se traga."""

    def __init__(self):
        super().__init__(level=logging.ERROR)
        self.mensajes = []

    def emit(self, record):
        self.mensajes.append(record.getMessage())


class Command(BaseCommand):
    """Registra la salida de inventario de ventas que se cobraron sin descontar stock.

    El handler de `venta.creada` corre después del commit y se traga sus
    errores: la venta queda hecha y el inventario sin tocar, y nada lo grita.
    Así pasó en sept-2026 cuando el folio de movimientos dejó de avanzar después
    del 9999. Esto vuelve a correr el mismo handler —combos, variantes,
    presentaciones y `permitir_venta_sin_stock` incluidos— para cada venta
    vigente que no tiene ninguna salida registrada.

    Una venta a la vez y todo o nada: si una línea falla, la venta entera se
    revierte y se reporta, para no dejarla a medias. Es idempotente: una venta
    que ya tiene salidas no se vuelve a tocar.

    Los movimientos llevan la fecha de hoy, no la de la venta: el kardex
    encadena `stock_antes`/`stock_despues`, y meterlos en el pasado dejaría esa
    cadena rota. El motivo dice de qué venta son y que son una reposición.
    """

    help = 'Repone las salidas de inventario de ventas que no descontaron stock.'

    def add_arguments(self, parser):
        parser.add_argument('--empresa', required=True, help='Id de la empresa.')
        parser.add_argument(
            '--desde', required=True,
            help='Fecha/hora ISO desde la que se revisan ventas (p. ej. 2026-09-22T20:00Z).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Sólo lista las ventas que repondría, sin escribir.',
        )

    def handle(self, *args, **opciones):
        from apps.inventory.events.handlers import OnVentaCreadaHandler
        from apps.inventory.models import MovimientoInventario
        from apps.sales.models import Venta
        from apps.sales.models.venta import ESTADOS_CONTABLES

        empresa = Empresa.objects.get(id_empresa=opciones['empresa'])
        ventas = Venta.objects.filter(
            empresa=empresa, created_at__gte=opciones['desde'],
            estado__in=ESTADOS_CONTABLES, deleted_at__isnull=True,
        ).order_by('created_at')
        con_salida = set(MovimientoInventario.objects.filter(
            empresa=empresa, tipo_referencia='venta',
        ).values_list('referencia_id', flat=True))

        logger = logging.getLogger('apps.inventory.events.handlers')
        handler = OnVentaCreadaHandler()
        repuestas, sin_inventario, fallidas = [], [], []

        for venta in ventas:
            if str(venta.id_venta) in con_salida:
                continue
            detalles = list(venta.detalles.select_related('producto', 'variante', 'presentacion'))
            if opciones['dry_run']:
                self.stdout.write(f'  {venta.folio}  {venta.created_at:%Y-%m-%d %H:%M}  {len(detalles)} líneas')
                repuestas.append(venta.folio)
                continue

            errores = _Errores()
            logger.addHandler(errores)
            try:
                with transaction.atomic():
                    handler.process(self._payload(venta, detalles))
                    if errores.mensajes:
                        raise RuntimeError('; '.join(errores.mensajes))
                    nuevos = MovimientoInventario.objects.filter(
                        empresa=empresa, tipo_referencia='venta',
                        referencia_id=str(venta.id_venta),
                    )
                    n = nuevos.count()
                    for mov in nuevos:
                        mov.motivo = f'{mov.motivo} (reposición)'
                        mov.save(update_fields=['motivo'])
            except Exception as e:
                fallidas.append(venta.folio)
                self.stderr.write(f'  ✗ {venta.folio}: {e}')
                continue
            finally:
                logger.removeHandler(errores)

            if n:
                repuestas.append(venta.folio)
                self.stdout.write(f'  ✓ {venta.folio}: {n} salidas')
            else:
                # Sólo servicios o productos sin inventario: no había nada que descontar.
                sin_inventario.append(venta.folio)

        verbo = 'se repondrían' if opciones['dry_run'] else 'repuestas'
        self.stdout.write(self.style.SUCCESS(f'{len(repuestas)} ventas {verbo}.'))
        if sin_inventario:
            self.stdout.write(f'{len(sin_inventario)} sin productos de inventario: {", ".join(sin_inventario)}')
        if fallidas:
            self.stdout.write(self.style.ERROR(f'{len(fallidas)} fallidas: {", ".join(fallidas)}'))

    @staticmethod
    def _payload(venta, detalles):
        # Lo mismo que arma VentaService al crear la venta: el handler no
        # necesita más que esto.
        return {
            'venta_id': venta.id_venta,
            'folio': venta.folio,
            'id_empresa': str(venta.empresa_id),
            'id_sucursal': str(venta.sucursal_id),
            'items': [
                {
                    'id_producto': str(d.producto_id),
                    'id_variante': str(d.variante.id) if d.variante else None,
                    'cantidad': float(d.cantidad),
                    'id_presentacion': str(d.presentacion_id) if d.presentacion_id else None,
                    'cantidad_presentacion': (
                        float(d.cantidad_presentacion)
                        if d.cantidad_presentacion is not None else None
                    ),
                }
                for d in detalles
            ],
        }
