import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from apps.inventory.services.scan_session_service import scan_session_service
from apps.inventory.services.barcode_service import barcode_service

logger = logging.getLogger(__name__)


class ScanSessionViewSet(viewsets.ViewSet):
    """
    Endpoints para escaneo remoto PC → Celular.

    Flujo:
      POST /scan-session/crear/         → PC crea sesión, obtiene QR
      GET  /scan-session/{token}/poll/  → PC hace polling esperando resultado
      POST /scan-session/{token}/resultado/ → Cel envía el código escaneado
    """

    def get_permissions(self):
        """
        crear y poll requieren JWT (son llamados desde la PC autenticada).
        resultado es público (el cel no tiene sesión).
        """
        if self.action == "resultado":
            return [AllowAny()]
        return [IsAuthenticated()]

    @action(detail=False, methods=["post"], url_path="crear")
    def crear(self, request):
        """
        PC crea una sesión de escaneo.
        Retorna token + QR en base64 para mostrar al usuario.
        """
        # Detectar URL base desde el request o header
        base_url = request.data.get("base_url", "").rstrip("/")
        if not base_url:
            # Intentar inferir desde el origen
            origin = request.META.get("HTTP_ORIGIN", "")
            base_url = origin if origin else "https://pycore.app"

        sesion = scan_session_service.crear_sesion(base_url)
        return Response(sesion, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="poll")
    def poll(self, request, pk=None):
        """
        PC hace polling cada segundo esperando que el cel escanee.
        Cuando listo=True, retorna el codigo_barras y opcionalmente
        el producto ya resuelto.
        """
        token = pk
        resultado = scan_session_service.obtener_resultado(token)

        if not resultado.get("listo"):
            return Response(resultado, status=status.HTTP_200_OK)

        # Si ya hay código, resolverlo automáticamente contra inventario
        codigo = resultado["codigo_barras"]
        producto = barcode_service.buscar_por_codigo(
            empresa=request.user.empresa,
            codigo_barras=codigo,
        )

        return Response({
            "listo":          True,
            "expirado":       False,
            "codigo_barras":  codigo,
            "producto":       producto,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="resultado")
    def resultado(self, request, pk=None):
        """
        Cel envía el código escaneado. No requiere autenticación.
        """
        token = pk
        codigo = request.data.get("codigo_barras", "").strip()

        if not codigo:
            return Response(
                {"detail": "El campo 'codigo_barras' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        guardado = scan_session_service.guardar_resultado(token, codigo)

        if not guardado:
            return Response(
                {"detail": "Sesión expirada o no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"ok": True}, status=status.HTTP_200_OK)
