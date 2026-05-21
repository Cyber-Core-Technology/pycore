from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('storefront', '0005_pedido_venta_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='clientestorefront',
            name='acepto_privacidad',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='clientestorefront',
            name='fecha_acepto_privacidad',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
