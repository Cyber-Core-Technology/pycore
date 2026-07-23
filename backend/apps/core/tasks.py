import gzip
import logging
import os
import shutil
import subprocess
import tempfile
from datetime import timedelta

import boto3
from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.core.services import BackupAlertService

logger = logging.getLogger(__name__)

# Por debajo de este tamaño el dump no puede ser válido, aunque pg_dump
# devuelva 0: un volcado real del esquema de PyCore nunca es tan pequeño.
BACKUP_MIN_BYTES = 10 * 1024

# Caída porcentual respecto al backup anterior que dispara alerta.
BACKUP_CAIDA_ALERTA_PCT = 40

# Días hacia atrás que se revisan buscando el backup anterior con el cual comparar.
BACKUP_DIAS_COMPARACION = 7


def prefijo_backup() -> str:
    """
    Raíz en S3 bajo la cual escribe este entorno.

    Producción usa la raíz del bucket (daily/, weekly/) — es la ruta histórica
    y la que cubren las reglas de retención de 30/90 días. Cualquier otro
    entorno queda aislado bajo non-prod/<entorno>/, que expira a los 7 días.

    Sin esta separación, un backup lanzado desde una máquina de desarrollo
    aterriza mezclado con los reales: al restaurar "el más reciente" se puede
    sobrescribir producción con datos de prueba.
    """
    entorno = getattr(settings, 'ENVIRONMENT', 'development')
    if entorno == 'production':
        return ''
    return f'non-prod/{entorno}/'


def _cliente_s3():
    return boto3.client(
        's3',
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def _volcar_a_archivo(destino: str) -> None:
    """
    Corre pg_dump y escribe el resultado comprimido en `destino`.

    El volcado se transmite por streaming de pg_dump a gzip y de gzip al
    archivo: nunca se carga la base completa en memoria. Con bases de varios
    GB, acumularla en RAM tumbaría al worker de Celery por OOM.
    """
    db = settings.DATABASES['default']
    env = os.environ.copy()
    env['PGPASSWORD'] = db['PASSWORD']

    cmd = [
        'pg_dump',
        '-h', db['HOST'],
        '-p', str(db.get('PORT', '5432')),
        '-U', db['USER'],
        '-d', db['NAME'],
        '--no-password',
        '--clean',
        '--if-exists',
    ]

    # stderr va a un archivo temporal, no a un pipe: si pg_dump escribiera más
    # advertencias que el buffer del pipe mientras nadie lo lee, se bloquearía.
    with tempfile.TemporaryFile() as err_fh:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=err_fh, env=env)
        try:
            with open(destino, 'wb') as fh, gzip.GzipFile(fileobj=fh, mode='wb') as gz:
                shutil.copyfileobj(proc.stdout, gz)
            proc.stdout.close()
            codigo = proc.wait(timeout=600)
        except Exception:
            proc.kill()
            proc.wait()
            raise

        if codigo != 0:
            err_fh.seek(0)
            detalle = err_fh.read().decode(errors='replace').strip()[:500]
            raise RuntimeError(f'pg_dump falló (código {codigo}): {detalle}')


def _tamano_backup_previo(s3, bucket: str, hoy) -> tuple:
    """
    Tamaño en bytes del backup más reciente anterior a hoy, junto con su fecha.

    Solo mira dentro del prefijo del propio entorno: comparar producción contra
    un backup de desarrollo daría una falsa alarma de encogimiento.

    Devuelve (None, None) si no hay ninguno en BACKUP_DIAS_COMPARACION días.
    """
    raiz = prefijo_backup()
    for dias in range(1, BACKUP_DIAS_COMPARACION + 1):
        fecha = (hoy - timedelta(days=dias)).strftime('%Y-%m-%d')
        respuesta = s3.list_objects_v2(Bucket=bucket, Prefix=f'{raiz}daily/{fecha}/')
        objetos = respuesta.get('Contents', [])
        if objetos:
            mas_reciente = max(objetos, key=lambda o: o['LastModified'])
            return mas_reciente['Size'], fecha
    return None, None


