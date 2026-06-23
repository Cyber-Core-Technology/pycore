import uuid
from django.db import models


def comprobante_upload_to(instance, filename):
    """
    Ruta única por empresa/compra para cada comprobante:
    compras/comprobantes/<empresa>/<compra>/<uuid>_<archivo>.
    El uuid evita colisiones (y por tanto sufijos aleatorios de S3).
    """
    empresa_id = instance.compra.empresa_id
    return f'compras/comprobantes/{empresa_id}/{instance.compra_id}/{uuid.uuid4().hex}_{filename}'


class CompraComprobante(models.Model):
    """
    Comprobante (PDF/PNG/JPG) asociado a una compra. Una compra puede tener varios
    —por ejemplo, un comprobante distinto por cada recepción parcial.
    """
    id = models.AutoField(primary_key=True)
    compra = models.ForeignKey(
        'purchases.Compra',
        on_delete=models.CASCADE,
        related_name='comprobantes',
    )
    archivo = models.FileField(upload_to=comprobante_upload_to)
    nombre_original = models.CharField(max_length=255, blank=True, default='')
    subido_por = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.SET_NULL,
        related_name='comprobantes_compra_subidos',
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'compras_comprobantes'
        ordering = ['created_at']

    def __str__(self):
        return f'Comprobante #{self.id} de compra {self.compra_id}'
