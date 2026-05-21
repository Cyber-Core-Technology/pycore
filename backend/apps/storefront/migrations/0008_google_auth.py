from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("storefront", "0007_cliente_datos_fiscales"),
    ]

    operations = [
        migrations.AddField(
            model_name="clientestorefront",
            name="auth_provider",
            field=models.CharField(
                choices=[("email", "Email"), ("google", "Google")],
                default="email",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="clientestorefront",
            name="google_id",
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name="clientestorefront",
            name="password",
            field=models.CharField(blank=True, max_length=255),
        ),
    ]
