from django.utils import timezone
from apps.sales.models import Promocion


class PromocionRepository:

    def get_by_id(self, id_promocion: int, empresa) -> Promocion | None:
        try:
            return Promocion.objects.get(
                id_promocion=id_promocion,
                empresa=empresa,
                deleted_at__isnull=True,
            )
        except Promocion.DoesNotExist:
            return None

    def get_by_codigo(self, codigo: str, empresa) -> Promocion | None:
        try:
            return Promocion.objects.get(
                codigo=codigo,
                empresa=empresa,
                activo=True,
                deleted_at__isnull=True,
            )
        except Promocion.DoesNotExist:
            return None

    def list_vigentes(self, empresa):
        hoy = timezone.now().date()
        return Promocion.objects.filter(
            empresa=empresa,
            activo=True,
            fecha_inicio__lte=hoy,
            fecha_fin__gte=hoy,
            deleted_at__isnull=True,
        )

    def create(self, **kwargs) -> Promocion:
        return Promocion.objects.create(**kwargs)

    def save(self, promocion: Promocion) -> Promocion:
        promocion.save()
        return promocion
