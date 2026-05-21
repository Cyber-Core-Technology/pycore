import gzip
import logging
import os
import subprocess
from datetime import datetime

import boto3
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name='core.backup_db',
    max_retries=2,
    default_retry_delay=300,
)
def backup_db_task(self):
    """
    Genera un pg_dump de la BD, lo comprime con gzip y lo sube a S3.

    Estructura en S3:
        daily/YYYY-MM-DD/pycore_backup_YYYY-MM-DD_HH-MM.sql.gz   (retención 30d)
        weekly/YYYY-WNN/pycore_backup_YYYY-MM-DD_HH-MM.sql.gz    (retención 90d, solo lunes)
    """
    try:
        now = datetime.now()
        timestamp = now.strftime('%Y-%m-%d_%H-%M')
        filename = f'pycore_backup_{timestamp}.sql.gz'

        # Lunes → también sube a weekly
        is_monday = now.weekday() == 0
        date_daily = now.strftime('%Y-%m-%d')
        date_weekly = now.strftime('%Y-W%W')

        bucket = settings.AWS_BACKUP_BUCKET_NAME
        s3_keys = [f'daily/{date_daily}/{filename}']
        if is_monday:
            s3_keys.append(f'weekly/{date_weekly}/{filename}')

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

        logger.info(f'[BACKUP] Iniciando pg_dump → s3://{bucket}/{s3_keys[0]}')
        result = subprocess.run(cmd, capture_output=True, env=env, timeout=600)

        if result.returncode != 0:
            raise RuntimeError(f'pg_dump falló: {result.stderr.decode()}')

        compressed = gzip.compress(result.stdout)
        size_kb = len(compressed) // 1024

        s3 = boto3.client(
            's3',
            region_name=settings.AWS_S3_REGION_NAME,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        )

        for key in s3_keys:
            s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=compressed,
                ContentType='application/gzip',
                ServerSideEncryption='AES256',
            )
            logger.info(f'[BACKUP] Subido: {key} ({size_kb} KB)')

        return {'s3_keys': s3_keys, 'size_kb': size_kb}

    except Exception as exc:
        logger.error(f'[BACKUP] Error: {exc}')
        raise self.retry(exc=exc)
