import logging
import requests
from django.core.cache import cache
from apps.inventory.repositories import ProductoRepository
repo = ProductoRepository()

logger = logging.getLogger(__name__)

CACHE_TTL_EXTERNO = 60 * 60 * 24  # 24 horas
TIMEOUT_API = 3  # segundos


class BarcodeService:
    """
    Servicio para búsqueda de productos por código de barras.

    Flujo:
    1. Buscar en BD interna (Productos + Variantes) — scoped por empresa
    2. Si no existe → consultar APIs públicas con caché Redis
    3. Retornar resultado con flag de origen
    """

    def buscar_por_codigo(self, empresa, codigo_barras: str) -> dict:
        if not codigo_barras or not codigo_barras.strip():
            return self._respuesta_no_encontrado(codigo_barras)

        codigo = codigo_barras.strip()

        # 1. Buscar internamente
        resultado_interno = self._buscar_interno(empresa, codigo)
        if resultado_interno:
            logger.info(f"Barcode {codigo} encontrado internamente [empresa={empresa}]")
            return {"origen": "interno", "encontrado": True, "producto": resultado_interno}

        # 2. Fallback a APIs públicas
        resultado_externo = self._buscar_externo(codigo)
        if resultado_externo:
            logger.info(f"Barcode {codigo} encontrado en API externa")
            return {"origen": "externo", "encontrado": True, "producto": resultado_externo}

        logger.info(f"Barcode {codigo} no encontrado [empresa={empresa}]")
        return self._respuesta_no_encontrado(codigo)

    def _buscar_interno(self, empresa, codigo_barras: str) -> dict | None:
        producto = repo.buscar_por_codigo_barras(empresa, codigo_barras)
        if producto:
            return self._serializar_producto(producto)

        variante = repo.buscar_variante_por_codigo_barras(empresa, codigo_barras)
        if variante:
            return self._serializar_variante(variante)

        return None

    def _serializar_producto(self, producto) -> dict:
        return {
            "id_producto": str(producto.id),
            "uuid": str(producto.id),
            "id_variante": None,
            "nombre": producto.nombre,
            "descripcion": producto.descripcion or "",
            "sku": producto.sku,
            "codigo_barras": producto.codigo_barras,
            "precio_venta": float(producto.precio_venta),
            "precio_compra": float(producto.precio_compra),
            "precio_mayoreo": float(producto.precio_mayoreo) if producto.precio_mayoreo else None,
            "imagen_url": producto.imagen_url,
            "stock_disponible": None,
            "unidad_medida": producto.unidad_medida.abreviatura if producto.unidad_medida else None,
            "categoria": producto.categoria.nombre if producto.categoria else None,
            "activo": producto.activo,
            "es_vendible": producto.activo,
            "meta": None,
        }

    def _serializar_variante(self, variante) -> dict:
        producto = variante.producto
        return {
            "id_producto": str(producto.id),
            "uuid": str(producto.id),
            "id_variante": str(variante.id),
            "nombre": f"{producto.nombre} — {variante.nombre}",
            "descripcion": producto.descripcion or "",
            "sku": variante.sku or producto.sku,
            "codigo_barras": variante.codigo_barras,
            "precio_venta": float(variante.precio_venta or producto.precio_venta),
            "precio_compra": float(variante.precio_compra or producto.precio_compra),
            "precio_mayoreo": None,
            "imagen_url": producto.imagen_url,
            "stock_disponible": None,
            "unidad_medida": producto.unidad_medida.abreviatura if producto.unidad_medida else None,
            "categoria": producto.categoria.nombre if producto.categoria else None,
            "activo": variante.activo,
            "es_vendible": producto.activo,
            "meta": None,
        }

    def _buscar_externo(self, codigo_barras: str) -> dict | None:
        cache_key = f"barcode_ext:{codigo_barras}"
        cached = cache.get(cache_key)
        if cached is not None:
            return None if cached is False else cached

        resultado = self._consultar_open_food_facts(codigo_barras)
        if not resultado:
            resultado = self._consultar_upcitemdb(codigo_barras)

        cache.set(cache_key, resultado if resultado else False, CACHE_TTL_EXTERNO)
        return resultado

    def _consultar_open_food_facts(self, codigo_barras: str) -> dict | None:
        try:
            url = f"https://world.openfoodfacts.org/api/v0/product/{codigo_barras}.json"
            response = requests.get(url, timeout=TIMEOUT_API)
            if response.status_code != 200:
                return None
            data = response.json()
            if data.get("status") != 1:
                return None
            product = data.get("product", {})
            nombre = (
                product.get("product_name_es")
                or product.get("product_name")
                or product.get("abbreviated_product_name")
            )
            if not nombre:
                return None
            return {
                "id_producto": None,
                "uuid": None,
                "id_variante": None,
                "nombre": nombre.strip(),
                "descripcion": product.get("ingredients_text_es") or product.get("ingredients_text") or "",
                "sku": None,
                "codigo_barras": codigo_barras,
                "precio_venta": None,
                "precio_compra": None,
                "precio_mayoreo": None,
                "imagen_url": product.get("image_front_url") or product.get("image_url"),
                "stock_disponible": None,
                "unidad_medida": None,
                "categoria": (product.get("categories_tags") or [None])[0],
                "activo": True,
                "es_vendible": True,
                "meta": {
                    "fuente": "open_food_facts",
                    "marca": product.get("brands", ""),
                    "pais_origen": product.get("countries", ""),
                    "cantidad": product.get("quantity", ""),
                },
            }
        except requests.RequestException as e:
            logger.warning(f"Open Food Facts error para {codigo_barras}: {e}")
            return None

    def _consultar_upcitemdb(self, codigo_barras: str) -> dict | None:
        try:
            url = f"https://api.upcitemdb.com/prod/trial/lookup?upc={codigo_barras}"
            response = requests.get(url, timeout=TIMEOUT_API, headers={"Accept": "application/json"})
            if response.status_code != 200:
                return None
            data = response.json()
            items = data.get("items", [])
            if not items:
                return None
            item = items[0]
            nombre = item.get("title")
            if not nombre:
                return None
            imagenes = item.get("images", [])
            return {
                "id_producto": None,
                "uuid": None,
                "id_variante": None,
                "nombre": nombre.strip(),
                "descripcion": item.get("description", ""),
                "sku": None,
                "codigo_barras": codigo_barras,
                "precio_venta": None,
                "precio_compra": None,
                "precio_mayoreo": None,
                "imagen_url": imagenes[0] if imagenes else None,
                "stock_disponible": None,
                "unidad_medida": None,
                "categoria": item.get("category"),
                "activo": True,
                "es_vendible": True,
                "meta": {
                    "fuente": "upcitemdb",
                    "marca": item.get("brand", ""),
                    "modelo": item.get("model", ""),
                },
            }
        except requests.RequestException as e:
            logger.warning(f"UPCitemdb error para {codigo_barras}: {e}")
            return None

    def _respuesta_no_encontrado(self, codigo_barras: str) -> dict:
        return {
            "origen": "no_encontrado",
            "encontrado": False,
            "producto": {
                "id_producto": None,
                "uuid": None,
                "id_variante": None,
                "nombre": "",
                "descripcion": "",
                "sku": None,
                "codigo_barras": codigo_barras,
                "precio_venta": None,
                "precio_compra": None,
                "precio_mayoreo": None,
                "imagen_url": None,
                "stock_disponible": None,
                "unidad_medida": None,
                "categoria": None,
                "activo": True,
                "es_vendible": True,
                "meta": None,
            },
        }


barcode_service = BarcodeService()
