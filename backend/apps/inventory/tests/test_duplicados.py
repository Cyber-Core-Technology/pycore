"""
Productos duplicados: que no se vuelvan a crear, que lo quitado de una sucursal
deje de verse ahí, y que fusionar dos fichas no pierda existencia.

El caso es real: un minisúper de tres sucursales acumuló 106 códigos de barras
repetidos. El alta no revisaba el código, la carga por archivo sólo comparaba el
nombre exacto, y lo que se "borraba" seguía saliendo en la pestaña Stock.
"""
from decimal import Decimal

import pytest

from apps.inventory.exceptions import CodigoBarrasDuplicadoException
from apps.inventory.models import Inventario, MovimientoInventario, ProductoSucursal
from apps.inventory.repositories import InventarioRepository
from apps.inventory.services import MovimientoService, ProductoService
from apps.inventory.services.fusion_service import (
    FusionBloqueada, FusionProductosService, nombres_parecidos,
)

CODIGO = '7501018310516'


@pytest.fixture
def empresa(db):
    from apps.core.models import Empresa, Sucursal
    empresa = Empresa.objects.create(
        nombre='Minisúper Tres', slug='minisuper-tres',
        tipo_negocio='informal', giro_negocio='abarrotes', plan='basico',
    )
    Sucursal.objects.create(empresa=empresa, nombre='Centro', codigo='SUC001',
                            es_principal=True, activo=True)
    Sucursal.objects.create(empresa=empresa, nombre='Norte', codigo='SUC002',
                            es_principal=False, activo=True)
    return empresa


@pytest.fixture
def sucursales(empresa):
    from apps.core.models import Sucursal
    return list(Sucursal.objects.filter(empresa=empresa).order_by('codigo'))


@pytest.fixture
def servicio():
    return ProductoService()


def _duplicar_a_la_mala(empresa, servicio, nombre, **campos):
    """Un duplicado como los que ya existen en producción: creado antes de que
    el alta revisara el código."""
    producto = servicio.crear(empresa, {'nombre': nombre, 'precio_venta': 10, **campos})
    type(producto).objects.filter(pk=producto.pk).update(codigo_barras=CODIGO)
    producto.refresh_from_db()
    return producto