@shared_task(
    bind=True,
    name='core.backup_db',
    max_retries=2,
    default_retry_delay=300,
)
def backup_db_task(self):
    """
    Genera un pg_dump de la BD, lo comprime con gzip y lo sube a S3.

    Estructura en S3 (producción):
        daily/YYYY-MM-DD/pycore_backup_production_YYYY-MM-DD_HH-MM.sql.gz
        weekly/YYYY-WNN/pycore_backup_production_YYYY-MM-DD_HH-MM.sql.gz  (lunes)

    Cualquier otro entorno escribe aislado bajo non-prod/<entorno>/, y el
    nombre del archivo lleva el entorno para que un dump descargado no sea
    ambiguo. Ver prefijo_backup().

    La retención NO la aplica esta tarea: la hacen las reglas de ciclo de vida
    del bucket (daily 30 d, weekly 90 d, non-prod 7 d).
    Ver scripts/apply-s3-lifecycle.sh.

    Avisa por correo si el backup falla tras agotar reintentos o si encoge de
    forma sospechosa respecto al día anterior.
    """
    archivo_tmp = None
    try:
        ahora = timezone.localtime()
        entorno = getattr(settings, 'ENVIRONMENT', 'development')
        marca = ahora.strftime('%Y-%m-%d_%H-%M')
        nombre = f'pycore_backup_{entorno}_{marca}.sql.gz'

        bucket = settings.AWS_BACKUP_BUCKET_NAME
        raiz = prefijo_backup()
        claves = [f'{raiz}daily/{ahora.strftime("%Y-%m-%d")}/{nombre}']
        if ahora.weekday() == 0:  # lunes → copia semanal
            claves.append(f'{raiz}weekly/{ahora.strftime("%Y-W%W")}/{nombre}')

        logger.info(
            '[BACKUP] Iniciando pg_dump (%s) → s3://%s/%s', entorno, bucket, claves[0]
        )

        with tempfile.NamedTemporaryFile(suffix='.sql.gz', delete=False) as tmp:
            archivo_tmp = tmp.name
        _volcar_a_archivo(archivo_tmp)

        tamano = os.path.getsize(archivo_tmp)
        if tamano < BACKUP_MIN_BYTES:
            # Se reintenta: un dump truncado no sirve como respaldo.
            raise RuntimeError(
                f'El dump pesa solo {tamano} bytes (mínimo esperado '
                f'{BACKUP_MIN_BYTES}). Probablemente está truncado o vacío.'
            )

        s3 = _cliente_s3()
        for clave in claves:
            s3.upload_file(
                Filename=archivo_tmp,
                Bucket=bucket,
                Key=clave,
                ExtraArgs={
                    'ContentType': 'application/gzip',
                    'ServerSideEncryption': 'AES256',
                },
            )
            logger.info('[BACKUP] Subido: %s (%d KB)', clave, tamano // 1024)

        _revisar_tamano(s3, bucket, claves[0], tamano, ahora)

        return {'s3_keys': claves, 'size_kb': tamano // 1024}

    except Exception as exc:
        logger.error('[BACKUP] Error: %s', exc)
        if self.request.retries >= self.max_retries:
            BackupAlertService.alertar_fallo(str(exc), intentos=self.request.retries + 1)
        raise self.retry(exc=exc)

    finally:
        if archivo_tmp and os.path.exists(archivo_tmp):
            os.unlink(archivo_tmp)


def _revisar_tamano(s3, bucket: str, clave: str, tamano: int, ahora) -> None:
    """
    Compara contra el backup anterior y avisa si encogió bruscamente.

    Es best-effort: el backup ya está en S3, así que un fallo aquí no debe
    invalidar la tarea ni disparar reintentos que volverían a volcar la base.
    """
    try:
        previo, fecha_previa = _tamano_backup_previo(s3, bucket, ahora)

        if previo is None:
            logger.warning('[BACKUP] Sin backups previos para comparar')
            BackupAlertService.alertar_sin_backup_previo(BACKUP_DIAS_COMPARACION)
            return

        caida_pct = int((previo - tamano) * 100 / previo)
        if caida_pct >= BACKUP_CAIDA_ALERTA_PCT:
            logger.warning(
                '[BACKUP] Tamaño sospechoso: %d KB vs %d KB del %s (-%d%%)',
                tamano // 1024, previo // 1024, fecha_previa, caida_pct,
            )
            BackupAlertService.alertar_tamano_sospechoso(
                key=clave,
                tamano_kb=tamano // 1024,
                tamano_previo_kb=previo // 1024,
                fecha_previa=fecha_previa,
                caida_pct=caida_pct,
            )
    except Exception as exc:
        logger.error('[BACKUP] No se pudo comparar contra el backup previo: %s', exc)
