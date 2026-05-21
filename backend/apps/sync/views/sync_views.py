import logging
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Sucursal
from apps.sync.services import PullService, PushService

logger = logging.getLogger(__name__)


class SyncPullView(APIView):
    """
    GET /api/v1/sync/pull/?sucursal_id=1

    Descarga snapshot de datos maestros para operar offline.
    El dispositivo debe llamar esto al conectarse antes de ir offline.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sucursal_id = request.query_params.get('sucursal_id')
        if not sucursal_id:
            return Response(
                {'error': 'sucursal_id requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            sucursal = Sucursal.objects.get(
                id_sucursal=sucursal_id,
                empresa=request.user.empresa,
            )
        except Sucursal.DoesNotExist:
            return Response(
                {'error': 'Sucursal no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        service = PullService(
            empresa=request.user.empresa,
            sucursal=sucursal,
            usuario=request.user,
        )

        snapshot = service.generar_snapshot()
        logger.info(
            f"[Sync] Pull generado — empresa={request.user.empresa.id_empresa} "
            f"sucursal={sucursal_id} productos={len(snapshot['productos'])}"
        )
        return Response(snapshot)


class SyncPushView(APIView):
    """
    POST /api/v1/sync/push/

    Recibe ventas generadas offline y las sincroniza.

    Body:
    {
        "sucursal_id": 1,
        "dispositivo_id": "device-uuid-xxx",
        "ventas": [
            {
                "offline_id": "device-uuid-venta-001",
                "created_at": "2026-03-03T10:30:00",
                "id_cliente": null,
                "metodo_pago": "efectivo",
                "subtotal": 100.00,
                "descuento": 0,
                "impuestos": 16.00,
                "total": 116.00,
                "notas": "",
                "items": [
                    {
                        "producto_id": "uuid-producto",
                        "cantidad": 2,
                        "precio_unitario": 50.00,
                        "descuento": 0,
                        "subtotal": 100.00,
                        "impuestos": 16.00,
                        "total": 116.00
                    }
                ]
            }
        ]
    }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        sucursal_id = request.data.get('sucursal_id')
        ventas = request.data.get('ventas', [])
        dispositivo_id = request.data.get('dispositivo_id', '')

        if not sucursal_id:
            return Response(
                {'error': 'sucursal_id requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not ventas:
            return Response(
                {'error': 'No hay ventas para sincronizar'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            sucursal = Sucursal.objects.get(
                id_sucursal=sucursal_id,
                empresa=request.user.empresa,
            )
        except Sucursal.DoesNotExist:
            return Response(
                {'error': 'Sucursal no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        ip_address = request.META.get('REMOTE_ADDR')
        service = PushService(
            empresa=request.user.empresa,
            sucursal=sucursal,
            usuario=request.user,
            dispositivo_id=dispositivo_id,
        )

        resultado = service.sincronizar(ventas, ip_address=ip_address)

        http_status = status.HTTP_200_OK
        if resultado['errores']:
            http_status = status.HTTP_207_MULTI_STATUS

        return Response(resultado, status=http_status)


class SyncStatusView(APIView):
    """
    GET /api/v1/sync/status/

    Retorna el estado del servidor y timestamp actual.
    El dispositivo usa esto para verificar conectividad.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from apps.sync.models import SyncLog

        ultimo_sync = SyncLog.objects.filter(
            empresa_id=request.user.empresa.id_empresa
        ).first()

        return Response({
            'status': 'online',
            'timestamp': timezone.now().isoformat(),
            'empresa_id': request.user.empresa.id_empresa,
            'ultimo_sync': ultimo_sync.created_at.isoformat() if ultimo_sync else None,
        })