@pytest.mark.django_db
class TestAltaConCodigoRepetido:

    def test_el_alta_rechaza_un_codigo_que_ya_existe(self, empresa, servicio):
        servicio.crear(empresa, {'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': CODIGO})
        with pytest.raises(CodigoBarrasDuplicadoException):
            servicio.crear(empresa, {'nombre': 'Codo 1 200g', 'precio_venta': 10, 'codigo_barras': CODIGO})

    def test_el_error_dice_donde_esta_y_donde_falta(self, empresa, sucursales, servicio):
        # El caso que más duplicados produjo: existe en Centro, quien captura
        # está en Norte y no lo ve en su lista.
        centro, norte = sucursales
        existente = servicio.crear(empresa, {
            'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': CODIGO,
            'sucursales': [centro.id_sucursal],
        })
        with pytest.raises(CodigoBarrasDuplicadoException) as error:
            servicio.crear(empresa, {
                'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': f' {CODIGO} ',
                'sucursales': [norte.id_sucursal],
            })
        detalle = error.value.detail
        assert detalle['code'] == 'codigo_barras_duplicado'
        assert detalle['producto']['id'] == str(existente.id)
        assert [s['nombre'] for s in detalle['producto']['sucursales']] == ['Centro']
        assert detalle['falta_en'] == [str(norte.id_sucursal)]

    def test_un_producto_borrado_no_estorba(self, empresa, servicio):
        viejo = servicio.crear(empresa, {'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': CODIGO})
        servicio.eliminar(empresa, viejo.id)
        nuevo = servicio.crear(empresa, {'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': CODIGO})
        assert nuevo.activo

    def test_otra_empresa_puede_usar_el_mismo_codigo(self, empresa, servicio):
        from apps.core.models import Empresa
        otra = Empresa.objects.create(
            nombre='Otra', slug='otra-empresa',
            tipo_negocio='informal', giro_negocio='abarrotes', plan='basico',
        )
        servicio.crear(empresa, {'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': CODIGO})
        assert servicio.crear(otra, {'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': CODIGO})

    def test_sin_codigo_no_hay_choque(self, empresa, servicio):
        servicio.crear(empresa, {'nombre': 'Bolillo', 'precio_venta': 3})
        assert servicio.crear(empresa, {'nombre': 'Telera', 'precio_venta': 3, 'codigo_barras': ''})

    def test_editar_no_puede_tomar_el_codigo_de_otro(self, empresa, servicio):
        servicio.crear(empresa, {'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': CODIGO})
        otro = servicio.crear(empresa, {'nombre': 'Codo 2', 'precio_venta': 10})
        with pytest.raises(CodigoBarrasDuplicadoException):
            servicio.actualizar(empresa, otro.id, {'codigo_barras': CODIGO})

    def test_un_duplicado_que_ya_existia_se_puede_seguir_editando(self, empresa, servicio):
        # Mientras se depuran, a los duplicados viejos hay que poder cambiarles
        # el precio: sólo se revisa el código cuando cambia.
        servicio.crear(empresa, {'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': CODIGO})
        gemelo = _duplicar_a_la_mala(empresa, servicio, 'Codo 1 200g')
        editado = servicio.actualizar(empresa, gemelo.id, {'precio_venta': 12, 'codigo_barras': CODIGO})
        assert editado.precio_venta == 12

    def test_reactivar_un_borrado_no_resucita_un_duplicado(self, empresa, servicio):
        viejo = servicio.crear(empresa, {'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': CODIGO})
        servicio.eliminar(empresa, viejo.id)
        servicio.crear(empresa, {'nombre': 'Codo 1', 'precio_venta': 10, 'codigo_barras': CODIGO})
        with pytest.raises(CodigoBarrasDuplicadoException):
            servicio.actualizar(empresa, viejo.id, {'activo': True})


@pytest.mark.django_db
class TestImportacion:

    def test_la_carga_omite_el_codigo_que_ya_existe_aunque_cambie_el_nombre(self, empresa, servicio):
        from apps.inventory.services.importacion_service import procesar_importacion
        servicio.crear(empresa, {'nombre': 'LA MODERNA CODO 1 200G', 'precio_venta': 10, 'codigo_barras': CODIGO})

        resultado = procesar_importacion(empresa, [
            {'nombre': 'LA MODERNA CODO 1', 'precio_venta': '10', 'codigo_barras': CODIGO},
            {'nombre': 'Estrella', 'precio_venta': '10', 'codigo_barras': '7501018310318'},
            {'nombre': 'Estrella 200g', 'precio_venta': '10', 'codigo_barras': '7501018310318'},
        ], modo='parcial')

        assert resultado['creados'] == 1
        mensajes = {f['nombre']: f.get('mensaje') or '' for f in resultado['filas'] if f['estado'] == 'omitido'}
        assert 'LA MODERNA CODO 1 200G' in mensajes['LA MODERNA CODO 1']
        assert 'repetido en el archivo' in mensajes['Estrella 200g'].lower()


