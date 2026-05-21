from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("catalogs", "0001_initial"),
        ("inventory", "0004_folio_unique_per_empresa"),
    ]

    operations = [
        migrations.AddField(
            model_name="varianteproducto",
            name="unidad_medida",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="variantes",
                to="catalogs.unidadmedida",
                verbose_name="Unidad de medida",
            ),
        ),
    ]
