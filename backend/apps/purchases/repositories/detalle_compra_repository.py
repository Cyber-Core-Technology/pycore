from django.db.models import QuerySet
from apps.purchases.models import DetalleCompra


class DetalleCompraRepository:

    def list_by_compra(self, compra) -> QuerySet:
        return DetalleCompra.objects.filter(
            compra=compra
        ).select_related('producto', 'variante')

    def get_by_id(self, id_detalle: int, compra) -> DetalleCompra | None:
        try:
            return DetalleCompra.objects.get(
                id_detalle=id_detalle,
                compra=compra,
            )
        except DetalleCompra.DoesNotExist:
            return None

    def create(self, **kwargs) -> DetalleCompra:
        return DetalleCompra.objects.create(**kwargs)

    def save(self, detalle: DetalleCompra) -> DetalleCompra:
        detalle.save()
        return detalle

    def delete(self, detalle: DetalleCompra) -> None:
        detalle.delete()

    def bulk_create(self, detalles: list[DetalleCompra]) -> list[DetalleCompra]:
        return DetalleCompra.objects.bulk_create(detalles)