@pytest.mark.django_db
class TestStockRespetaDisponibilidad:

    def test_lo_quitado_de_una_sucursal_deja_de_salir_en_su_stock(self, empresa, sucursales, servicio):
        centro, norte = sucursales
        producto = servicio.crear(empresa, {'nombre': 'Pan dulce', 'precio_venta': 8})
        repo = InventarioRepository()
        assert repo.get_by_sucursal(empresa, norte).filter(producto=producto).exists()

        servicio.eliminar(empresa, producto.id, sucursal_id=norte.id_sucursal)

        # El renglón sigue en la base (vuelve si se rehabilita), pero no se lista.
        assert Inventario.objects.filter(producto=producto, sucursal=norte).exists()
        assert not repo.get_by_sucursal(empresa, norte).filter(producto=producto).exists()
        assert repo.get_by_sucursal(empresa, centro).filter(producto=producto).exists()
        assert set(repo.get_by_empresa(empresa).filter(producto=producto)
                   .values_list('sucursal_id', flat=True)) == {centro.id_sucursal}

    def test_al_rehabilitar_vuelve_con_su_existencia(self, empresa, sucursales, servicio):
        _centro, norte = sucursales
        producto = servicio.crear(empresa, {'nombre': 'Pan dulce', 'precio_venta': 8})
        MovimientoService().registrar_entrada(empresa, norte, producto, 29, costo_unitario=4)
        servicio.eliminar(empresa, producto.id, sucursal_id=norte.id_sucursal)

        servicio.replicar_a_sucursales(empresa, [producto.id], [norte.id_sucursal])

        renglon = InventarioRepository().get_by_sucursal(empresa, norte).get(producto=producto)
        assert renglon.stock_actual == 29


