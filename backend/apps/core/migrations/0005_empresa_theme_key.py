from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0004_empresa_giro_negocio'),
    ]

    operations = [
        migrations.AddField(
            model_name='empresa',
            name='theme_key',
            field=models.CharField(blank=True, default='esmeralda', max_length=30),
        ),
    ]
