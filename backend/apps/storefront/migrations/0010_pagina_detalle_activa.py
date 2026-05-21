from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('storefront', '0009_two_fa'),
    ]

    operations = [
        migrations.AddField(
            model_name='configuracionstorefront',
            name='pagina_detalle_activa',
            field=models.BooleanField(
                default=False,
                help_text='Activa páginas individuales por producto con galería, ficha técnica y productos relacionados.',
            ),
        ),
    ]