@pytest.mark.django_db
class TestFusion:

    def _par(self, empresa, sucursales, servicio):
        centro, norte = sucursales
        conservar = servicio.crear(empresa, {
            'nombre': 'VASO PLASTICO 8', 'precio_venta': 33, 'codigo_barras': CODIGO,
            'sucursales': [centro.id_sucursal],
        })
        sobrante = _duplicar_a_la_mala(
            empresa, servicio, 'VASO TRANS PLASTICO 8', precio_venta=33, precio_compra=20,
            sucursales=[centro.id_sucursal, norte.id_sucursal],
        )
        return conservar, sobrante

    def test_la_existencia_pasa_al_que_se_conserva(self, empresa, sucursales, servicio):
        centro, norte = sucursales
        conservar, sobrante = self._par(empresa, sucursales, servicio)
        movs = MovimientoService()
        movs.registrar_entrada(empresa, centro, conservar, 10, costo_unitario=20)
        movs.registrar_entrada(empresa, centro, sobrante, 10, costo_unitario=30)
        movs.registrar_entrada(empresa, norte, sobrante, 4, costo_unitario=30)

        FusionProductosService().fusionar(empresa, conservar, sobrante)

        en_centro = Inventario.objects.get(producto=conservar, sucursal=centro, variante=None)
        en_norte = Inventario.objects.get(producto=conservar, sucursal=norte, variante=None)
        assert en_centro.stock_actual == 20
        # El costo se pondera con lo que traía cada ficha, no se pisa.
        assert en_centro.costo_promedio == Decimal('25')
        assert en_norte.stock_actual == 4
        assert not Inventario.objects.filter(producto=sobrante).exclude(stock_actual=0).exists()

    def test_hereda_las_sucursales_y_el_sobrante_queda_borrado(self, empresa, sucursales, servicio):
        conservar, sobrante = self._par(empresa, sucursales, servicio)

        FusionProductosService().fusionar(empresa, conservar, sobrante)

        sobrante.refresh_from_db()
        conservar.refresh_from_db()
        assert not sobrante.activo
        assert conservar.codigo in sobrante.notas
        assert set(servicio.sucursales_de(conservar)) == {s.id_sucursal for s in sucursales}
        # Lo que le faltaba al que se conserva se toma del otro.
        assert conservar.precio_compra == 20
        assert servicio.duplicado_por_codigo_barras(empresa, CODIGO, excluir_id=conservar.id) is None

    def test_el_kardex_de_los_dos_cuadra(self, empresa, sucursales, servicio):
        centro, _norte = sucursales
        conservar, sobrante = self._par(empresa, sucursales, servicio)
        MovimientoService().registrar_entrada(empresa, centro, sobrante, 7, costo_unitario=20)

        FusionProductosService().fusionar(empresa, conservar, sobrante)

        salida = MovimientoInventario.objects.filter(producto=sobrante).order_by('created_at').last()
        entrada = MovimientoInventario.objects.filter(producto=conservar).order_by('created_at').last()
        assert (salida.tipo_movimiento, salida.stock_antes, salida.stock_despues) == ('salida', 7, 0)
        assert (entrada.tipo_movimiento, entrada.stock_antes, entrada.stock_despues) == ('entrada', 0, 7)

    def test_un_faltante_tambien_viaja(self, empresa, sucursales, servicio):
        centro, _norte = sucursales
        conservar, sobrante = self._par(empresa, sucursales, servicio)
        movs = MovimientoService()
        movs.registrar_entrada(empresa, centro, conservar, 5, costo_unitario=20)
        movs.registrar_salida(empresa, centro, sobrante, 2, permitir_negativo=True)

        FusionProductosService().fusionar(empresa, conservar, sobrante)

        assert Inventario.objects.get(producto=conservar, sucursal=centro, variante=None).stock_actual == 3
        assert Inventario.objects.get(producto=sobrante, sucursal=centro, variante=None).stock_actual == 0

    def test_no_fusiona_si_el_sobrante_tiene_presentaciones_propias(self, empresa, sucursales, servicio):
        from apps.inventory.models import PresentacionProducto
        conservar, sobrante = self._par(empresa, sucursales, servicio)
        PresentacionProducto.objects.create(
            empresa=empresa, producto=sobrante, nombre='Caja', factor=Decimal('24'),
            precio_venta=Decimal('700'),
        )
        with pytest.raises(FusionBloqueada):
            FusionProductosService().fusionar(empresa, conservar, sobrante)
        sobrante.refresh_from_db()
        assert sobrante.activo

    def test_la_propuesta_solo_fusiona_lo_indudable(self, empresa, sucursales, servicio):
        servicio.crear(empresa, {'nombre': 'LA MODERNA CODO 1 200G', 'precio_venta': 10, 'codigo_barras': CODIGO})
        _duplicar_a_la_mala(empresa, servicio, 'LA MODERNA CODO 1')
        # Mismo código, sabores distintos: un código comodín para la familia.
        a = servicio.crear(empresa, {'nombre': 'CABALLITO TAMARINDO 500ML', 'precio_venta': 10,
                                     'codigo_barras': '744886026036'})
        b = servicio.crear(empresa, {'nombre': 'CABALLITO PIÑA 500ML', 'precio_venta': 10})
        type(b).objects.filter(pk=b.pk).update(codigo_barras=a.codigo_barras)

        propuesta = {g['grupo']: g for g in FusionProductosService().proponer(empresa)}

        assert sorted(f['accion'] for f in propuesta[CODIGO]['filas']) == ['conservar', 'fusionar']
        assert {f['accion'] for f in propuesta['744886026036']['filas']} == {'revisar'}

    def test_el_precio_en_cero_se_toma_del_duplicado(self, empresa, sucursales, servicio):
        from apps.inventory.services.presentacion_service import PresentacionService
        # La ficha que más se usa es la que nadie le puso precio.
        conservar = servicio.crear(empresa, {'nombre': 'COCA COLA 3L', 'precio_venta': 0, 'codigo_barras': CODIGO})
        sobrante = _duplicar_a_la_mala(empresa, servicio, 'COCA 3L', precio_venta=52)

        propuesta = FusionProductosService().proponer(empresa)
        assert not propuesta[0]['revisar']

        FusionProductosService().fusionar(empresa, conservar, sobrante)

        conservar.refresh_from_db()
        assert conservar.precio_venta == 52
        # El mostrador cobra la presentación base: también tiene que moverse.
        assert PresentacionService().base_de(conservar).precio_venta == 52

    def test_un_precio_capturado_no_se_pisa(self, empresa, sucursales, servicio):
        conservar = servicio.crear(empresa, {'nombre': 'COCA COLA 3L', 'precio_venta': 52, 'codigo_barras': CODIGO})
        sobrante = _duplicar_a_la_mala(empresa, servicio, 'COCA 3L', precio_venta=0)
        otro = _duplicar_a_la_mala(empresa, servicio, 'COCA COLA 3 L', precio_venta=60)

        # $0 contra un precio no estorba; dos precios de verdad y lejanos sí,
        # y el que no pasa no detiene al otro.
        (grupo,) = FusionProductosService().proponer(empresa)
        assert {f['codigo']: f['accion'] for f in grupo['filas']} == {
            conservar.codigo: 'conservar', sobrante.codigo: 'fusionar', otro.codigo: 'revisar',
        }

        FusionProductosService().fusionar(empresa, conservar, sobrante)
        conservar.refresh_from_db()
        assert conservar.precio_venta == 52

    def test_unos_pesos_de_diferencia_se_fusionan_con_el_precio_del_mas_usado(self, empresa, sucursales, servicio):
        poco_usado = servicio.crear(empresa, {'nombre': 'LECHE LALA CUARTITO 250ML', 'precio_venta': 14,
                                              'codigo_barras': CODIGO})
        usado = _duplicar_a_la_mala(empresa, servicio, 'LECHE LALA 250ML', precio_venta=12)
        MovimientoService().registrar_entrada(empresa, sucursales[0], usado, 5, costo_unitario=9)

        (grupo,) = FusionProductosService().proponer(empresa)
        assert [(f['accion'], f['codigo']) for f in grupo['filas']] == [
            ('conservar', usado.codigo), ('fusionar', poco_usado.codigo),
        ]

        FusionProductosService().fusionar(empresa, usado, poco_usado)
        usado.refresh_from_db()
        assert usado.precio_venta == 12

    def test_pieza_contra_cajita_no_es_una_diferencia_de_unos_pesos(self, empresa, sucursales, servicio):
        servicio.crear(empresa, {'nombre': 'KNORR SUIZA 21G', 'precio_venta': 3, 'codigo_barras': CODIGO})
        _duplicar_a_la_mala(empresa, servicio, 'KNORR SUIZA 21G', precio_venta=6)
        assert FusionProductosService().proponer(empresa)[0]['revisar']

    def test_otro_nombre_se_fusiona_si_solo_una_tiene_existencia(self, empresa, sucursales, servicio):
        usada = servicio.crear(empresa, {'nombre': 'SALSA VALENTINA 370ML', 'precio_venta': 18,
                                         'codigo_barras': CODIGO})
        otra = _duplicar_a_la_mala(empresa, servicio, 'MEXICAN HOT SAUCE', precio_venta=18)
        MovimientoService().registrar_entrada(empresa, sucursales[0], usada, 3, costo_unitario=12)
        assert not FusionProductosService().proponer(empresa)[0]['revisar']

        # Con piezas de las dos en el anaquel puede ser una familia con un solo código.
        MovimientoService().registrar_entrada(empresa, sucursales[0], otra, 2, costo_unitario=12)
        assert FusionProductosService().proponer(empresa)[0]['revisar']

    def test_queda_el_nombre_que_dice_el_tamano(self, empresa, sucursales, servicio):
        usada = servicio.crear(empresa, {'nombre': 'LA MODERNA LETRA', 'precio_venta': 10, 'codigo_barras': CODIGO})
        otra = _duplicar_a_la_mala(empresa, servicio, 'LA MODERNA LETRA 200G')
        MovimientoService().registrar_entrada(empresa, sucursales[0], usada, 3, costo_unitario=7)

        (grupo,) = FusionProductosService().proponer(empresa)
        assert grupo['filas'][0]['nombre_final'] == 'LA MODERNA LETRA 200G'

        FusionProductosService().fusionar(empresa, usada, otra, nombre=grupo['filas'][0]['nombre_final'])
        usada.refresh_from_db()
        assert usada.nombre == 'LA MODERNA LETRA 200G'

    def test_el_mismo_codigo_con_y_sin_cero_es_un_duplicado(self, empresa, sucursales, servicio):
        from apps.inventory.services.barcode_service import barcode_service
        from apps.inventory.services.presentacion_service import PresentacionService
        corto = servicio.crear(empresa, {'nombre': 'RAMEN MARUCHAN CAMARON 85G', 'precio_venta': 10,
                                         'codigo_barras': '41789002977'})
        largo = servicio.crear(empresa, {'nombre': 'RAMEN CAMARON', 'precio_venta': 10})
        type(largo).objects.filter(pk=largo.pk).update(codigo_barras='041789002977')
        largo.refresh_from_db()
        MovimientoService().registrar_entrada(empresa, sucursales[0], corto, 3, costo_unitario=6)

        (grupo,) = FusionProductosService().proponer(empresa)
        assert grupo['grupo'] == '041789002977' and not grupo['revisar']

        FusionProductosService().fusionar(empresa, corto, largo)

        corto.refresh_from_db()
        # Se queda la ficha más usada, con el código completo.
        assert corto.codigo_barras == '041789002977'
        assert PresentacionService().base_de(corto).codigo_barras == '041789002977'
        # Los dos lectores lo encuentran, y ninguno de los dos lo puede volver a dar de alta.
        for leido in ('41789002977', '041789002977', '0041789002977'):
            assert barcode_service._buscar_interno(empresa, leido)['id_producto'] == str(corto.id)
            with pytest.raises(CodigoBarrasDuplicadoException):
                servicio.crear(empresa, {'nombre': 'RAMEN OTRA VEZ', 'precio_venta': 10, 'codigo_barras': leido})

    def test_a_mano_se_elige_de_cual_se_toma_cada_dato(self, empresa, sucursales, servicio):
        from apps.inventory.services.presentacion_service import PresentacionService
        queda = servicio.crear(empresa, {'nombre': 'SALSA VALENTINA 1L', 'precio_venta': 35,
                                         'codigo_barras': '97339000030'})
        sale = servicio.crear(empresa, {'nombre': 'Valentina Mexican Hot Sauce 34 fl oz', 'precio_venta': 38,
                                        'precio_compra': 22, 'codigo_barras': '7501000000001'})
        MovimientoService().registrar_entrada(empresa, sucursales[0], sale, 2, costo_unitario=22)

        comparacion = FusionProductosService().comparar(empresa, queda, sale)
        assert {f['id'] for f in comparacion['productos']} == {str(queda.id), str(sale.id)}
        assert comparacion['avisos']  # códigos distintos: hay que avisarlo

        FusionProductosService().fusionar_a_mano(empresa, queda, sale, elegidos={
            'nombre': str(queda.id), 'precio_venta': str(sale.id), 'codigo_barras': str(sale.id),
        })

        queda.refresh_from_db()
        sale.refresh_from_db()
        assert (queda.nombre, queda.precio_venta, queda.codigo_barras) == ('SALSA VALENTINA 1L', 38, '7501000000001')
        # Lo que nadie eligió se queda como estaba: aquí no se "completa" nada solo.
        assert queda.precio_compra == 0
        assert PresentacionService().base_de(queda).precio_venta == 38
        assert not sale.activo
        assert Inventario.objects.get(producto=queda, sucursal=sucursales[0], variante=None).stock_actual == 2

    def test_a_mano_no_acepta_un_valor_de_un_tercer_producto(self, empresa, sucursales, servicio):
        queda = servicio.crear(empresa, {'nombre': 'COCA COLA 3L', 'precio_venta': 52, 'codigo_barras': CODIGO})
        sale = _duplicar_a_la_mala(empresa, servicio, 'COCA 3L', precio_venta=52)
        tercero = servicio.crear(empresa, {'nombre': 'PEPSI 3L', 'precio_venta': 40})
        with pytest.raises(FusionBloqueada):
            FusionProductosService().fusionar_a_mano(empresa, queda, sale, elegidos={'nombre': str(tercero.id)})
        sale.refresh_from_db()
        assert sale.activo


