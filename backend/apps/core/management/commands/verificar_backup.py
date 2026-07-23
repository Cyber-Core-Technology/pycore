"""
Verifica que un backup de S3 se pueda restaurar de verdad.

Un backup que nunca se ha restaurado no es un backup: es un archivo. Este
comando baja el respaldo, lo restaura en una base desechable, cuenta lo que
quedó dentro y borra la base al terminar. La base de producción no se toca
en ningún momento.

Uso:
    python manage.py verificar_backup                  # el más reciente
    python manage.py verificar_backup --key daily/2026-07-23/pycore_backup_....sql.gz
    python manage.py verificar_backup --conservar      # no borra la BD temporal
"""
import gzip
import os
import shutil
import subprocess
import tempfile

import boto3
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from apps.core.tasks import prefijo_backup

# Tablas que deben traer filas en cualquier instalación con datos reales.
# Si el dump restaura pero estas salen vacías, el respaldo no sirve.
TABLAS_CLAVE = [
    'core_empresa',
    'auth_usuarios',
]


class Command(BaseCommand):
    help = 'Restaura un backup de S3 en una BD desechable y valida su contenido.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--key',
            help='Clave S3 del backup. Por defecto, el más reciente de daily/.',
        )
        parser.add_argument(
            '--conservar',
            action='store_true',
            help='No borrar la base temporal al terminar (para inspeccionarla).',
        )

    # ── helpers ──────────────────────────────────────────────────────────────

    def _psql_env(self):
        env = os.environ.copy()
        env['PGPASSWORD'] = settings.DATABASES['default']['PASSWORD']
        return env

    def _psql(self, base: str, sql: str, sin_transaccion: bool = False):
        """Ejecuta SQL contra `base` y devuelve stdout limpio."""
        db = settings.DATABASES['default']
        cmd = [
            'psql',
            '-h', db['HOST'],
            '-p', str(db.get('PORT', '5432')),
            '-U', db['USER'],
            '-d', base,
            '--no-password',
            '-t', '-A',
            '-c', sql,
        ]
        if sin_transaccion:
            cmd.insert(1, '--set=AUTOCOMMIT=on')

        res = subprocess.run(cmd, capture_output=True, env=self._psql_env(), timeout=120)
        if res.returncode != 0:
            raise CommandError(
                f'psql falló: {res.stderr.decode(errors="replace").strip()[:400]}'
            )
        return res.stdout.decode(errors='replace').strip()

    def _cliente_s3(self):
        return boto3.client(
            's3',
            region_name=settings.AWS_S3_REGION_NAME,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

    def _backup_mas_reciente(self, s3, bucket: str) -> str:
        """
        Backup más reciente del propio entorno.

        Se ancla al prefijo del entorno a propósito: en producción nunca debe
        elegir por accidente un dump de desarrollo, que restauraría datos de
        prueba creyendo que son reales.
        """
        prefijo = f'{prefijo_backup()}daily/'
        paginador = s3.get_paginator('list_objects_v2')
        mas_reciente = None
        for pagina in paginador.paginate(Bucket=bucket, Prefix=prefijo):
            for obj in pagina.get('Contents', []):
                if not obj['Key'].endswith('.sql.gz'):
                    continue
                if mas_reciente is None or obj['LastModified'] > mas_reciente['LastModified']:
                    mas_reciente = obj
        if mas_reciente is None:
            raise CommandError(f'No se encontró ningún backup en s3://{bucket}/{prefijo}')
        return mas_reciente['Key']

    # ── comando ──────────────────────────────────────────────────────────────

    def handle(self, *args, **opts):
        bucket = settings.AWS_BACKUP_BUCKET_NAME
        if not bucket:
            raise CommandError('AWS_BACKUP_BUCKET_NAME no está configurado.')

        s3 = self._cliente_s3()
        clave = opts['key'] or self._backup_mas_reciente(s3, bucket)

        base_tmp = f'pycore_verif_{timezone.localtime().strftime("%Y%m%d_%H%M%S")}'
        comprimido = descomprimido = None
        base_creada = False

        self.stdout.write(f'Entorno: {getattr(settings, "ENVIRONMENT", "development")}')
        self.stdout.write(f'Backup:  s3://{bucket}/{clave}')
        self.stdout.write(f'Base:    {base_tmp} (temporal)\n')

        try:
            # 1. Descargar
            with tempfile.NamedTemporaryFile(suffix='.sql.gz', delete=False) as fh:
                comprimido = fh.name
            s3.download_file(bucket, clave, comprimido)
            tamano_kb = os.path.getsize(comprimido) // 1024
            self.stdout.write(f'  ✓ Descargado ({tamano_kb} KB)')

            # 2. Descomprimir — valida de paso la integridad del gzip
            with tempfile.NamedTemporaryFile(suffix='.sql', delete=False) as fh:
                descomprimido = fh.name
            with gzip.open(comprimido, 'rb') as origen, open(descomprimido, 'wb') as destino:
                shutil.copyfileobj(origen, destino)
            self.stdout.write(
                f'  ✓ Descomprimido ({os.path.getsize(descomprimido) // 1024} KB de SQL)'
            )

            # 3. Crear base desechable
            self._psql('postgres', f'CREATE DATABASE "{base_tmp}";', sin_transaccion=True)
            base_creada = True
            self.stdout.write('  ✓ Base temporal creada')

            # 4. Restaurar
            db = settings.DATABASES['default']
            with open(descomprimido, 'rb') as fh:
                res = subprocess.run(
                    [
                        'psql',
                        '-h', db['HOST'],
                        '-p', str(db.get('PORT', '5432')),
                        '-U', db['USER'],
                        '-d', base_tmp,
                        '--no-password',
                        '-v', 'ON_ERROR_STOP=1',
                        '-f', '-',
                    ],
                    stdin=fh, capture_output=True, env=self._psql_env(), timeout=1800,
                )
            if res.returncode != 0:
                raise CommandError(
                    'La restauración FALLÓ — este backup no sirve:\n'
                    + res.stderr.decode(errors='replace').strip()[:800]
                )
            self.stdout.write('  ✓ Restaurado sin errores')

            # 5. Validar contenido
            self.stdout.write('\nContenido restaurado:')
            tablas = int(self._psql(
                base_tmp,
                "SELECT count(*) FROM information_schema.tables "
                "WHERE table_schema = 'public';",
            ))
            self.stdout.write(f'  Tablas: {tablas}')
            if tablas == 0:
                raise CommandError('El dump restauró 0 tablas — está vacío.')

            vacias = []
            for tabla in TABLAS_CLAVE:
                existe = self._psql(
                    base_tmp,
                    "SELECT to_regclass('public.%s') IS NOT NULL;" % tabla,
                )
                if existe != 't':
                    vacias.append(f'{tabla} (no existe)')
                    self.stdout.write(self.style.WARNING(f'  {tabla}: NO EXISTE'))
                    continue
                filas = int(self._psql(base_tmp, f'SELECT count(*) FROM "{tabla}";'))
                if filas == 0:
                    vacias.append(f'{tabla} (0 filas)')
                    self.stdout.write(self.style.WARNING(f'  {tabla}: 0 filas'))
                else:
                    self.stdout.write(f'  {tabla}: {filas} filas')

            self.stdout.write('')
            if vacias:
                raise CommandError(
                    'El backup restaura pero le faltan datos clave: '
                    + ', '.join(vacias)
                )

            self.stdout.write(self.style.SUCCESS(
                f'✅ Backup verificado: restaura correctamente y contiene datos.'
            ))

        finally:
            for ruta in (comprimido, descomprimido):
                if ruta and os.path.exists(ruta):
                    os.unlink(ruta)

            if base_creada and not opts['conservar']:
                try:
                    self._psql(
                        'postgres',
                        f'DROP DATABASE IF EXISTS "{base_tmp}";',
                        sin_transaccion=True,
                    )
                    self.stdout.write(f'  Base temporal {base_tmp} eliminada.')
                except Exception as exc:
                    self.stderr.write(self.style.ERROR(
                        f'  ⚠ No se pudo borrar la base temporal {base_tmp}: {exc}\n'
                        f'    Bórrala a mano: DROP DATABASE "{base_tmp}";'
                    ))
            elif base_creada:
                self.stdout.write(f'  Base {base_tmp} conservada (--conservar).')
