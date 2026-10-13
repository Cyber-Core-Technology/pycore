import contextlib
import csv
import sys
from collections import defaultdict

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.core.models.empresa import Empresa
from apps.inventory.services.fusion_service import FusionBloqueada, FusionProductosService

COLUMNAS = [
    'grupo', 'accion', 'codigo', 'codigo_barras', 'nombre', 'nombre_final', 'precio_venta',
    'ventas', 'compras', 'movimientos', 'stock', 'sucursales', 'motivo',
]


class Command(BaseCommand):
    """Fusiona productos duplicados de una empresa, en dos pasos.

    1. `--proponer plan.csv` escribe los grupos que comparten código de barras
       y qué haría con cada ficha: `conservar`, `fusionar` o `revisar`. Sólo
       propone fusionar lo que es duplicado sin lugar a dudas (precio igual o
       casi, nombres que describen lo mismo); lo demás queda en `revisar` con
       su motivo. `nombre_final`, en la fila que se conserva, es el nombre con
       que queda cuando el de un duplicado es más descriptivo.
    2. Una persona revisa el archivo —puede cambiar la columna `accion`— y
       `--plan plan.csv` lo ejecuta. Cada grupo necesita exactamente una fila
       `conservar` y una o más `fusionar`; las filas `revisar` no se tocan.

    Ver `fusion_service` para qué viaja (existencia y disponibilidad) y qué no
    (el historial de ventas del producto que se retira se queda con él).
    """

    help = 'Fusiona productos duplicados: --proponer genera el plan, --plan lo ejecuta.'

    def add_arguments(self, parser):
        parser.add_argument('--empresa', required=True, help='Slug o id de la empresa.')
        parser.add_argument(
            '--proponer', nargs='?', const='-', metavar='ARCHIVO',
            help='Escribe el plan propuesto en ARCHIVO (o en pantalla).',
        )
        parser.add_argument('--plan', metavar='ARCHIVO', help='Ejecuta el plan revisado.')
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Con --plan: corre la fusión completa y la deshace. No escribe nada.',
        )
        parser.add_argument('--usuario', help='Correo a quien atribuir los movimientos.')

    def handle(self, *args, **opciones):
        empresa = Empresa.objects.filter(slug=opciones['empresa']).first()
        if empresa is None:
            try:
                empresa = Empresa.objects.filter(pk=opciones['empresa']).first()
            except Exception:
                empresa = None
        if empresa is None:
            raise CommandError(f'No existe la empresa «{opciones["empresa"]}».')

        if bool(opciones.get('proponer')) == bool(opciones.get('plan')):
            raise CommandError('Indica --proponer o --plan (uno de los dos).')

        if opciones.get('proponer'):
            self._proponer(empresa, opciones['proponer'])
        else:
            self._ejecutar(empresa, opciones['plan'], opciones['dry_run'], opciones.get('usuario'))

    # ------------------------------------------------------------------

    def _proponer(self, empresa, destino):
        propuesta = FusionProductosService().proponer(empresa)
        salida = sys.stdout if destino == '-' else open(destino, 'w', newline='', encoding='utf-8')
        try:
            w = csv.DictWriter(salida, fieldnames=COLUMNAS)
            w.writeheader()
            for grupo in propuesta:
                for fila in grupo['filas']:
                    w.writerow({
                        **fila,
                        'stock': ' | '.join(f'{s}: {c.normalize():f}' for s, c in fila['stock'].items()),
                        'sucursales': ' | '.join(fila['sucursales']),
                    })
        finally:
            if salida is not sys.stdout:
                salida.close()

        listos = [g for g in propuesta if not g['revisar']]
        self.stderr.write(
            f'{empresa.nombre}: {len(propuesta)} grupos duplicados — '
            f'{len(listos)} listos para fusionar '
            f'({sum(f["accion"] == "fusionar" for g in listos for f in g["filas"])} fichas de sobra), '
            f'{len(propuesta) - len(listos)} por revisar.'
        )

    # ------------------------------------------------------------------

    def _ejecutar(self, empresa, archivo, dry_run, correo):
        from apps.inventory.models import Producto

        usuario = None
        if correo:
            from apps.auth_module.models import Usuario
            usuario = Usuario.objects.filter(email=correo).first()
            if usuario is None:
                raise CommandError(f'No existe el usuario «{correo}».')

        grupos = defaultdict(lambda: {'conservar': [], 'fusionar': [], 'nombre': ''})
        with open(archivo, newline='', encoding='utf-8-sig') as f:
            for fila in csv.DictReader(f):
                accion = (fila.get('accion') or '').strip().lower()
                if accion in ('conservar', 'fusionar'):
                    grupo = grupos[(fila.get('grupo') or '').strip()]
                    grupo[accion].append((fila.get('codigo') or '').strip())
                    if accion == 'conservar':
                        grupo['nombre'] = (fila.get('nombre_final') or '').strip()

        servicio = FusionProductosService()
        hechos = saltados = 0
        # Sólo el ensayo va en una transacción única (es la que se deshace). La
        # ejecución real confirma grupo por grupo: una transacción de varios
        # segundos retiene los folios de movimiento que va tomando, y la venta
        # que se cobra mientras tanto choca con uno y se queda sin descontar su
        # inventario — pasó con una venta en la primera corrida real.
        with transaction.atomic() if dry_run else contextlib.nullcontext():
            for nombre_grupo, g in grupos.items():
                if len(g['conservar']) != 1 or not g['fusionar']:
                    self.stdout.write(self.style.WARNING(
                        f'[{nombre_grupo}] se salta: necesita exactamente una fila «conservar» '
                        f'y al menos una «fusionar».'
                    ))
                    saltados += 1
                    continue
                try:
                    # Un grupo se fusiona entero o no se toca.
                    with transaction.atomic():
                        conservar = self._producto(Producto, empresa, g['conservar'][0])
                        for codigo in g['fusionar']:
                            r = servicio.fusionar(
                                empresa, conservar, self._producto(Producto, empresa, codigo),
                                usuario=usuario, nombre=g['nombre'] or None,
                            )
                            existencia = ', '.join(
                                f'{s} {c.normalize():f}' for s, c in r['existencia_traspasada'].items()
                            ) or 'sin existencia'
                            self.stdout.write(
                                f'[{nombre_grupo}] {r["retirado"]} → {r["conservado"]} · {existencia}'
                                + (f' · +{r["sucursales_heredadas"]} sucursal(es)'
                                   if r['sucursales_heredadas'] else '')
                                + (f' · queda como «{r["nombre"]}»'
                                   if 'nombre' in r['campos_completados'] else '')
                            )
                            hechos += 1
                except FusionBloqueada as e:
                    self.stdout.write(self.style.WARNING(f'[{nombre_grupo}] se salta: {e}'))
                    saltados += 1
            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(
            f'{"[dry-run] se fusionarían" if dry_run else "Fusionadas"} {hechos} fichas; '
            f'{saltados} grupo(s) saltado(s).'
        ))

    def _producto(self, Producto, empresa, codigo):
        encontrados = list(Producto.objects.filter(empresa=empresa, codigo=codigo)[:2])
        if len(encontrados) != 1:
            raise FusionBloqueada([
                f'el código {codigo} ' + ('no existe' if not encontrados else 'no es único')
            ])
        return encontrados[0]