@pytest.mark.django_db
class TestComando:

    def test_propone_y_ejecuta_el_plan(self, empresa, sucursales, servicio, tmp_path):
        from django.core.management import call_command
        centro, _norte = sucursales
        conservar = servicio.crear(empresa, {'nombre': 'LA MODERNA CODO 1 200G', 'precio_venta': 10,
                                             'codigo_barras': CODIGO})
        sobrante = _duplicar_a_la_mala(empresa, servicio, 'LA MODERNA CODO 1')
        # Sin ventas de por medio se conserva la ficha con más existencia.
        MovimientoService().registrar_entrada(empresa, centro, conservar, 6, costo_unitario=5)
        MovimientoService().registrar_entrada(empresa, centro, sobrante, 1, costo_unitario=5)
        plan = tmp_path / 'plan.csv'

        call_command('fusionar_productos', empresa=empresa.slug, proponer=str(plan))
        assert 'fusionar' in plan.read_text()

        # El ensayo corre la fusión entera y la deshace.
        call_command('fusionar_productos', empresa=empresa.slug, plan=str(plan), dry_run=True)
        sobrante.refresh_from_db()
        assert sobrante.activo
        assert Inventario.objects.get(producto=sobrante, sucursal=centro, variante=None).stock_actual == 1

        call_command('fusionar_productos', empresa=empresa.slug, plan=str(plan))
        sobrante.refresh_from_db()
        assert not sobrante.activo
        assert Inventario.objects.get(producto=conservar, sucursal=centro, variante=None).stock_actual == 7


