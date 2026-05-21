import logging

from django.conf import settings
from django.utils.text import slugify
from apps.core.repositories import EmpresaRepository, SucursalRepository
from apps.core.models import Configuracion
from apps.core.exceptions import EmpresaAlreadyExistsException

logger = logging.getLogger(__name__)


def _migrar_s3_slug(slug_viejo: str, slug_nuevo: str) -> None:
    """
    Copia todos los objetos de empresas/{slug_viejo}/ a empresas/{slug_nuevo}/
    y elimina los originales. Se ejecuta solo si S3 está configurado.
    """
    if not getattr(settings, 'AWS_STORAGE_BUCKET_NAME', ''):
        return

    import boto3
    bucket = settings.AWS_STORAGE_BUCKET_NAME
    s3 = boto3.client(
        's3',
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )

    prefijo_viejo = f'empresas/{slug_viejo}/'
    paginator = s3.get_paginator('list_objects_v2')

    keys_migrados = 0
    for page in paginator.paginate(Bucket=bucket, Prefix=prefijo_viejo):
        for obj in page.get('Contents', []):
            key_viejo = obj['Key']
            key_nuevo = key_viejo.replace(prefijo_viejo, f'empresas/{slug_nuevo}/', 1)

            s3.copy_object(
                Bucket=bucket,
                CopySource={'Bucket': bucket, 'Key': key_viejo},
                Key=key_nuevo,
            )
            s3.delete_object(Bucket=bucket, Key=key_viejo)
            keys_migrados += 1

    logger.info(f'[S3] Migración de slug completada: {slug_viejo} → {slug_nuevo} ({keys_migrados} archivos)')


class EmpresaService:

    @staticmethod
    def listar():
        return EmpresaRepository.get_all()

    @staticmethod
    def obtener(id_empresa):
        return EmpresaRepository.get_by_id(id_empresa)

    @staticmethod
    def crear(data):
        # Generar slug único desde el nombre
        base_slug = slugify(data.get('nombre', ''))
        slug = base_slug
        counter = 1
        while EmpresaRepository.get_by_slug(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        data['slug'] = slug

        # Verificar RFC duplicado si se proporcionó
        rfc = data.get('rfc')
        if rfc:
            from apps.core.models import Empresa
            if Empresa.objects.filter(rfc=rfc).exists():
                raise EmpresaAlreadyExistsException(f"Ya existe una empresa con RFC {rfc}.")

        empresa = EmpresaRepository.create(data)

        # Crear configuración por defecto automáticamente
        Configuracion.objects.create(empresa=empresa)

        # Crear sucursal principal por defecto
        SucursalRepository.create(empresa, {
            'nombre': 'Sucursal Principal',
            'codigo': 'SUC001',
            'es_principal': True,
        })

        return empresa

    @staticmethod
    def actualizar(id_empresa, data):
        empresa = EmpresaRepository.get_by_id(id_empresa)
        if not empresa:
            return None

        slug_viejo = empresa.slug
        empresa = EmpresaRepository.update(empresa, data)
        slug_nuevo = empresa.slug

        if slug_nuevo != slug_viejo:
            try:
                _migrar_s3_slug(slug_viejo, slug_nuevo)
            except Exception as exc:
                logger.error(f'[S3] Error migrando archivos al cambiar slug: {exc}')

        return empresa

    @staticmethod
    def eliminar(id_empresa):
        empresa = EmpresaRepository.get_by_id(id_empresa)
        if not empresa:
            return False
        EmpresaRepository.soft_delete(empresa)
        return True
