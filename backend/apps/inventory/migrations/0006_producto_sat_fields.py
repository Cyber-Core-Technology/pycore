# Agrega campos SAT requeridos para CFDI 4.0 al modelo Producto

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0005_varianteproducto_unidad_medida"),
    ]

    operations = [
        migrations.AddField(
            model_name='producto',
            name='clave_prod_serv',
            field=models.CharField(
                blank=True,
                default='01010101',
                help_text='Clave del catálogo SAT c_ClaveProdServ (ej: 43232408 para software).',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='producto',
            name='clave_unidad_sat',
            field=models.CharField(
                blank=True,
                default='H87',
                help_text='Clave del catálogo SAT c_ClaveUnidad (ej: H87=Pieza, E48=Servicio).',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='producto',
            name='objeto_impuesto',
            field=models.CharField(
                blank=True,
                choices=[
                    ('01', '01 - No objeto de impuesto'),
                    ('02', '02 - Sí objeto de impuesto'),
                    ('03', '03 - Sí objeto, no obligado al desglose'),
                ],
                default='02',
                help_text='c_ObjetoImp: si el concepto causa IVA o no.',
                max_length=3,
            ),
        ),
    ]
