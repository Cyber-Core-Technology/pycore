from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_rename_plan_enterprise_to_elite'),
    ]

    operations = [
        migrations.AddField(
            model_name='empresa',
            name='giro_negocio',
            field=models.CharField(max_length=50, blank=True, default=''),
        ),
    ]
