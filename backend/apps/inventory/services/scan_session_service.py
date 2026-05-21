import uuid
import json
import qrcode
import io
import base64
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

SESSION_TTL   = 60 * 5   # 5 minutos
RESULT_TTL    = 60 * 2   # 2 minutos para leer el resultado


class ScanSessionService:
    """
    Gestiona sesiones de escaneo remoto (PC → Celular → PC).

    Flujo:
    1. PC llama a crear_sesion()  → obtiene token + QR en base64
    2. Cel abre /scan/{token}     → activa cámara y escanea
    3. Cel llama a guardar_resultado() con el código escaneado
    4. PC hace polling con obtener_resultado() hasta que llega
    """

    # ── Claves Redis ──────────────────────────────────────────────────────────

    def _key_sesion(self, token: str) -> str:
        return f"scan_session:{token}"

    def _key_resultado(self, token: str) -> str:
        return f"scan_session:{token}:result"

    # ── Crear sesión ──────────────────────────────────────────────────────────

    def crear_sesion(self, base_url: str) -> dict:
        """
        Genera un token UUID, lo guarda en Redis y retorna el QR en base64.

        Args:
            base_url: URL base del frontend (ej: https://pycore.app)

        Returns:
            dict con token, url_escaneo y qr_base64
        """
        token = str(uuid.uuid4())
        url_escaneo = f"{base_url}/scan/{token}"

        # Guardar sesión activa en Redis
        cache.set(self._key_sesion(token), json.dumps({
            "token":  token,
            "url":    url_escaneo,
            "estado": "esperando",
        }), SESSION_TTL)

        # Generar QR
        qr_base64 = self._generar_qr(url_escaneo)

        logger.info(f"Scan session creada: {token}")
        return {
            "token":       token,
            "url_escaneo": url_escaneo,
            "qr_base64":   qr_base64,
            "ttl_segundos": SESSION_TTL,
        }

    # ── Guardar resultado (llamado desde el cel) ──────────────────────────────

    def guardar_resultado(self, token: str, codigo_barras: str) -> bool:
        """
        El celular llama a este método después de escanear.
        Guarda el código en Redis para que la PC lo lea.

        Returns:
            True si la sesión existía y se guardó, False si expiró
        """
        sesion = cache.get(self._key_sesion(token))
        if not sesion:
            logger.warning(f"Scan session no encontrada o expirada: {token}")
            return False

        cache.set(self._key_resultado(token), json.dumps({
            "codigo_barras": codigo_barras,
            "leido":         False,
        }), RESULT_TTL)

        logger.info(f"Resultado guardado para sesión {token}: {codigo_barras}")
        return True

    # ── Poll (llamado desde la PC cada 1s) ───────────────────────────────────

    def obtener_resultado(self, token: str) -> dict:
        """
        La PC llama a este endpoint cada segundo.

        Returns:
            dict con listo=False si aún no hay resultado
            dict con listo=True + codigo_barras cuando el cel escaneó
        """
        # Verificar que la sesión sigue activa
        sesion = cache.get(self._key_sesion(token))
        if not sesion:
            return {"listo": False, "expirado": True}

        resultado = cache.get(self._key_resultado(token))
        if not resultado:
            return {"listo": False, "expirado": False}

        data = json.loads(resultado)

        # Marcar como leído e invalidar token (un solo uso)
        cache.delete(self._key_sesion(token))
        cache.delete(self._key_resultado(token))

        logger.info(f"Resultado entregado y sesión invalidada: {token}")
        return {
            "listo":          True,
            "expirado":       False,
            "codigo_barras":  data["codigo_barras"],
        }

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _generar_qr(self, url: str) -> str:
        """Genera un QR y lo retorna como base64 PNG."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=8,
            border=2,
        )
        qr.add_data(url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="#18AE91", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        return base64.b64encode(buffer.read()).decode("utf-8")


scan_session_service = ScanSessionService()
