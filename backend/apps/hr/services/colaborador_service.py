import logging
from django.db import transaction
from django.utils import timezone

from apps.hr.repositories import ColaboradorRepository
from apps.hr.exceptions import ColaboradorNotFoundException

logger = logging.getLogger(__name__)


class ColaboradorService:

    def __init__(self, empresa, usuario=None):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = ColaboradorRepository()

    def listar(self, filters: dict = None):
        return self.repo.list_by_empresa(self.empresa, filters)

    def obtener(self, id):
        colaborador = self.repo.get_by_id(id, self.empresa)
        if not colaborador:
            raise ColaboradorNotFoundException()
        return colaborador

    @transaction.atomic
    def crear(self, data: dict):
        data['empresa'] = self.empresa
        if not data.get('numero_empleado'):
            data['numero_empleado'] = self.repo.generar_numero_empleado(self.empresa)

        colaborador = self.repo.create(**data)
        from apps.hr.events import publicar_colaborador_creado
        publicar_colaborador_creado(colaborador)
        logger.info(f"✅ Colaborador creado: {colaborador.nombre_completo} ({colaborador.numero_empleado})")
        return colaborador

    @transaction.atomic
    def actualizar(self, id, data: dict):
        colaborador = self.obtener(id)
        for field, value in data.items():
            setattr(colaborador, field, value)
        self.repo.save(colaborador)
        logger.info(f"✅ Colaborador actualizado: {colaborador.numero_empleado}")
        return colaborador

    @transaction.atomic
    def dar_baja(self, id, fecha_baja=None):
        colaborador = self.obtener(id)
        colaborador.estado = 'baja'
        colaborador.fecha_baja = fecha_baja or timezone.now().date()
        colaborador.deleted_at = timezone.now()
        self.repo.save(colaborador)
        logger.info(f"✅ Colaborador dado de baja: {colaborador.numero_empleado}")
        return colaborador
