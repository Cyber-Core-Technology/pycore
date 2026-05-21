from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0006_producto_sat_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='producto',
            name='slug',
            field=models.SlugField(
                blank=True, max_length=220,
                help_text='Slug SEO generado automáticamente del nombre. Único por empresa.',
            ),
        ),
        migrations.AddField(
            model_name='producto',
            name='descripcion_larga',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='producto',
            name='galeria_imagenes',
            field=models.JSONField(
                default=list, blank=True,
                help_text='Lista de URLs de imágenes adicionales.',
            ),
        ),
        migrations.AddField(
            model_name='producto',
            name='ficha_tecnica',
            field=models.JSONField(
                default=list, blank=True,
                help_text='Lista de pares {clave, valor}.',
            ),
        ),
        migrations.AddIndex(
            model_name='producto',
            index=models.Index(fields=['empresa', 'slug'], name='inventory_p_empresa_slug_idx'),
        ),
        migrations.AddConstraint(
            model_name='producto',
            constraint=models.UniqueConstraint(
                condition=models.Q(slug__gt=''),
                fields=['empresa', 'slug'],
                name='uniq_producto_slug_por_empresa',
            ),
        ),
    ]
