from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('auth_module', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='jefe',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='subordinados',
                to='auth_module.usuario',
            ),
        ),
    ]
