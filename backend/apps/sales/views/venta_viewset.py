import logging
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet

from apps.sales.services import VentaService
from apps.sales.serializers import (
    VentaSerializer, VentaLightSerializer,
    CrearVentaRequestSerializer, CancelarVentaRequestSerializer,
)
from apps.sales.exceptions import SalesException

logger = logging.getLogger(__name__)


class VentaViewSet(ViewSet):
    """
    GET    /sales/ventas/                      → listar
    POST   /sales/ventas/                      → crear
    GET    /sales/ventas/{id}/                 → detalle
    POST   /sales/ventas/{id}/cancelar/        → cancelar
    GET    /sales/ventas/{id}/devoluciones/    → devoluciones de esta venta
    """

    permission_classes = [IsAuthenticated]

    def _service(self, request) -> VentaService:
        return VentaService(empresa=request.user.empresa, usuario=request.user)

    def _error(self, exc: SalesException) -> Response:
        return Response({'error': exc.message}, status=exc.status_code)

    def list(self, request):
        filters = {k: v for k, v in {
            'estado': request.query_params.get('estado'),
            'cliente': request.query_params.get('id_cliente'),
            'sucursal': request.query_params.get('id_sucursal'),
            'metodo_pago': request.query_params.get('metodo_pago'),
            'fecha_desde': request.query_params.get('fecha_desde'),
            'fecha_hasta': request.query_params.get('fecha_hasta'),
        }.items() if v}
        ventas = self._service(request).listar_ventas(filters)
        return Response(VentaLightSerializer(ventas, many=True).data)

    def create(self, request):
        ser = CrearVentaRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            venta = self._service(request).crear_venta(ser.validated_data)
            return Response(VentaSerializer(venta).data, status=status.HTTP_201_CREATED)
        except SalesException as e:
            return self._error(e)

    def retrieve(self, request, pk=None):
        try:
            venta = self._service(request).obtener_venta(int(pk))
            return Response(VentaSerializer(venta).data)
        except SalesException as e:
            return self._error(e)

    @action(detail=True, methods=['post'], url_path='cancelar')
    def cancelar(self, request, pk=None):
        ser = CancelarVentaRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            venta = self._service(request).cancelar_venta(
                int(pk), motivo=ser.validated_data.get('motivo', '')
            )
            return Response(VentaSerializer(venta).data)
        except SalesException as e:
            return self._error(e)

    @action(detail=True, methods=['get'], url_path='devoluciones')
    def devoluciones(self, request, pk=None):
        """GET /sales/ventas/{id}/devoluciones/ — devoluciones de una venta."""
        try:
            from apps.sales.services import DevolucionService
            from apps.sales.serializers import DevolucionSerializer
            venta = self._service(request).obtener_venta(int(pk))
            devs = DevolucionService(
                empresa=request.user.empresa,
                usuario=request.user,
            ).listar_devoluciones({'id_venta': venta.id_venta})
            return Response(DevolucionSerializer(devs, many=True).data)
        except SalesException as e:
            return self._error(e)
        
    @action(detail=False, methods=['get'], url_path='reportes')
    def reportes(self, request):
        """
        GET /sales/ventas/reportes/
        Params: fecha_desde, fecha_hasta, id_sucursal
        """
        from apps.sales.models import Venta
        from django.db.models import Sum, Count, Avg, F
        from django.db.models.functions import TruncDate

        empresa  = request.user.empresa
        filtros  = {}

        fecha_desde  = request.query_params.get('fecha_desde')
        fecha_hasta  = request.query_params.get('fecha_hasta')
        id_sucursal  = request.query_params.get('id_sucursal')

        qs = Venta.objects.filter(empresa=empresa, estado__in=['activo', 'pagado'])

        if fecha_desde:
            qs = qs.filter(fecha_venta__date__gte=fecha_desde)
        if fecha_hasta:
            qs = qs.filter(fecha_venta__date__lte=fecha_hasta)
        if id_sucursal:
            qs = qs.filter(sucursal=id_sucursal)

        # ── KPIs generales ──────────────────────────────────────────────────
        kpis = qs.aggregate(
            total_ventas    = Sum('total'),
            num_ventas      = Count('id_venta'),
            ticket_promedio = Avg('total'),
        )

        # ── Ventas por día ──────────────────────────────────────────────────
        por_dia = list(
            qs.annotate(dia=TruncDate('fecha_venta'))
              .values('dia')
              .annotate(total=Sum('total'), cantidad=Count('id_venta'))
              .order_by('dia')
        )
        ventas_por_dia = [
            {
                'dia': str(d['dia']),
                'total': float(d['total'] or 0),
                'cantidad': d['cantidad'],
            }
            for d in por_dia
        ]

        # ── Ticket promedio por día ─────────────────────────────────────────
        ticket_por_dia = [
            {
                'dia': str(d['dia']),
                'promedio': round(float(d['total'] or 0) / d['cantidad'], 2) if d['cantidad'] else 0,
            }
            for d in por_dia
        ]

        # ── Por método de pago ──────────────────────────────────────────────
        por_metodo = list(
            qs.values('metodo_pago')
              .annotate(total=Sum('total'), cantidad=Count('id_venta'))
              .order_by('-total')
        )
        ventas_por_metodo = [
            {
                'metodo': m['metodo_pago'],
                'total': float(m['total'] or 0),
                'cantidad': m['cantidad'],
            }
            for m in por_metodo
        ]

        # ── Top productos ───────────────────────────────────────────────────
        from apps.sales.models import DetalleVenta
        top_productos = list(
            DetalleVenta.objects
              .filter(venta__in=qs)
              .values('producto__nombre')
              .annotate(
                  total    = Sum(F('precio_unitario') * F('cantidad')),
                  cantidad = Sum('cantidad'),
              )
              .order_by('-total')[:10]
        )
        top_productos_data = [
            {
                'nombre':   p['producto__nombre'],
                'total':    float(p['total'] or 0),
                'cantidad': float(p['cantidad'] or 0),
            }
            for p in top_productos
        ]

        # ── Top clientes ────────────────────────────────────────────────────
        top_clientes = list(
            qs.filter(cliente__isnull=False)
              .values('cliente__razon_social')
              .annotate(total=Sum('total'), cantidad=Count('id_venta'))
              .order_by('-total')[:10]
        )
        top_clientes_data = [
            {
                'nombre':   c['cliente__razon_social'],
                'total':    float(c['total'] or 0),
                'cantidad': c['cantidad'],
            }
            for c in top_clientes
        ]

        return Response({
            'kpis': {
                'total_ventas':    float(kpis['total_ventas'] or 0),
                'num_ventas':      kpis['num_ventas'],
                'ticket_promedio': float(kpis['ticket_promedio'] or 0),
            },
            'ventas_por_dia':    ventas_por_dia,
            'ticket_por_dia':    ticket_por_dia,
            'ventas_por_metodo': ventas_por_metodo,
            'top_productos':     top_productos_data,
            'top_clientes':      top_clientes_data,
        })

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard(self, request):
        """
        GET /api/v1/sales/ventas/dashboard/?id_sucursal=<uuid>&rango=7d|30d|mes
        Devuelve todos los KPIs, series y listas del dashboard en una sola llamada.
        """
        import datetime
        from decimal import Decimal
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncDate
        from django.utils import timezone
        from apps.sales.models import Venta, DetalleVenta

        empresa     = request.user.empresa
        sucursal_id = request.query_params.get('id_sucursal')
        rango       = request.query_params.get('rango', '7d')

        hoy        = timezone.localdate()
        ayer       = hoy - datetime.timedelta(days=1)
        inicio_mes = hoy.replace(day=1)
        if inicio_mes.month == 1:
            inicio_mes_ant = datetime.date(inicio_mes.year - 1, 12, 1)
        else:
            inicio_mes_ant = datetime.date(inicio_mes.year, inicio_mes.month - 1, 1)
        fin_mes_ant = inicio_mes - datetime.timedelta(days=1)

        if rango == '30d':
            serie_desde = hoy - datetime.timedelta(days=29)
        elif rango == 'mes':
            serie_desde = inicio_mes
        else:
            serie_desde = hoy - datetime.timedelta(days=6)

        METODO_LABELS = {
            'efectivo': 'Efectivo', 'tarjeta_debito': 'T. Débito',
            'tarjeta_credito': 'T. Crédito', 'transferencia': 'Transferencia',
            'cheque': 'Cheque', 'credito': 'Crédito', 'otro': 'Otro',
        }

        # ── Base queryset ──────────────────────────────────────────────────────
        qs = Venta.objects.filter(empresa=empresa, estado='activo')
        if sucursal_id:
            qs = qs.filter(sucursal_id=sucursal_id)

        # ── KPIs diarios ──────────────────────────────────────────────────────
        qs_hoy  = qs.filter(fecha_venta__date=hoy)
        qs_ayer = qs.filter(fecha_venta__date=ayer)
        agg_hoy  = qs_hoy.aggregate(total=Sum('total'), count=Count('id_venta'))
        agg_ayer = qs_ayer.aggregate(total=Sum('total'))

        ventas_hoy_val    = float(agg_hoy['total'] or 0)
        transacciones_hoy = agg_hoy['count'] or 0
        ventas_ayer_val   = float(agg_ayer['total'] or 0)
        ticket_promedio   = ventas_hoy_val / transacciones_hoy if transacciones_hoy else 0

        agg_util = DetalleVenta.objects.filter(venta__in=qs_hoy).aggregate(
            ingresos=Sum('total'), costos=Sum('costo_total')
        )
        utilidad_hoy = float(
            (agg_util['ingresos'] or Decimal('0')) - (agg_util['costos'] or Decimal('0'))
        )

        # ── KPIs mensuales ─────────────────────────────────────────────────────
        qs_mes     = qs.filter(fecha_venta__date__gte=inicio_mes)
        qs_mes_ant = qs.filter(
            fecha_venta__date__gte=inicio_mes_ant,
            fecha_venta__date__lte=fin_mes_ant,
        )
        ventas_mes          = float(qs_mes.aggregate(total=Sum('total'))['total'] or 0)
        ventas_mes_anterior = float(qs_mes_ant.aggregate(total=Sum('total'))['total'] or 0)

        # ── Serie de ventas (con utilidad por día) ────────────────────────────
        serie_raw = (
            qs.filter(fecha_venta__date__gte=serie_desde)
            .annotate(fecha=TruncDate('fecha_venta'))
            .values('fecha')
            .annotate(total=Sum('total'))
            .order_by('fecha')
        )
        dv_qs = DetalleVenta.objects.filter(
            venta__empresa=empresa,
            venta__estado='activo',
            venta__fecha_venta__date__gte=serie_desde,
        )
        if sucursal_id:
            dv_qs = dv_qs.filter(venta__sucursal_id=sucursal_id)
        utilidad_raw = (
            dv_qs
            .annotate(fecha=TruncDate('venta__fecha_venta'))
            .values('fecha')
            .annotate(ingresos=Sum('total'), costos=Sum('costo_total'))
            .order_by('fecha')
        )
        utilidad_por_dia = {
            row['fecha']: float(
                (row['ingresos'] or Decimal('0')) - (row['costos'] or Decimal('0'))
            )
            for row in utilidad_raw
        }
        ventas_dict  = {row['fecha']: float(row['total'] or 0) for row in serie_raw}
        dias_range   = (hoy - serie_desde).days + 1
        ventas_serie = [
            {
                'fecha':    (serie_desde + datetime.timedelta(days=i)).isoformat(),
                'total':    ventas_dict.get(serie_desde + datetime.timedelta(days=i), 0),
                'utilidad': utilidad_por_dia.get(serie_desde + datetime.timedelta(days=i), 0),
            }
            for i in range(dias_range)
        ]

        # ── Top productos ──────────────────────────────────────────────────────
        dv_top = DetalleVenta.objects.filter(
            venta__empresa=empresa,
            venta__estado='activo',
            venta__fecha_venta__date__gte=serie_desde,
        )
        if sucursal_id:
            dv_top = dv_top.filter(venta__sucursal_id=sucursal_id)
        top_productos_data = [
            {
                'nombre':   r['producto__nombre'],
                'sku':      r['producto__sku'],
                'unidades': float(r['unidades'] or 0),
                'ingreso':  float(r['ingreso'] or 0),
            }
            for r in dv_top.values('producto__nombre', 'producto__sku')
            .annotate(unidades=Sum('cantidad'), ingreso=Sum('total'))
            .order_by('-ingreso')[:10]
        ]

        # ── Top clientes ───────────────────────────────────────────────────────
        top_clientes_data = [
            {
                'nombre':      r['cliente__nombre_comercial'],
                'num_compras': r['num_compras'],
                'total':       float(r['total'] or 0),
            }
            for r in qs.filter(
                fecha_venta__date__gte=serie_desde,
                cliente__isnull=False,
            )
            .values('cliente__nombre_comercial')
            .annotate(num_compras=Count('id_venta'), total=Sum('total'))
            .order_by('-total')[:10]
        ]

        # ── Distribución por método de pago (mes) ─────────────────────────────
        dist_raw     = list(
            qs_mes.values('metodo_pago')
            .annotate(total=Sum('total'), count=Count('id_venta'))
            .order_by('-total')
        )
        total_dist   = sum(float(r['total'] or 0) for r in dist_raw)
        distribucion_metodo_pago = [
            {
                'metodo': r['metodo_pago'],
                'label':  METODO_LABELS.get(r['metodo_pago'], r['metodo_pago']),
                'total':  float(r['total'] or 0),
                'count':  r['count'],
                'pct':    round(float(r['total'] or 0) / total_dist * 100, 1) if total_dist else 0,
            }
            for r in dist_raw
        ]

        # ── Stock bajo ─────────────────────────────────────────────────────────
        stock_bajo_count = 0
        alertas_stock    = []
        try:
            from apps.inventory.models import Inventario
            inv_qs = (
                Inventario.objects
                .filter(empresa=empresa, producto__maneja_inventario=True)
                .select_related('producto')
            )
            if sucursal_id:
                inv_qs = inv_qs.filter(sucursal_id=sucursal_id)
            bajos            = [i for i in inv_qs if i.bajo_minimo]
            stock_bajo_count = len(bajos)
            alertas_stock    = [
                {
                    'producto': i.producto.nombre,
                    'sku':      i.producto.sku,
                    'stock':    float(i.stock_actual),
                    'minimo':   float(i.producto.stock_minimo or 0),
                }
                for i in sorted(bajos, key=lambda x: x.stock_actual)[:5]
            ]
        except Exception as exc:
            logger.warning(f'[Dashboard] stock_bajo falló: {exc}')

        # ── CxC pendientes ─────────────────────────────────────────────────────
        cxc_pendiente_total = 0.0
        cxc_vencidas_count  = 0
        cxc_pendientes      = []
        try:
            from apps.finance.models import CuentaPorCobrar
            cxc_qs = CuentaPorCobrar.objects.filter(
                empresa=empresa,
                estado__in=['pendiente', 'pagada_parcial'],
            ).select_related('cliente')
            agg_cxc             = cxc_qs.aggregate(total=Sum('saldo_pendiente'))
            cxc_pendiente_total = float(agg_cxc['total'] or 0)
            cxc_vencidas_count  = cxc_qs.filter(fecha_vencimiento__lt=hoy).count()
            cxc_pendientes      = [
                {
                    'cliente': c.cliente.nombre_comercial if c.cliente_id else '—',
                    'folio':   c.folio,
                    'vence':   c.fecha_vencimiento.isoformat(),
                    'monto':   float(c.saldo_pendiente),
                    'estado':  'vencida' if c.fecha_vencimiento < hoy else 'pendiente',
                }
                for c in cxc_qs.order_by('fecha_vencimiento')[:5]
            ]
        except Exception as exc:
            logger.warning(f'[Dashboard] CxC falló: {exc}')

        # ── Compras mes ────────────────────────────────────────────────────────
        compras_mes = 0.0
        try:
            from apps.purchases.models import Compra
            comp_qs = Compra.objects.filter(
                empresa=empresa,
                fecha_compra__gte=inicio_mes,
                estado__in=['activo', 'recibida_parcial', 'recibida'],
            )
            if sucursal_id:
                comp_qs = comp_qs.filter(sucursal_id=sucursal_id)
            compras_mes = float(comp_qs.aggregate(total=Sum('total'))['total'] or 0)
        except Exception as exc:
            logger.warning(f'[Dashboard] compras falló: {exc}')

        return Response({
            'kpis': {
                'ventas_hoy':          ventas_hoy_val,
                'ventas_ayer':         ventas_ayer_val,
                'transacciones_hoy':   transacciones_hoy,
                'ticket_promedio':     round(ticket_promedio, 2),
                'ventas_mes':          ventas_mes,
                'ventas_mes_anterior': ventas_mes_anterior,
                'utilidad_hoy':        utilidad_hoy,
                'stock_bajo':          stock_bajo_count,
                'cxc_pendiente':       cxc_pendiente_total,
                'cxc_vencidas':        cxc_vencidas_count,
                'compras_mes':         compras_mes,
            },
            'ventas_serie':            ventas_serie,
            'top_productos':           top_productos_data,
            'top_clientes':            top_clientes_data,
            'distribucion_metodo_pago': distribucion_metodo_pago,
            'alertas_stock':           alertas_stock,
            'cxc_pendientes':          cxc_pendientes,
        })

    @action(detail=True, methods=['post'], url_path='factura')
    def factura(self, request, pk=None):
        """
        POST /api/v1/sales/ventas/{id}/factura/
        Solicita la emisión de un CFDI para esta venta.
        """
        from apps.facturacion.services import CFDIService
        from apps.facturacion.serializers import SolicitarFacturaRequestSerializer, CFDISerializer
        from apps.facturacion.exceptions import FacturacionException

        try:
            venta = self._service(request).obtener_venta(int(pk))
        except SalesException as e:
            return self._error(e)

        serializer = SolicitarFacturaRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            cfdi = CFDIService.solicitar_cfdi(
                venta=venta,
                datos_receptor=serializer.validated_data,
                usuario=request.user,
            )
        except FacturacionException as e:
            return Response({'detail': str(e.detail)}, status=e.status_code)

        return Response(CFDISerializer(cfdi).data, status=status.HTTP_201_CREATED)
# (no ejecutar, solo referencia)
