from apps.inventory.models import MovimientoInventario


class MovimientoRepository:

    def crear(self, data):
        return MovimientoInventario.objects.create(**data)

    def get_by_producto(self, empresa, producto):
        return MovimientoInventario.objects.filter(
            empresa=empresa, producto=producto
        ).select_related('sucursal', 'variante').order_by('-created_at')

    def get_by_empresa(self, empresa, limit=100):
        return MovimientoInventario.objects.filter(
            empresa=empresa
        ).select_related('producto', 'sucursal').order_by('-created_at')[:limit]

    def generar_folio(self, empresa):
        from django.utils import timezone
        hoy = timezone.now()
        prefijo = f'MOV-{hoy.year}{hoy.month:02d}-'
        ultimo = MovimientoInventario.objects.filter(
            empresa=empresa, folio__startswith=prefijo
        ).order_by('-folio').first()
        if ultimo:
            num = int(ultimo.folio.split('-')[-1]) + 1
        else:
            num = 1
        return f'{prefijo}{num:04d}'
