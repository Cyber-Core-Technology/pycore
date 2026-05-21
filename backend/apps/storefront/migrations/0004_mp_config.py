from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('storefront', '0003_stripe_to_mp'),
    ]

    operations = [
        migrations.AddField(
            model_name='configuracionstorefront',
            name='mp_access_token',
            field=models.CharField(blank=True, max_length=300),
        ),
        migrations.AddField(
            model_name='configuracionstorefront',
            name='mp_mode',
            field=models.CharField(
                choices=[('sandbox', 'Sandbox/Pruebas'), ('production', 'Producción')],
                default='sandbox',
                max_length=20,
            ),
        ),
    ]
