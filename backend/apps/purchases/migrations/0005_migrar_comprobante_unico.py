import os
from django.db import migrations


def copiar_comprobantes(apps, schema_editor):
    """Copia el comprobante único existente de cada compra a la nueva tabla."""
    Compra = apps.get_model('purchases', 'Compra')
    CompraComprobante = apps.get_model('purchases', 'CompraComprobante')

    for compra in Compra.objects.exclude(comprobante='').exclude(comprobante=None):
        nombre = compra.comprobante.name
        if not nombre:
            continue
        cc = CompraComprobante(
            compra=compra,
            nombre_original=os.path.basename(nombre),
            subido_por=compra.updated_by or compra.created_by,
        )
        # Referenciamos el archivo existente sin re-subirlo
        cc.archivo.name = nombre
        cc.save()


def revertir(apps, schema_editor):
    CompraComprobante = apps.get_model('purchases', 'CompraComprobante')
    CompraComprobante.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0004_compracomprobante'),
    ]

    operations = [
        migrations.RunPython(copiar_comprobantes, revertir),
    ]
