from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('storefront', '0008_google_auth'),
    ]

    operations = [
        migrations.AddField(
            model_name='clientestorefront',
            name='two_fa_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='clientestorefront',
            name='two_fa_method',
            field=models.CharField(blank=True, max_length=10),
        ),
        migrations.AddField(
            model_name='clientestorefront',
            name='totp_secret',
            field=models.CharField(blank=True, max_length=64),
        ),
    ]
