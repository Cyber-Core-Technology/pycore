"""
Fusión de productos duplicados.

Dos fichas del mismo artículo parten la existencia entre las dos y ninguna dice
la verdad. Fusionar deja una sola —la que se conserva— y retira la otra.

Lo que **no** hace es reescribir la historia. Las ventas, compras y movimientos
del producto que sobra se quedan con él, igual que pasa al borrar cualquier
producto (es un soft delete: sus tickets lo siguen referenciando). Reapuntarlos
al que se conserva mezclaría dos kardex cuyo `stock_antes`/`stock_despues` ya no
encadenaría, y cambiaría de dueño ventas que tienen su propio costo congelado.

Lo que sí viaja es lo vivo: la existencia —como una salida del que sobra y una
entrada del que se conserva, al costo que traía, para que los dos kardex cuadren
y el costo promedio se pondere— y la disponibilidad por sucursal.
"""
import re
import unicodedata
from collections import defaultdict
from decimal import Decimal
from difflib import SequenceMatcher

from django.db import transaction
from django.db.models import Count, Sum
from django.utils import timezone

from apps.inventory.events import publicar_producto_fusionado
from apps.inventory.repositories.producto_repository import clave_codigo_barras
from apps.inventory.services.movimiento_service import MovimientoService
from apps.inventory.services.presentacion_service import PresentacionService
from apps.inventory.services.producto_service import ProductoService, _valor_serializable

COMPRAS_ABIERTAS = ('borrador', 'activo', 'recibida_parcial')

# Los datos de la ficha que se pueden tomar de cualquiera de las dos.
CAMPOS_ELEGIBLES = (
    'nombre', 'codigo_barras', 'precio_venta', 'precio_mayoreo', 'precio_compra',
    'categoria_id', 'impuesto_id', 'imagen_url', 'descripcion',
)
# Los que la fusión masiva completa sola, con el valor que cuenta como "sin capturar".
_VACIOS = {'precio_venta': 0, 'precio_compra': 0, 'imagen_url': '', 'categoria_id': None, 'impuesto_id': None}


class FusionBloqueada(Exception):
    """El par no se puede fusionar en automático; `motivos` dice por qué."""

    def __init__(self, motivos):
        self.motivos = list(motivos)
        super().__init__('; '.join(self.motivos))


# Hasta cuánto pueden diferir dos precios para seguir siendo el mismo artículo:
# unos pesos son la sucursal que no actualizó, no otro producto.
TOLERANCIA_PRECIO = Decimal('5')
# Un nombre más largo que esto no es el que alguien escribió en el mostrador:
# viene de un catálogo externo ("2020 Mexico Monster Energy Drink Lo-carb...").
NOMBRE_MAX = 50
# Y cuánto dos cifras del nombre: "960ML" y "1L" son el mismo envase.
TOLERANCIA_CIFRA = 0.10

_A_BASE = {'kg': 1000, 'k': 1000, 'l': 1000, 'lt': 1000, 'lts': 1000}


def _tokens(nombre):
    s = unicodedata.normalize('NFKD', nombre or '').encode('ascii', 'ignore').decode().lower()
    # "NARANJADA600ML": la cifra pegada a la palabra es otra palabra.
    s = re.sub(r'([a-z])(\d)', r'\1 \2', s)
    # "150 G" y "150G" son la misma cifra: se pega la unidad a su número.
    s = re.sub(r'(\d)\s+(g|gr|grs|kg|k|ml|l|lt|lts|pz|pza|pzas)\b', r'\1\2', s)
    return [t for t in (t.strip('.') for t in re.split(r'[^a-z0-9.]+', s)) if t]


def _cifras(tokens):
    """Cada cifra del nombre, como se escribió y llevada a gramos o mililitros."""
    cifras = []
    for t in tokens:
        m = re.fullmatch(r'(\d+(?:\.\d+)?)([a-z]*)', t)
        if m:
            valor = float(m.group(1))
            cifras.append((valor, valor * _A_BASE.get(m.group(2), 1)))
    return cifras


