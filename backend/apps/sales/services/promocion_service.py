import logging
from django.utils import timezone
from apps.sales.repositories import PromocionRepository
from apps.sales.exceptions import PromocionInvalidaException, SalesException

logger = logging.getLogger(__name__)


class PromocionService:

    def __init__(self, empresa, usuario):
        self.empresa = empresa
        self.usuario = usuario
        self.repo = PromocionRepository()

    def listar_vigentes(self):
        return self.repo.list_vigentes(self.empresa)

    def obtener_por_codigo(self, codigo: str):
        promo = self.repo.get_by_codigo(codigo, self.empresa)
        if not promo:
            raise PromocionInvalidaException(
                f"No existe una promoción activa con código '{codigo}'."
            )
        return promo

    def crear_promocion(self, data: dict):
        if data.get('fecha_fin') < data.get('fecha_inicio'):
            raise SalesException("La fecha de fin no puede ser anterior a la fecha de inicio.")

        if data.get('codigo'):
            existente = self.repo.get_by_codigo(data['codigo'], self.empresa)
            if existente:
                raise SalesException(
                    f"Ya existe una promoción activa con el código '{data['codigo']}'."
                )

        return self.repo.create(
            empresa=self.empresa,
            created_by=self.usuario,
            **data,
        )

    def desactivar_promocion(self, id_promocion: int):
        promo = self.repo.get_by_id(id_promocion, self.empresa)
        if not promo:
            raise PromocionInvalidaException("Promoción no encontrada.")
        promo.activo = False
        promo.updated_by = self.usuario
        return self.repo.save(promo)
