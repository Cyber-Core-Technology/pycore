# Agrega campos SAT requeridos para CFDI 4.0 al modelo Cliente

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("terceros", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='codigo_postal_fiscal',
            field=models.CharField(
                blank=True,
                max_length=5,
                help_text='CP del domicilio fiscal del receptor (requerido en CFDI 4.0).',
            ),
        ),
        migrations.AddField(
            model_name='cliente',
            name='uso_cfdi_default',
            field=models.CharField(
                blank=True,
                default='G03',
                max_length=10,
                help_text='Uso CFDI predeterminado para este cliente (c_UsoCFDI SAT).',
            ),
        ),
    ]