def _misma_cifra(a, b):
    # Se compara de las dos maneras porque la unidad falta o viene mal la mitad
    # de las veces: "1.5" contra "1.5L", "250G" contra "250ML".
    return any(
        abs(x - y) <= TOLERANCIA_CIFRA * max(x, y) for x, y in zip(a, b)
    )


def palabras_parecidas(a, b):
    """¿Casi todas las palabras del nombre más corto están en el más largo?

    Tolera erratas ("FEIJOLES"/"FRIJOLES") y una palabra de más o de menos de
    cada cuatro ("RAMEN MARUCHAN CAMARON PICANTE"/"RAMEN SABOR CAMARON
    PICANTE"). Las cifras no cuentan como palabras: si contaran, dos sabores con
    el mismo gramaje se parecerían de más.
    """
    pa, pb = ([t for t in _tokens(x) if not t[0].isdigit()] for x in (a, b))
    if not pa or not pb:
        return False
    corto, largo = (pa, pb) if len(pa) <= len(pb) else (pb, pa)

    def esta(tok):
        return any(tok == o or SequenceMatcher(None, tok, o).ratio() >= 0.8 for o in largo)

    return sum(1 for tok in corto if esta(tok)) / len(corto) >= 0.75


def cifras_compatibles(a, b):
    """¿Las cifras de los dos nombres hablan del mismo tamaño?

    "412ML" contra "413ML" es el mismo jugo; "500G" contra "1K" son dos
    productos. Un nombre sin cifras no contradice a nadie.
    """
    ca, cb = _cifras(_tokens(a)), _cifras(_tokens(b))
    pocas, muchas = (ca, cb) if len(ca) <= len(cb) else (cb, ca)
    return all(any(_misma_cifra(c, o) for o in muchas) for c in pocas)


def nombres_parecidos(a, b):
    """¿Los dos nombres describen el mismo artículo?

    Un mismo código de barras no basta: hay negocios que capturan un código
    comodín para toda una familia (los seis sabores del mismo refresco).
    """
    return palabras_parecidas(a, b) and cifras_compatibles(a, b)


def precios_compatibles(a, b):
    """¿Dos precios de venta pueden ser del mismo artículo?

    $0 no es un precio, es que nadie lo capturó. Entre precios de verdad se
    toleran unos pesos, pero nunca más de la mitad del más bajo: $3 contra $6
    no es la sucursal que no actualizó, es la pieza contra la cajita.
    """
    if not a or not b:
        return True
    diferencia = abs(a - b)
    return diferencia <= TOLERANCIA_PRECIO and diferencia * 2 <= min(a, b)


def nombre_mas_descriptivo(conservar, sobrantes):
    """El nombre con que debe quedar la ficha que se conserva.

    Es el suyo, salvo que no diga el tamaño y el de un duplicado sí ("GALLETAS
    LORS" / "GALLETAS LORS 98G"), o que sea un nombre de catálogo externo.
    """
    def sirve(nombre):
        return len(nombre) <= NOMBRE_MAX and bool(_cifras(_tokens(nombre)))

    if sirve(conservar.nombre):
        return conservar.nombre
    for s in sobrantes:
        if sirve(s.nombre):
            return s.nombre
    if len(conservar.nombre) > NOMBRE_MAX:
        for s in sobrantes:
            if len(s.nombre) <= NOMBRE_MAX:
                return s.nombre
    return conservar.nombre


