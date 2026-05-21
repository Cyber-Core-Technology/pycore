import io
import logging
import requests as http_requests

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


def _usar_s3():
    return bool(getattr(settings, 'AWS_STORAGE_BUCKET_NAME', ''))


def _s3_client():
    import boto3
    return boto3.client(
        's3',
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def _s3_url(s3_key):
    dominio = settings.AWS_CLOUDFRONT_DOMAIN or f'{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
    return f'https://{dominio}/{s3_key}'


def _descargar_y_guardar(empresa_id: str, empresa_slug: str, producto_id: str, url: str) -> str:
    """
    Descarga imagen externa, la recorta a cuadrado, la comprime y la guarda.
    Retorna la URL final o '' si falla.
    """
    from PIL import Image
    try:
        resp = http_requests.get(url, timeout=10, stream=True)
        resp.raise_for_status()
        if not resp.headers.get('Content-Type', '').startswith('image/'):
            return ''

        img = Image.open(io.BytesIO(resp.content)).convert('RGB')
        size = min(img.width, img.height)
        left = (img.width  - size) // 2
        top  = (img.height - size) // 2
        img  = img.crop((left, top, left + size, top + size))

        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=88, optimize=True)
        buffer.seek(0)

        if _usar_s3():
            s3_key = f'empresas/{empresa_slug}/productos/{producto_id[:8]}/imagen.jpg'
            _s3_client().upload_fileobj(
                buffer,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_key,
                ExtraArgs={'ContentType': 'image/jpeg'},
            )
            return _s3_url(s3_key)
        else:
            from pathlib import Path
            carpeta = Path(settings.MEDIA_ROOT) / 'inventory' / 'productos' / empresa_id
            carpeta.mkdir(parents=True, exist_ok=True)
            nombre = f'{producto_id}.jpg'
            (carpeta / nombre).write_bytes(buffer.read())
            return f'{settings.MEDIA_URL}inventory/productos/{empresa_id}/{nombre}'
    except Exception as exc:
        logger.warning(f'[generar_imagen] Falló para producto {producto_id}: {exc}')
        return ''


def _cache_key(empresa_id: str) -> str:
    return f'generar_imagenes:{empresa_id}'


def get_progreso(empresa_id: str) -> dict | None:
    from django.core.cache import cache
    return cache.get(_cache_key(empresa_id))


@shared_task(
    bind=True,
    name='inventory.generar_imagen_producto',
    max_retries=2,
    default_retry_delay=60,
)
def generar_imagen_producto(self, producto_id: str, empresa_id: str):
    """
    Busca la imagen de un producto consultando APIs externas por su código
    de barras, la descarga, recorta y sube. Actualiza producto.imagen_url.
    """
    from apps.inventory.models import Producto
    from apps.inventory.services.barcode_service import BarcodeService
    from django.core.cache import cache

    encontrada = False
    try:
        producto = Producto.objects.select_related('empresa').get(id=producto_id)
        empresa  = producto.empresa
        slug     = empresa.slug or empresa_id

        svc      = BarcodeService()
        resultado = svc._buscar_externo(producto.codigo_barras)

        if resultado and resultado.get('imagen_url'):
            url_imagen = resultado['imagen_url']
            imagen_url = _descargar_y_guardar(empresa_id, slug, producto_id, url_imagen)
            if imagen_url:
                producto.imagen_url = imagen_url
                producto.save(update_fields=['imagen_url'])
                logger.info(f'[generar_imagen] ✅ {producto.nombre}')
                encontrada = True
            else:
                logger.warning(f'[generar_imagen] Descarga falló: {producto.nombre}')
        else:
            logger.info(f'[generar_imagen] Sin imagen externa para {producto.codigo_barras}')

    except Producto.DoesNotExist:
        logger.warning(f'[generar_imagen] Producto {producto_id} no encontrado.')
    except Exception as exc:
        logger.warning(f'[generar_imagen] Error en {producto_id}: {exc}')
    finally:
        # Actualizar contadores de progreso (solo display — la finalización la maneja el chord)
        key    = _cache_key(empresa_id)
        actual = cache.get(key) or {}
        actual['done']        = actual.get('done', 0) + 1
        actual['encontradas'] = actual.get('encontradas', 0) + (1 if encontrada else 0)
        cache.set(key, actual, timeout=3600)


@shared_task(name='inventory.marcar_imagenes_completado')
def marcar_imagenes_completado(empresa_id: str):
    """Callback de chord: marca el lote como completado de forma garantizada."""
    from django.core.cache import cache
    key    = _cache_key(empresa_id)
    actual = cache.get(key) or {}
    actual['status'] = 'completed'
    cache.set(key, actual, timeout=3600)