@pytest.mark.parametrize('a, b, iguales', [
    ('QUESO RANCHERO EL LECHERO 150 G', 'QUESO RANCHERO EL LECHERO 150G', True),
    ('LA MODERNA CODO 1 200G', 'LA MODERNA CODO 1', True),
    ('FABULOSO FRESCA PRIMAVER 1L', 'FABULOSO FRESCA PRIMAVERA 1L', True),
    ('PASTA DENTAL COLGATE TRIPLE ACCION 75ML', 'COLGATE TRIPLE ACCION 75ml', True),
    ('CABALLITO TAMARINDO 500ML', 'CABALLITO CERVEZA DE RAIZ 500ML', False),
    ('TORTILLAS DE HARINA JUAN PABLO 1K', 'TORTILLAS DE HARINA JUAN PABLO 500G', False),
    ('SALSA VALENTINA 370ML', 'MEXICAN HOT SAUCE', False),
    # Las cifras toleran la errata y la unidad que falta, no otro tamaño.
    ('TOPO CHICO NARANJADA600ML', 'TOPO CHICO NARANJADA 600ML', True),
    ('YOMI LALA CHOCOLATE 960ML', 'YOMI LALA CHOCOLATE 1L', True),
    ('CLOROX BLANCO 930ML', 'CLOROX BLANCO 930', True),
    ('SALSA CATSUP CLEMENTE JACQUES 408G', 'SALSA CATSUP CLEMENTE JACQUES 340G', False),
    ('LA MODERNA CODO 1 200G', 'LA MODERNA CODO 2 200G', False),
    ('ALPURA YOGURTH MANGO 220G', 'ALPURA YOGURTH PIÑA COCO 220G', False),
    ('RAMEN MARUCHAN CAMARON PICANTE 85G', 'RAMEN SABOR CAMARON PICANTE', True),
    ('MONSTER ENERGY 473', '2020 Mexico Monster Energy Drink Lo-carb + Original Cans 473 Ml. Empty', True),
])
def test_nombres_parecidos(a, b, iguales):
    assert nombres_parecidos(a, b) is iguales