class FusionProductosService:

    # ------------------------------------------------------------------
    # Propuesta
    # ------------------------------------------------------------------

    def proponer(self, empresa):
        """Grupos de productos activos que comparten código de barras.

        El mismo código con y sin ceros a la izquierda cuenta como uno; el
        grupo lleva el nombre de su escritura más larga, que es la que queda.

        Devuelve una lista de grupos; cada uno con sus productos y la acción
        sugerida para cada uno: `conservar`, `fusionar` o `revisar`. Sólo se
        propone fusionar lo que es duplicado sin lugar a dudas; lo demás queda
        en `revisar` con su motivo, para que lo decida una persona. `revisar`
        en el grupo significa que no hay nada que fusionar en él.
        """
        from apps.inventory.models import (
            Inventario, MovimientoInventario, Producto, ProductoSucursal,
        )
        from apps.purchases.models import DetalleCompra
        from apps.sales.models import DetalleVenta

        productos = list(
            Producto.objects.filter(empresa=empresa, activo=True)
            .exclude(codigo_barras='').select_related('unidad_medida')
        )
        grupos = defaultdict(list)
        for p in productos:
            grupos[clave_codigo_barras(p.codigo_barras)].append(p)
        grupos = {
            max((p.codigo_barras.strip() for p in v), key=len): v
            for k, v in grupos.items() if k and len(v) > 1
        }
        ids = [p.id for v in grupos.values() for p in v]

        def cuenta(modelo):
            return dict(
                modelo.objects.filter(producto_id__in=ids)
                .values_list('producto_id').annotate(n=Count('pk'))
            )

        ventas, compras, movimientos = (
            cuenta(DetalleVenta), cuenta(DetalleCompra), cuenta(MovimientoInventario),
        )
        stock = defaultdict(lambda: defaultdict(Decimal))
        for pid, suc, cant in Inventario.objects.filter(producto_id__in=ids).values_list(
            'producto_id', 'sucursal__nombre', 'stock_actual',
        ):
            stock[pid][suc] += cant
        disponibilidad = defaultdict(list)
        for pid, suc in ProductoSucursal.objects.filter(producto_id__in=ids).values_list(
            'producto_id', 'sucursal__nombre',
        ).order_by('sucursal__nombre'):
            disponibilidad[pid].append(suc)

        def con_existencia(p):
            return any(c > 0 for c in stock[p.id].values())

        propuesta = []
        for codigo, miembros in sorted(grupos.items()):
            # Se conserva la ficha que de verdad se usa: la que más veces sale
            # en una venta o en una compra, luego la que más movimientos tiene,
            # luego la que más existencia guarda, luego la más antigua.
            miembros.sort(key=lambda p: (
                -(ventas.get(p.id, 0) + compras.get(p.id, 0)), -movimientos.get(p.id, 0),
                -sum(stock[p.id].values()), p.created_at,
            ))
            conservar, sobrantes = miembros[0], miembros[1:]
            del_grupo = [] if codigo.isdigit() else ['código comodín, no es un código de barras']

            # Cada duplicado se juzga contra la ficha que se conserva: uno que
            # no pasa se queda en revisión sin detener a los demás del grupo.
            motivos, notas = {}, {}
            for s in sobrantes:
                m = list(del_grupo)
                if not precios_compatibles(conservar.precio_venta, s.precio_venta):
                    m.append(f'precio de venta distinto (más de ${TOLERANCIA_PRECIO} o de la mitad)')
                if not cifras_compatibles(conservar.nombre, s.nombre):
                    m.append('el tamaño que dice el nombre no coincide')
                elif not palabras_parecidas(conservar.nombre, s.nombre):
                    # Mismo código, mismo precio, y una tiene piezas y la otra
                    # ni una: no son dos artículos en el anaquel, es uno
                    # capturado dos veces con otro nombre. Con existencia en las
                    # dos puede ser una familia con un solo código (los sabores).
                    if con_existencia(conservar) != con_existencia(s):
                        notas[s.id] = 'nombre distinto; se fusiona porque sólo una de las dos tiene existencia'
                    else:
                        m.append('los nombres no parecen el mismo artículo')
                m.extend(self.bloqueos(conservar, s))
                motivos[s.id] = m
            fusionables = [s for s in sobrantes if not motivos[s.id]]
            nombre_final = nombre_mas_descriptivo(conservar, fusionables)

            filas = []
            for p in miembros:
                if p is conservar:
                    accion = 'conservar' if fusionables else 'revisar'
                    motivo = '' if fusionables else '; '.join(dict.fromkeys(
                        x for s in sobrantes for x in motivos[s.id]
                    ))
                else:
                    accion = 'revisar' if motivos[p.id] else 'fusionar'
                    motivo = '; '.join(motivos[p.id]) or notas.get(p.id, '')
                filas.append({
                    'grupo': codigo,
                    'accion': accion,
                    'codigo': p.codigo,
                    'codigo_barras': p.codigo_barras.strip(),
                    'nombre': p.nombre,
                    'nombre_final': (
                        nombre_final if p is conservar and fusionables and nombre_final != p.nombre else ''
                    ),
                    'precio_venta': p.precio_venta,
                    'ventas': ventas.get(p.id, 0),
                    'compras': compras.get(p.id, 0),
                    'movimientos': movimientos.get(p.id, 0),
                    'stock': {s: c for s, c in sorted(stock[p.id].items()) if c},
                    'sucursales': disponibilidad[p.id],
                    'motivo': motivo,
                })
            propuesta.append({'grupo': codigo, 'filas': filas, 'revisar': not fusionables})
        return propuesta

    # ------------------------------------------------------------------
    # Candados
    # ------------------------------------------------------------------

    def bloqueos(self, conservar, sobrante):
        """Por qué este par no se puede fusionar solo. Lista vacía = adelante.

        Todo lo que aquí frena es algo vivo que cuelga del producto que se va a
        retirar y que esta fusión no sabe mudar: quedaría apuntando a un
        producto borrado sin que nada lo avise.
        """
        from apps.inventory.models import (
            ComboComponente, Inventario, PresentacionProducto, RecetaLinea,
        )
        from apps.purchases.models import DetalleCompra

        motivos = []
        if conservar.pk == sobrante.pk:
            return ['es el mismo producto']
        if conservar.empresa_id != sobrante.empresa_id:
            return ['son de empresas distintas']
        if not conservar.activo:
            motivos.append('el que se conserva está borrado')
        if not sobrante.activo:
            motivos.append('ya está borrado')
        if conservar.tipo != sobrante.tipo:
            motivos.append(f'tipos distintos ({conservar.tipo} / {sobrante.tipo})')
        if (conservar.unidad_medida_id and sobrante.unidad_medida_id
                and conservar.unidad_medida_id != sobrante.unidad_medida_id):
            # La existencia se suma tal cual: piezas con kilos no se suman. Sin
            # unidad capturada (el alta rápida del escáner) cuenta como pieza,
            # que es como ya la trata el mostrador.
            motivos.append('unidades de medida distintas')
        if conservar.maneja_inventario != sobrante.maneja_inventario:
            motivos.append('uno maneja inventario y el otro no')
        if conservar.tiene_variantes or sobrante.tiene_variantes or sobrante.variantes.exists():
            motivos.append('tiene variantes')
        if PresentacionProducto.objects.filter(producto=sobrante, activo=True, es_base=False).exists():
            motivos.append('tiene presentaciones propias (cajas, paquetes)')
        if Inventario.objects.filter(producto=sobrante).exclude(stock_reservado=0).exists():
            motivos.append('tiene existencia reservada')
        if RecetaLinea.objects.filter(producto=sobrante).exists() \
                or RecetaLinea.objects.filter(insumo=sobrante).exists():
            motivos.append('participa en una receta')
        if ComboComponente.objects.filter(combo=sobrante).exists() \
                or ComboComponente.objects.filter(producto=sobrante).exists():
            motivos.append('participa en un combo')
        if DetalleCompra.objects.filter(
            producto=sobrante, compra__estado__in=COMPRAS_ABIERTAS,
        ).exists():
            # Al recibirse, esa mercancía entraría al producto ya retirado.
            motivos.append('está en una compra sin recibir')
        return motivos

    # ------------------------------------------------------------------
    # Fusión
    # ------------------------------------------------------------------

    @transaction.atomic
    def fusionar(self, empresa, conservar, sobrante, usuario=None, nombre=None, campos=None):
        """Deja `conservar` como la única ficha y retira `sobrante`.

        `nombre`, si viene, es con el que queda la ficha conservada (el más
        descriptivo del grupo, ver `nombre_mas_descriptivo`). `campos` dice,
        por cada dato de `CAMPOS_ELEGIBLES`, si se queda el de `'conservar'` o
        se toma el de `'sobrante'`.
        """
        from apps.inventory.models import Inventario, Producto

        # Bloquea las dos fichas, siempre en el mismo orden.
        bloqueados = {
            p.pk: p for p in Producto.objects.select_for_update()
            .filter(empresa=empresa, pk__in=[conservar.pk, sobrante.pk]).order_by('pk')
        }
        if len(bloqueados) != 2 and conservar.pk != sobrante.pk:
            raise FusionBloqueada(['alguno de los dos productos no es de esta empresa'])
        conservar = bloqueados.get(conservar.pk, conservar)
        sobrante = bloqueados.get(sobrante.pk, sobrante)

        motivos = self.bloqueos(conservar, sobrante)
        if motivos:
            raise FusionBloqueada(motivos)

        productos = ProductoService()
        movimientos = MovimientoService()

        # 1. Disponibilidad: el que se conserva pasa a manejarse también donde
        #    se manejaba el que sobra, o desaparecería de ese mostrador.
        heredadas = [
            sid for sid in productos.sucursales_de(sobrante)
            if sid not in set(productos.sucursales_de(conservar))
        ]
        if heredadas:
            productos.replicar_a_sucursales(empresa, [conservar.id], heredadas)

        # 2. Existencia: sale de uno y entra al otro, sucursal por sucursal.
        traspasado = {}
        renglones = (
            Inventario.objects.filter(empresa=empresa, producto=sobrante, variante=None)
            .exclude(stock_actual=0).select_related('sucursal')
        )
        for inv in renglones:
            cantidad, costo, sucursal = inv.stock_actual, inv.costo_promedio, inv.sucursal
            if cantidad > 0:
                movimientos.registrar_salida(
                    empresa, sucursal, sobrante, cantidad,
                    tipo_referencia='ajuste', referencia_id=conservar.id,
                    motivo=f'Fusión de duplicado: pasa a {conservar.codigo}', usuario=usuario,
                )
                movimientos.registrar_entrada(
                    empresa, sucursal, conservar, cantidad, costo_unitario=costo,
                    tipo_referencia='ajuste', referencia_id=sobrante.id,
                    motivo=f'Fusión de duplicado: viene de {sobrante.codigo}', usuario=usuario,
                )
            else:
                # Un faltante también es existencia: se salda en el que sobra y
                # se le carga al que se conserva, o desaparecería sin dejar rastro.
                movimientos.registrar_entrada(
                    empresa, sucursal, sobrante, -cantidad,
                    tipo_referencia='ajuste', referencia_id=conservar.id,
                    motivo=f'Fusión de duplicado: pasa a {conservar.codigo}', usuario=usuario,
                )
                movimientos.registrar_salida(
                    empresa, sucursal, conservar, -cantidad,
                    tipo_referencia='ajuste', referencia_id=sobrante.id,
                    motivo=f'Fusión de duplicado: viene de {sobrante.codigo}',
                    permitir_negativo=True, usuario=usuario,
                )
            traspasado[sucursal.nombre] = cantidad

        # 3. Los datos de la ficha. Sin instrucciones se completa lo que al que se
        #    conserva le falta y el otro sí tenía; `campos` es quien fusiona a
        #    mano diciendo, campo por campo, de cuál de los dos se queda el valor.
        campos = dict(campos or {})
        if nombre and nombre.strip() and 'nombre' not in campos:
            if nombre.strip() != conservar.nombre:
                campos['nombre'] = nombre.strip()
        invalidos = [c for c, v in campos.items() if c not in CAMPOS_ELEGIBLES
                     or (c != 'nombre' and v not in ('conservar', 'sobrante'))]
        if invalidos:
            raise FusionBloqueada([f'no se puede elegir el campo «{c}»' for c in invalidos])

        antes = {c: getattr(conservar, c) for c in CAMPOS_ELEGIBLES}
        anterior = (conservar.codigo_barras or '').strip()
        del_sobrante = (sobrante.codigo_barras or '').strip()
        for campo in CAMPOS_ELEGIBLES:
            eleccion = campos.get(campo)
            if eleccion == 'sobrante':
                valor = getattr(sobrante, campo)
            elif eleccion == 'conservar':
                continue
            elif eleccion:
                valor = eleccion  # un nombre escrito, no tomado de ninguno de los dos
            elif campo in _VACIOS and getattr(conservar, campo) in (_VACIOS[campo], None) \
                    and getattr(sobrante, campo) not in (_VACIOS[campo], None):
                valor = getattr(sobrante, campo)
            elif (campo == 'codigo_barras' and len(del_sobrante) > len(anterior)
                    and clave_codigo_barras(anterior) == clave_codigo_barras(del_sobrante)):
                # El mismo código escrito con más ceros es el completo (el UPC-A
                # de 12 que valida): ése es el que se queda.
                valor = del_sobrante
            else:
                continue
            setattr(conservar, campo, valor)
        completados = [c for c in CAMPOS_ELEGIBLES if getattr(conservar, c) != antes[c]]
        cambios = {
            c: {'anterior': _valor_serializable(antes[c]),
                'nuevo': _valor_serializable(getattr(conservar, c))}
            for c in completados
        }
        if 'imagen_url' in completados:
            conservar.imagen_origen = sobrante.imagen_origen
            completados.append('imagen_origen')
        if completados:
            conservar.save(update_fields=completados + ['updated_at'])
            # Lo que cobra el mostrador es la presentación base, no la ficha:
            # sin llevarlo ahí el producto quedaría con dos precios.
            base = PresentacionService().asegurar_base(empresa, conservar)
            espejo = [c for c in ('precio_venta', 'precio_compra', 'precio_mayoreo') if c in completados]
            if 'codigo_barras' in completados and (base.codigo_barras or '').strip() in ('', anterior):
                espejo.append('codigo_barras')
            if espejo:
                for campo in espejo:
                    setattr(base, campo, getattr(conservar, campo))
                base.save(update_fields=espejo + ['updated_at'])

        # 4. Se retira el que sobra. Soft delete, como cualquier borrado: sus
        #    ventas y su kardex siguen ahí.
        nota = f'Fusionado en {conservar.codigo} el {timezone.localdate().isoformat()}.'
        sobrante.activo = False
        sobrante.notas = f'{sobrante.notas}\n{nota}'.strip()
        sobrante.save(update_fields=['activo', 'notas', 'updated_at'])

        # 5. Auditoría: qué ficha absorbió a cuál, quién lo hizo y qué valores
        #    cambiaron. Los movimientos de existencia ya llevan su propio rastro.
        publicar_producto_fusionado(
            conservar, sobrante, cambios, usuario=usuario,
            existencia={s: float(c) for s, c in traspasado.items()},
        )

        return {
            'conservado': conservar.codigo,
            'conservado_id': str(conservar.id),
            'nombre': conservar.nombre,
            'retirado': sobrante.codigo,
            'sucursales_heredadas': len(heredadas),
            'existencia_traspasada': traspasado,
            'campos_completados': completados,
        }

    # ------------------------------------------------------------------
    # Fusión manual, desde la ficha del producto
    # ------------------------------------------------------------------

    def comparar(self, empresa, a, b):
        """Las dos fichas lado a lado, para que una persona decida la fusión.

        Devuelve qué tiene cada una, cuánto se usa, cuál conviene conservar, de
        cuál conviene tomar cada dato y qué impide fusionar en cada sentido.
        """
        from apps.inventory.models import Inventario, MovimientoInventario, ProductoSucursal
        from apps.purchases.models import DetalleCompra
        from apps.sales.models import DetalleVenta

        def ficha(p):
            existencia = [
                {'sucursal': nombre, 'cantidad': cantidad}
                for nombre, cantidad in Inventario.objects.filter(empresa=empresa, producto=p)
                .values_list('sucursal__nombre').annotate(c=Sum('stock_actual'))
                .order_by('sucursal__nombre') if cantidad
            ]
            return {
                'id': str(p.id),
                'codigo': p.codigo,
                'activo': p.activo,
                'nombre': p.nombre,
                'codigo_barras': (p.codigo_barras or '').strip(),
                'precio_venta': p.precio_venta,
                'precio_mayoreo': p.precio_mayoreo,
                'precio_compra': p.precio_compra,
                'categoria_id': str(p.categoria_id) if p.categoria_id else None,
                'categoria_nombre': p.categoria.nombre if p.categoria_id else '',
                'impuesto_id': str(p.impuesto_id) if p.impuesto_id else None,
                'impuesto_nombre': p.impuesto.nombre if p.impuesto_id else '',
                'imagen_url': p.imagen_url or '',
                'descripcion': p.descripcion or '',
                'unidad': p.unidad_medida.nombre if p.unidad_medida_id else '',
                'ventas': DetalleVenta.objects.filter(producto=p).count(),
                'compras': DetalleCompra.objects.filter(producto=p).count(),
                'movimientos': MovimientoInventario.objects.filter(producto=p).count(),
                'existencia': existencia,
                'existencia_total': sum((e['cantidad'] for e in existencia), Decimal(0)),
                'sucursales': list(
                    ProductoSucursal.objects.filter(producto=p)
                    .values_list('sucursal__nombre', flat=True).order_by('sucursal__nombre')
                ),
                'creado': p.created_at,
            }

        fichas = {p.id: ficha(p) for p in (a, b)}
        # La que de verdad se usa, con el mismo criterio que la propuesta masiva.
        conservar, sobrante = sorted((a, b), key=lambda p: (
            -(fichas[p.id]['ventas'] + fichas[p.id]['compras']), -fichas[p.id]['movimientos'],
            -fichas[p.id]['existencia_total'], p.created_at,
        ))

        sugeridos = {}
        for campo in CAMPOS_ELEGIBLES:
            de = conservar
            if campo == 'nombre':
                if nombre_mas_descriptivo(conservar, [sobrante]) == sobrante.nombre:
                    de = sobrante
            elif campo == 'codigo_barras':
                ca, cb = ((p.codigo_barras or '').strip() for p in (conservar, sobrante))
                if cb and (not ca or (clave_codigo_barras(ca) == clave_codigo_barras(cb) and len(cb) > len(ca))):
                    de = sobrante
            elif getattr(conservar, campo) in (_VACIOS.get(campo, ''), None, '') \
                    and getattr(sobrante, campo) not in (_VACIOS.get(campo, ''), None, ''):
                de = sobrante
            sugeridos[campo] = str(de.id)

        avisos = []
        ca, cb = ((p.codigo_barras or '').strip() for p in (a, b))
        if ca and cb and clave_codigo_barras(ca) != clave_codigo_barras(cb):
            avisos.append('Tienen códigos de barras distintos: el que no elijas dejará de '
                          'encontrarse al escanear.')
        if not cifras_compatibles(a.nombre, b.nombre):
            avisos.append('El tamaño que dice cada nombre no coincide.')
        elif not palabras_parecidas(a.nombre, b.nombre):
            avisos.append('Los nombres no parecen describir el mismo artículo.')
        if not precios_compatibles(a.precio_venta, b.precio_venta):
            avisos.append('Los precios de venta son muy distintos.')

        return {
            'productos': [fichas[a.id], fichas[b.id]],
            'campos': list(CAMPOS_ELEGIBLES),
            'sugerido_conservar': str(conservar.id),
            'sugeridos': sugeridos,
            # Por qué no se puede, según cuál de las dos se conserve.
            'bloqueos': {
                str(a.id): self.bloqueos(a, b),
                str(b.id): self.bloqueos(b, a),
            },
            'avisos': avisos,
        }

    def fusionar_a_mano(self, empresa, conservar, sobrante, elegidos=None, usuario=None):
        """Fusiona tomando cada dato de la ficha que la persona eligió.

        `elegidos` es `{campo: id del producto del que se toma}`; lo que no
        venga se queda como está en la ficha que se conserva.
        """
        campos = {}
        for campo, de in (elegidos or {}).items():
            if str(de) == str(conservar.id):
                campos[campo] = 'conservar'
            elif str(de) == str(sobrante.id):
                campos[campo] = 'sobrante'
            else:
                raise FusionBloqueada([f'«{campo}» no viene de ninguno de los dos productos'])
        # Lo no elegido se queda: aquí no aplica el "completar lo que falta" de
        # la fusión masiva, porque quien fusiona a mano ya vio los dos valores.
        for campo in CAMPOS_ELEGIBLES:
            campos.setdefault(campo, 'conservar')
        return self.fusionar(empresa, conservar, sobrante, usuario=usuario, campos=campos)
