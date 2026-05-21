import uuid
from django.db import models


ESTADO_PEDIDO = [
    ('pendiente',   'Pendiente de pago'),
    ('apartado',    'Apartado (pago en tienda)'),
    ('pagado',      'Pagado con tarjeta'),
    ('en_proceso',  'En proceso'),
    ('listo',       'Listo para recoger'),
    ('entregado',   'Entregado'),
    ('cancelado',   'Cancelado'),
]

METODO_PAGO = [
    ('efectivo_en_tienda', 'Efectivo en tienda'),
    ('mercado_pago',       'Mercado Pago'),
]


class PedidoStorefront(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.CASCADE,
        related_name='pedidos_storefront',
    )
    cliente = models.ForeignKey(
        'storefront.ClienteStorefront',
        on_delete=models.PROTECT,
        related_name='pedidos',
    )

    numero_pedido = models.CharField(max_length=20)   # ORD-00001

    estado      = models.CharField(max_length=20, choices=ESTADO_PEDIDO, default='pendiente', db_index=True)
    metodo_pago = models.CharField(max_length=30, choices=METODO_PAGO)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total    = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    notas_cliente = models.TextField(blank=True)

    # Mercado Pago — solo para pedidos digitales
    mp_preference_id  = models.CharField(max_length=120, blank=True)
    mp_payment_id     = models.CharField(max_length=80,  blank=True)
    mp_checkout_url   = models.CharField(max_length=500, blank=True)

    # Venta ERP generada al entregar/confirmar pago
    venta = models.OneToOneField(
        'sales.Venta',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='pedido_storefront',
    )

    # UUID para QR del ticket
    ticket_uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'storefront_pedidos'
        unique_together = [('empresa', 'numero_pedido')]
        ordering = ['-created_at']
        verbose_name = 'Pedido Storefront'
        verbose_name_plural = 'Pedidos Storefront'

    def __str__(self):
        return f'{self.numero_pedido} — {self.cliente.nombre}'


class DetallePedido(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    pedido = models.ForeignKey(
        PedidoStorefront,
        on_delete=models.CASCADE,
        related_name='detalles',
    )
    producto = models.ForeignKey(
        'inventory.Producto',
        on_delete=models.PROTECT,
        related_name='detalles_pedido',
    )

    nombre_snapshot = models.CharField(max_length=200)
    precio_snapshot = models.DecimalField(max_digits=12, decimal_places=2)
    cantidad        = models.PositiveSmallIntegerField()
    subtotal        = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'storefront_detalle_pedidos'
        verbose_name = 'Detalle de Pedido'
        verbose_name_plural = 'Detalles de Pedido'
