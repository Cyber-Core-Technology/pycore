import io
import os
import time
import requests as http_requests
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, JSONParser


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


def _s3_borrar_prefijo(prefijo):
    s3 = _s3_client()
    bucket = settings.AWS_STORAGE_BUCKET_NAME
    resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefijo)
    for obj in resp.get('Contents', []):
        s3.delete_object(Bucket=bucket, Key=obj['Key'])

from apps.inventory.serializers import (
    ProductoSerializer,
    ProductoListSerializer,
    VarianteSerializer,
)

from apps.inventory.services import ProductoService
from apps.inventory.services.barcode_service import barcode_service

from apps.inventory.models import VarianteProducto


service = ProductoService()


class ProductoViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def _empresa(self, request):
        return request.user.empresa

    def list(self, request):
        from apps.inventory.models import Inventario
        from django.db.models import OuterRef, Subquery, DecimalField, F, ExpressionWrapper

        q = request.query_params.get('q')
        sucursal_id = request.query_params.get('sucursal_id')
        empresa = self._empresa(request)

        qs = service.buscar(empresa, q) if q else service.listar(empresa)

        if sucursal_id:
            stock_subq = Inventario.objects.filter(
                producto=OuterRef('pk'),
                sucursal_id=sucursal_id,
                empresa=empresa,
                variante=None,
            ).annotate(
                disponible=ExpressionWrapper(
                    F('stock_actual') - F('stock_reservado'),
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                )
            ).values('disponible')[:1]
            qs = qs.annotate(stock_disponible_anotado=Subquery(stock_subq, output_field=DecimalField(max_digits=12, decimal_places=2)))

        return Response(ProductoListSerializer(qs, many=True).data)

    def retrieve(self, request, pk=None):
        obj = service.obtener(self._empresa(request), pk)
        return Response(ProductoSerializer(obj).data)

    def create(self, request):
        serializer = ProductoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        obj = service.crear(self._empresa(request), serializer.validated_data)

        return Response(
            ProductoSerializer(obj).data,
            status=status.HTTP_201_CREATED
        )

    def partial_update(self, request, pk=None):
        obj = service.obtener(self._empresa(request), pk)
        serializer = ProductoSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        obj = service.actualizar(
            self._empresa(request),
            pk,
            serializer.validated_data
        )

        return Response(ProductoSerializer(obj).data)

    def destroy(self, request, pk=None):
        service.eliminar(self._empresa(request), pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    # =========================================================
    # VARIANTES
    # =========================================================

    @action(detail=True, methods=['post'], url_path='variantes')
    def agregar_variante(self, request, pk=None):
        producto = service.obtener(self._empresa(request), pk)

        serializer = VarianteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        variante = VarianteProducto.objects.create(
            producto=producto,
            **serializer.validated_data
        )

        if not producto.tiene_variantes:
            producto.tiene_variantes = True
            producto.save(update_fields=['tiene_variantes'])

        return Response(
            VarianteSerializer(variante).data,
            status=status.HTTP_201_CREATED
        )

    # =========================================================
    # BUSCAR PRODUCTO POR CÓDIGO DE BARRAS
    # =========================================================

    # =========================================================
    # IMAGEN DEL PRODUCTO
    # =========================================================

    @action(detail=True, methods=['post', 'delete'], url_path='imagen', parser_classes=[MultiPartParser])
    def imagen(self, request, pk=None):
        ALLOWED = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
        MAX_SIZE = 5 * 1024 * 1024  # 5 MB

        producto = service.obtener(self._empresa(request), pk)

        empresa_id = str(self._empresa(request).id_empresa)

        slug = self._empresa(request).slug
        prefijo_s3 = f'empresas/{slug}/productos/{pk[:8]}/imagen'

        def _borrar():
            if _usar_s3():
                _s3_borrar_prefijo(prefijo_s3)
            else:
                carpeta = settings.MEDIA_ROOT / 'inventory' / 'productos' / empresa_id
                for ext_ in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
                    f = carpeta / f"{pk}{ext_}"
                    if f.exists():
                        f.unlink()

        if request.method == 'DELETE':
            _borrar()
            producto.imagen_url = ''
            producto.save(update_fields=['imagen_url', 'updated_at'])
            return Response(status=status.HTTP_204_NO_CONTENT)

        archivo = request.FILES.get('imagen')
        if not archivo:
            return Response({'detail': 'No se recibió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)
        if archivo.content_type not in ALLOWED:
            return Response({'detail': 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.'}, status=status.HTTP_400_BAD_REQUEST)
        if archivo.size > MAX_SIZE:
            return Response({'detail': 'El archivo excede el límite de 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        _borrar()
        ext = os.path.splitext(archivo.name)[1].lower() or '.jpg'

        if _usar_s3():
            s3_key = f'{prefijo_s3}_{int(time.time())}{ext}'
            _s3_client().upload_fileobj(
                archivo,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_key,
                ExtraArgs={'ContentType': archivo.content_type},
            )
            imagen_url = _s3_url(s3_key)
        else:
            carpeta = settings.MEDIA_ROOT / 'inventory' / 'productos' / empresa_id
            carpeta.mkdir(parents=True, exist_ok=True)
            nombre_archivo = f"{pk}{ext}"
            with open(carpeta / nombre_archivo, 'wb') as f:
                for chunk in archivo.chunks():
                    f.write(chunk)
            imagen_url = f"{settings.MEDIA_URL}inventory/productos/{empresa_id}/{nombre_archivo}"

        producto.imagen_url = imagen_url
        producto.save(update_fields=['imagen_url', 'updated_at'])
        return Response({'imagen_url': producto.imagen_url}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post', 'delete'], url_path='galeria', parser_classes=[MultiPartParser, JSONParser])
    def galeria(self, request, pk=None):
        ALLOWED  = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
        MAX_SIZE = 5 * 1024 * 1024

        producto = service.obtener(self._empresa(request), pk)
        slug     = self._empresa(request).slug

        if request.method == 'DELETE':
            try:
                index = int(request.data.get('index', -1))
            except (TypeError, ValueError):
                return Response({'detail': 'index debe ser un entero.'}, status=status.HTTP_400_BAD_REQUEST)

            galeria_list = list(producto.galeria_imagenes or [])
            if 0 <= index < len(galeria_list):
                if _usar_s3():
                    old_url = galeria_list[index]
                    dominio = getattr(settings, 'AWS_CLOUDFRONT_DOMAIN', '') or \
                              f'{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
                    prefix = f'https://{dominio}/'
                    if old_url.startswith(prefix):
                        s3_key = old_url[len(prefix):]
                        try:
                            _s3_client().delete_object(
                                Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=s3_key
                            )
                        except Exception:
                            pass
                galeria_list.pop(index)
                producto.galeria_imagenes = galeria_list
                producto.save(update_fields=['galeria_imagenes'])
            return Response({'galeria_imagenes': producto.galeria_imagenes})

        archivo = request.FILES.get('imagen')
        if not archivo:
            return Response({'detail': 'No se recibió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)
        if archivo.content_type not in ALLOWED:
            return Response({'detail': 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.'}, status=status.HTTP_400_BAD_REQUEST)
        if archivo.size > MAX_SIZE:
            return Response({'detail': 'El archivo excede el límite de 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        ext        = os.path.splitext(archivo.name)[1].lower() or '.jpg'
        empresa_id = str(self._empresa(request).id_empresa)

        if _usar_s3():
            s3_key = f'empresas/{slug}/productos/{pk[:8]}/galeria_{int(time.time())}{ext}'
            _s3_client().upload_fileobj(
                archivo,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_key,
                ExtraArgs={'ContentType': archivo.content_type},
            )
            imagen_url = _s3_url(s3_key)
        else:
            carpeta = settings.MEDIA_ROOT / 'inventory' / 'productos' / empresa_id / 'galeria'
            carpeta.mkdir(parents=True, exist_ok=True)
            nombre_archivo = f"{pk[:8]}_{int(time.time())}{ext}"
            with open(carpeta / nombre_archivo, 'wb') as f:
                for chunk in archivo.chunks():
                    f.write(chunk)
            imagen_url = f"{settings.MEDIA_URL}inventory/productos/{empresa_id}/galeria/{nombre_archivo}"

        galeria_list = list(producto.galeria_imagenes or [])
        galeria_list.append(imagen_url)
        producto.galeria_imagenes = galeria_list
        producto.save(update_fields=['galeria_imagenes'])
        return Response(
            {'imagen_url': imagen_url, 'galeria_imagenes': producto.galeria_imagenes},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="buscar-barcode")
    def buscar_barcode(self, request):
        """
        Busca un producto por código de barras.

        Flujo:
          1. Busca en inventario propio de la empresa
          2. Si no existe, consulta APIs públicas
             (Open Food Facts → UPCitemdb)
          3. Siempre retorna el mismo schema — el campo
             `origen` indica si el producto es interno
             o sugerido desde API externa.

        Query params:
          - codigo (requerido): código de barras

        Responses:
          200 — producto encontrado
          200 — no encontrado (encontrado=false)
          400 — falta el parámetro codigo
        """
        codigo = request.query_params.get("codigo", "").strip()

        if not codigo:
            return Response(
                {"detail": "El parámetro 'codigo' es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resultado = barcode_service.buscar_por_codigo(self._empresa(request), codigo)

        return Response(resultado, status=status.HTTP_200_OK)

    def _descargar_imagen_externa(self, empresa_id: str, producto_id: str, url: str) -> str:
        """
        Descarga una imagen desde una URL externa, la recorta a cuadrado con Pillow
        y la guarda en S3 (o filesystem en local). Retorna la URL final o '' si falla.
        """
        from PIL import Image

        try:
            resp = http_requests.get(url, timeout=8, stream=True)
            resp.raise_for_status()
            if not resp.headers.get("Content-Type", "").startswith("image/"):
                return ""

            img = Image.open(io.BytesIO(resp.content)).convert("RGB")
            size = min(img.width, img.height)
            left = (img.width  - size) // 2
            top  = (img.height - size) // 2
            img = img.crop((left, top, left + size, top + size))

            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=88, optimize=True)
            buffer.seek(0)

            if _usar_s3():
                from apps.core.models.empresa import Empresa
                try:
                    emp  = Empresa.objects.get(id_empresa=empresa_id)
                    slug = emp.slug or empresa_id
                except Exception:
                    slug = empresa_id
                s3_key = f'empresas/{slug}/productos/{producto_id[:8]}/imagen_{int(time.time())}.jpg'
                _s3_client().upload_fileobj(
                    buffer,
                    settings.AWS_STORAGE_BUCKET_NAME,
                    s3_key,
                    ExtraArgs={'ContentType': 'image/jpeg'},
                )
                return _s3_url(s3_key)
            else:
                carpeta = settings.MEDIA_ROOT / "inventory" / "productos" / empresa_id
                carpeta.mkdir(parents=True, exist_ok=True)
                nombre_archivo = f"{producto_id}.jpg"
                (carpeta / nombre_archivo).write_bytes(buffer.read())
                return f"{settings.MEDIA_URL}inventory/productos/{empresa_id}/{nombre_archivo}"
        except Exception:
            return ""

    @action(detail=True, methods=['get'], url_path='buscar-imagenes')
    def buscar_imagenes(self, request, pk=None):
        """
        GET /api/v1/inventory/productos/{id}/buscar-imagenes/?q=nombre
        Busca imágenes en Google via Serper.dev por nombre de producto.
        Retorna lista de { imageUrl, thumbnailUrl, title, source }.
        """
        from django.conf import settings as django_settings

        api_key = getattr(django_settings, 'SERPER_API_KEY', '')
        if not api_key:
            return Response({'detail': 'SERPER_API_KEY no configurada.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        producto = service.obtener(self._empresa(request), pk)
        query    = request.query_params.get('q', producto.nombre).strip()

        try:
            resp = http_requests.post(
                'https://google.serper.dev/images',
                json={'q': query, 'gl': 'mx', 'hl': 'es', 'num': 12},
                headers={'X-API-KEY': api_key, 'Content-Type': 'application/json'},
                timeout=8,
            )
            resp.raise_for_status()
            images = resp.json().get('images', [])
        except Exception as exc:
            logger.warning(f'[buscar_imagenes] Serper error: {exc}')
            return Response({'detail': 'Error al buscar imágenes.'}, status=status.HTTP_502_BAD_GATEWAY)

        return Response([
            {
                'imageUrl':     img.get('imageUrl'),
                'thumbnailUrl': img.get('thumbnailUrl'),
                'title':        img.get('title', ''),
                'source':       img.get('source', ''),
            }
            for img in images
            if img.get('imageUrl')
        ][:12])

    @action(detail=True, methods=['post'], url_path='imagen-desde-url')
    def imagen_desde_url(self, request, pk=None):
        """
        POST /api/v1/inventory/productos/{id}/imagen-desde-url/
        Body: { url: "https://..." }
        Descarga, recorta y guarda la imagen. Misma lógica que _descargar_imagen_externa.
        """
        url = (request.data.get('url') or '').strip()
        if not url:
            return Response({'detail': 'Se requiere el campo url.'}, status=status.HTTP_400_BAD_REQUEST)

        producto   = service.obtener(self._empresa(request), pk)
        empresa    = self._empresa(request)
        empresa_id = str(empresa.id_empresa)

        imagen_url = self._descargar_imagen_externa(empresa_id, str(producto.id), url)
        if not imagen_url:
            return Response({'detail': 'No se pudo descargar o procesar la imagen desde esa URL.'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        producto.imagen_url = imagen_url
        producto.save(update_fields=['imagen_url'])
        return Response({'imagen_url': imagen_url})

    @action(detail=False, methods=['post'], url_path='generar-imagenes')
    def generar_imagenes(self, request):
        """
        POST /api/v1/inventory/productos/generar-imagenes/
        Encola tareas Celery para descargar imágenes de productos vía APIs externas.
        """
        from apps.inventory.tasks import generar_imagen_producto
        from django.core.cache import cache

        empresa          = self._empresa(request)
        empresa_id       = str(empresa.id_empresa)
        solo_sin_imagen  = request.data.get('solo_sin_imagen', True)
        ids_filtro       = request.data.get('ids', [])

        qs = service.listar(empresa).filter(codigo_barras__gt='')
        if ids_filtro:
            qs = qs.filter(id__in=ids_filtro)
        elif solo_sin_imagen:
            qs = qs.filter(imagen_url='')

        ids = list(qs.values_list('id', flat=True))

        if not ids:
            return Response({
                'encolados': 0,
                'mensaje':   'No hay productos con código de barras para procesar.',
            })

        # Inicializar progreso en cache
        from apps.inventory.tasks import _cache_key, marcar_imagenes_completado
        from celery import chord, group
        cache.set(_cache_key(empresa_id), {
            'total':       len(ids),
            'done':        0,
            'encontradas': 0,
            'status':      'running',
        }, timeout=3600)

        # Chord: tareas escalonadas (rate limit) + callback garantizado al terminar
        header = group(
            generar_imagen_producto.s(str(pid), empresa_id).set(countdown=i * 3)
            for i, pid in enumerate(ids)
        )
        chord(header)(marcar_imagenes_completado.si(empresa_id))

        return Response({
            'encolados': len(ids),
            'mensaje':   f'Se encolaron {len(ids)} producto{"s" if len(ids) != 1 else ""}.',
        })

    @action(detail=False, methods=['get'], url_path='progreso-imagenes')
    def progreso_imagenes(self, request):
        """GET /api/v1/inventory/productos/progreso-imagenes/ — consulta el progreso actual."""
        from apps.inventory.tasks import get_progreso
        empresa_id = str(self._empresa(request).id_empresa)
        data = get_progreso(empresa_id)
        if not data:
            return Response({'status': 'idle'})
        return Response(data)

    @action(detail=False, methods=["post"], url_path="crear-con-inventario")
    def crear_con_inventario(self, request):
        from apps.inventory.models import Inventario
        from apps.core.models.sucursal import Sucursal
        from apps.inventory.serializers import ProductoSerializer

        empresa     = self._empresa(request)
        sucursal_id = request.data.get("sucursal_id")

        if not sucursal_id:
            return Response({"detail": "sucursal_id es requerido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sucursal = Sucursal.objects.get(pk=sucursal_id, empresa=empresa)
        except Sucursal.DoesNotExist:
            return Response({"detail": "Sucursal no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        # Leer campos especiales
        stock_inicial      = float(request.data.get("stock_inicial", 0) or 0)
        maneja_inv         = request.data.get("maneja_inventario", True)
        imagen_url_externa = request.data.get("imagen_url_externa", "")
        if isinstance(maneja_inv, str):
            maneja_inv = maneja_inv.lower() != "false"

        # Crear producto
        campos_excluir = {"sucursal_id", "stock_inicial", "maneja_inventario", "imagen_url_externa"}
        data = {k: v for k, v in request.data.items() if k not in campos_excluir}
        data["maneja_inventario"] = maneja_inv
        producto = service.crear(empresa, data)

        # Descargar y guardar imagen externa si se proporcionó
        if imagen_url_externa:
            empresa_id = str(empresa.id_empresa)
            ruta_imagen = self._descargar_imagen_externa(empresa_id, str(producto.id), imagen_url_externa)
            if ruta_imagen:
                producto.imagen_url = ruta_imagen
                producto.save(update_fields=["imagen_url"])

        # Crear registro de inventario
        inv, created = Inventario.objects.get_or_create(
            empresa=empresa,
            producto=producto,
            sucursal=sucursal,
            variante=None,
            defaults={"stock_actual": stock_inicial, "costo_promedio": 0},
        )
        if not created and stock_inicial > 0:
            inv.stock_actual = stock_inicial
            inv.save(update_fields=["stock_actual"])

        return Response(ProductoSerializer(producto).data, status=status.HTTP_201_CREATED)
