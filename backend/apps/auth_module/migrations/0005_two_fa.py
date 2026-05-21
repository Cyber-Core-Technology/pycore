from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('auth_module', '0004_add_slug_to_rol'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='two_fa_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='usuario',
            name='two_fa_method',
            field=models.CharField(blank=True, max_length=10),
        ),
        migrations.AddField(
            model_name='usuario',
            name='totp_secret',
            field=models.CharField(blank=True, max_length=64),
        ),
    ]
