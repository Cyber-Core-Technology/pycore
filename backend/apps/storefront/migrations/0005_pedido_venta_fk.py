from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0001_initial'),
        ('storefront', '0004_mp_config'),
    ]

    operations = [
        migrations.AddField(
            model_name='pedidostorefront',
            name='venta',
            field=models.OneToOneField(
                null=True, blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='pedido_storefront',
                to='sales.venta',
            ),
        ),
    ]
