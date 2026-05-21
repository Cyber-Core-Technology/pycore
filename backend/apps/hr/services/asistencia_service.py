import logging
from django.db import transaction
from django.utils import timezone

from apps.hr.repositories import AsistenciaRepository, ColaboradorRepository
from apps.hr.exceptions import AsistenciaNotFoundException, ColaboradorNotFoundException

logger = logging.getLogger(__name__)


class AsistenciaService:

    def __init__(self, empresa, usuario=None):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = AsistenciaRepository()
        self.col_repo = ColaboradorRepository()

    def listar(self, filters: dict = None):
        return self.repo.list_by_empresa(self.empresa, filters)

    def obtener(self, id):
        asistencia = self.repo.get_by_id(id, self.empresa)
        if not asistencia:
            raise AsistenciaNotFoundException()
        return asistencia

    @transaction.atomic
    def registrar(self, data: dict):
        colaborador = self.col_repo.get_by_id(data['id_colaborador'], self.empresa)
        if not colaborador:
            raise ColaboradorNotFoundException()

        asistencia = self.repo.create(
            empresa=self.empresa,
            colaborador=colaborador,
            fecha=data.get('fecha', timezone.now().date()),
            hora_registro=data.get('hora_registro', timezone.now()),
            tipo=data['tipo'],
            estado=data.get('estado', 'puntual'),
            notas=data.get('notas', ''),
            registrado_por=str(self.usuario) if self.usuario else '',
        )
        from apps.hr.events import publicar_asistencia_registrada
        publicar_asistencia_registrada(asistencia)
        logger.info(
            f"✅ Asistencia registrada: {colaborador.numero_empleado} "
            f"— {asistencia.tipo} {asistencia.fecha}"
        )
        return asistencia

    def resumen_dia(self, fecha=None):
        """Resumen de asistencias del día para la empresa."""
        fecha = fecha or timezone.now().date()
        asistencias = self.repo.list_by_empresa(self.empresa, {'fecha': fecha})
        return {
            'fecha': str(fecha),
            'total': asistencias.count(),
            'puntuales': asistencias.filter(estado='puntual').count(),
            'retardos': asistencias.filter(estado='retardo').count(),
            'faltas': asistencias.filter(estado='falta').count(),
            'justificados': asistencias.filter(estado='justificado').count(),
        }
