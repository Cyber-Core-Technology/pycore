from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='producto',
            name='visibilidad_publica',
            field=models.CharField(
                choices=[
                    ('privado', 'Privado'),
                    ('publico_sin_stock', 'Público sin stock'),
                    ('publico_con_stock', 'Público con stock'),
                ],
                default='privado',
                max_length=20,
                db_index=True,
            ),
        ),
        migrations.AddIndex(
            model_name='producto',
            index=models.Index(fields=['empresa', 'visibilidad_publica'], name='inv_prod_empresa_visib_idx'),
        ),
    ]
