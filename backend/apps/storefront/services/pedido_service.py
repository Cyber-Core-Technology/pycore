import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction

from apps.storefront.models import PedidoStorefront, DetallePedido, ClienteStorefront
from apps.inventory.models import Producto

logger = logging.getLogger(__name__)


def _siguiente_numero(empresa) -> str:
    last = (
        PedidoStorefront.objects
        .filter(empresa=empresa)
        .order_by('-created_at')
        .values_list('numero_pedido', flat=True)
        .first()
    )
    if last:
        try:
            num = int(last.split('-')[1]) + 1
        except (IndexError, ValueError):
            num = 1
    else:
        num = 1
    return f'ORD-{num:05d}'


class PedidoService:

    @staticmethod
    def crear_pedido(
        cliente: ClienteStorefront,
        metodo_pago: str,
        detalles: list,        # [{'producto_id': uuid, 'cantidad': int}, ...]
        notas: str = '',
    ) -> PedidoStorefront:
        empresa = cliente.empresa

        ids = [d['producto_id'] for d in detalles]
        productos_map = {
            str(p.id): p
            for p in Producto.objects.filter(
                id__in=ids,
                empresa=empresa,
                activo=True,
                visibilidad_publica__in=['publico_sin_stock', 'publico_con_stock'],
            )
        }
        if len(productos_map) != len(ids):
            raise ValueError('Uno o más productos no están disponibles.')

        with transaction.atomic():
            numero   = _siguiente_numero(empresa)
            subtotal = Decimal('0')
            items    = []
            for d in detalles:
                prod  = productos_map[str(d['producto_id'])]
                cant  = int(d['cantidad'])
                if cant < 1:
                    raise ValueError(f'Cantidad inválida para {prod.nombre}.')
                precio = prod.precio_venta or Decimal('0')
                sub    = precio * cant
                subtotal += sub
                items.append({
                    'producto':         prod,
                    'nombre_snapshot':  prod.nombre,
                    'precio_snapshot':  precio,
                    'cantidad':         cant,
                    'subtotal':         sub,
                })

            estado_inicial = 'apartado' if metodo_pago == 'efectivo_en_tienda' else 'pendiente'

            pedido = PedidoStorefront.objects.create(
                empresa       = empresa,
                cliente       = cliente,
                numero_pedido = numero,
                metodo_pago   = metodo_pago,
                subtotal      = subtotal,
                total         = subtotal,
                notas_cliente = notas,
                estado        = estado_inicial,
            )

            DetallePedido.objects.bulk_create([
                DetallePedido(
                    pedido          = pedido,
                    producto        = it['producto'],
                    nombre_snapshot = it['nombre_snapshot'],
                    precio_snapshot = it['precio_snapshot'],
                    cantidad        = it['cantidad'],
                    subtotal        = it['subtotal'],
                )
                for it in items
            ])

            # Crear preferencia de Mercado Pago
            if metodo_pago == 'mercado_pago':
                checkout_url = PedidoService._crear_preferencia_mp(pedido, items, empresa)
                if checkout_url:
                    pedido.mp_checkout_url = checkout_url
                    pedido.save(update_fields=['mp_checkout_url'])

        return pedido

    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _crear_preferencia_mp(pedido, items, empresa) -> str:
        """Crea una preferencia en MP y retorna la URL de pago."""
        try:
            config = empresa.storefront_config
        except Exception:
            logger.warning('Sin storefront_config para empresa %s', empresa.id)
            return ''

        access_token = config.mp_access_token
        if not access_token:
            logger.warning('mp_access_token no configurado para empresa %s — pedido %s sin URL de pago', empresa.id, pedido.numero_pedido)
            return ''

        try:
            import mercadopago
            sdk = mercadopago.SDK(access_token)

            base_url = getattr(settings, 'STOREFRONT_BASE_URL', '')
            slug     = empresa.slug

            back_urls = {
                'success': f'{base_url}/p/{slug}?mp=success&pedido={pedido.numero_pedido}',
                'failure': f'{base_url}/p/{slug}?mp=failure&pedido={pedido.numero_pedido}',
                'pending': f'{base_url}/p/{slug}?mp=pending&pedido={pedido.numero_pedido}',
            }

            preference_data = {
                'items': [
                    {
                        'id':          str(it['producto'].id),
                        'title':       it['nombre_snapshot'],
                        'quantity':    it['cantidad'],
                        'unit_price':  float(it['precio_snapshot']),
                        'currency_id': 'MXN',
                    }
                    for it in items
                ],
                'external_reference': str(pedido.id),
                'back_urls': back_urls,
                'statement_descriptor': empresa.nombre[:22],
                'metadata': {
                    'pedido_id':    str(pedido.id),
                    'empresa_slug': slug,
                },
            }

            # auto_return solo funciona con HTTPS (producción); en localhost se omite
            if base_url.startswith('https://'):
                preference_data['auto_return'] = 'approved'

            result = sdk.preference().create(preference_data)
            if result['status'] == 201:
                pref = result['response']
                pedido.mp_preference_id = pref['id']
                pedido.save(update_fields=['mp_preference_id'])
                # sandbox_init_point en pruebas, init_point en producción
                return pref['sandbox_init_point'] if config.mp_mode == 'sandbox' else pref['init_point']
            else:
                logger.error('Error creando preferencia MP: %s', result)
                return ''
        except Exception as e:
            logger.error('Excepción al crear preferencia MP: %s', e)
            return ''

    @staticmethod
    def confirmar_pago_mp(pedido_id: str, payment_id: str, status_mp: str) -> PedidoStorefront | None:
        try:
            pedido = PedidoStorefront.objects.get(id=pedido_id, estado='pendiente')
        except PedidoStorefront.DoesNotExist:
            return None

        pedido.mp_payment_id = payment_id
        if status_mp == 'approved':
            pedido.estado = 'pagado'
        elif status_mp in ('pending', 'in_process'):
            pedido.estado = 'pendiente'
        else:
            pedido.estado = 'cancelado'
        pedido.save(update_fields=['mp_payment_id', 'estado'])

        # Crear venta ERP automáticamente al confirmar pago MP
        if pedido.estado == 'pagado':
            PedidoService.crear_venta_desde_pedido(pedido)

        return pedido

    @staticmethod
    def webhook_mp(data: dict) -> dict:
        """Procesa notificación IPN/webhook de Mercado Pago."""
        topic  = data.get('type') or data.get('topic', '')
        res_id = data.get('data', {}).get('id') or data.get('id')

        if topic == 'payment' and res_id:
            try:
                # Obtener el pedido para leer las credenciales del negocio
                pedido_id_meta = data.get('data', {}).get('pedido_id')
                # Usamos external_reference que guardamos como pedido.id
                # Primero hacemos el lookup con el access_token del pedido vía metadata
                # Para el webhook, MP no nos dice de qué empresa es directamente,
                # así que buscamos el pedido por mp_preference_id o consultamos el pago
                # usando el token de la empresa identificada por external_reference
                from apps.storefront.models import PedidoStorefront
                # Intentar encontrar el pedido por el id del pago registrado
                pedido = PedidoStorefront.objects.select_related(
                    'empresa__storefront_config'
                ).filter(mp_payment_id=str(res_id)).first()

                # Si no lo tenemos aún, tenemos que consultar con algún token —
                # buscamos pedidos pendientes que coincidan con algún preference_id
                if not pedido:
                    # El external_reference en MP es el pedido.id, buscar por eso
                    # requeriría hacer una llamada MP, pero no tenemos token aún.
                    # Buscamos el pedido_id en metadata si viene en el payload
                    ext_ref = data.get('external_reference') or (
                        data.get('data', {}).get('external_reference')
                    )
                    if ext_ref:
                        try:
                            pedido = PedidoStorefront.objects.select_related(
                                'empresa__storefront_config'
                            ).get(id=ext_ref)
                        except PedidoStorefront.DoesNotExist:
                            pass

                if pedido and hasattr(pedido.empresa, 'storefront_config'):
                    access_token = pedido.empresa.storefront_config.mp_access_token
                    if access_token:
                        import mercadopago
                        sdk     = mercadopago.SDK(access_token)
                        payment = sdk.payment().get(res_id)
                        if payment['status'] == 200:
                            p = payment['response']
                            pedido_id = (
                                p.get('metadata', {}).get('pedido_id')
                                or p.get('external_reference')
                            )
                            if pedido_id:
                                PedidoService.confirmar_pago_mp(pedido_id, str(res_id), p.get('status', ''))
            except Exception as e:
                logger.error('Error procesando webhook MP: %s', e)

        return {'received': True}

    @staticmethod
    def crear_venta_desde_pedido(pedido: PedidoStorefront, usuario=None) -> bool:
        """
        Convierte un PedidoStorefront en una Venta del ERP y descuenta inventario.
        Retorna True si se creó, False si ya existía o falló.
        """
        if pedido.venta_id:
            return False  # Ya tiene venta asociada

        empresa = pedido.empresa

        try:
            from apps.core.models import Sucursal
            from apps.auth_module.models import Usuario as UsuarioModel
            from apps.sales.services.venta_service import VentaService

            # Sucursal principal o primera activa
            sucursal = (
                Sucursal.objects.filter(empresa=empresa, es_principal=True, activo=True).first()
                or Sucursal.objects.filter(empresa=empresa, activo=True).first()
            )
            if not sucursal:
                logger.warning('No hay sucursal activa para empresa %s — no se pudo crear venta', empresa.id)
                return False

            # Usuario: el que procesa el pedido, o el primer admin de la empresa
            if usuario is None:
                usuario = (
                    UsuarioModel.objects.filter(empresa=empresa, is_staff=True, activo=True).first()
                    or UsuarioModel.objects.filter(empresa=empresa, activo=True).first()
                )
            if usuario is None:
                logger.warning('No hay usuario activo para empresa %s — no se pudo crear venta', empresa.id)
                return False

            # Mapeo de método de pago
            metodo_map = {
                'efectivo_en_tienda': 'efectivo',
                'mercado_pago':       'tarjeta_credito',
            }
            metodo_pago = metodo_map.get(pedido.metodo_pago, 'efectivo')

            items = [
                {
                    'id_producto':    detalle.producto_id,
                    'cantidad':       Decimal(str(detalle.cantidad)),
                    'precio_unitario': detalle.precio_snapshot,
                    'descuento':      Decimal('0'),
                }
                for detalle in pedido.detalles.select_related('producto').all()
            ]

            data = {
                'id_sucursal': sucursal.id_sucursal,
                'metodo_pago': metodo_pago,
                'notas':       f'Pedido storefront {pedido.numero_pedido}',
                'items':       items,
            }

            with transaction.atomic():
                service = VentaService(empresa=empresa, usuario=usuario)
                venta   = service.crear_venta(data)
                pedido.venta = venta
                pedido.save(update_fields=['venta'])

            logger.info('Venta %s creada desde pedido storefront %s', venta.folio, pedido.numero_pedido)
            return True

        except Exception as e:
            logger.error('Error creando venta desde pedido %s: %s', pedido.numero_pedido, e)
            return False

    @staticmethod
    def get_pedidos_cliente(cliente: ClienteStorefront):
        return (
            PedidoStorefront.objects
            .filter(cliente=cliente)
            .prefetch_related('detalles')
            .order_by('-created_at')
        )
