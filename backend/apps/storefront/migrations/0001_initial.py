import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ConfiguracionStorefront',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('slug', models.SlugField(max_length=60, unique=True)),
                ('nombre_tienda', models.CharField(blank=True, max_length=200)),
                ('descripcion', models.TextField(blank=True)),
                ('banner_url', models.CharField(blank=True, max_length=500)),
                ('color_primario', models.CharField(default='#1BAE91', max_length=7)),
                ('color_secundario', models.CharField(default='#0E7C66', max_length=7)),
                ('activo', models.BooleanField(default=False)),
                ('mostrar_precios', models.BooleanField(default=True)),
                ('mostrar_stock', models.BooleanField(default=False)),
                ('mostrar_agotados', models.BooleanField(default=True)),
                ('whatsapp', models.CharField(blank=True, max_length=20)),
                ('email_pub', models.EmailField(blank=True, max_length=254)),
                ('sitio_web', models.URLField(blank=True)),
                ('meta_titulo', models.CharField(blank=True, max_length=60)),
                ('meta_descripcion', models.CharField(blank=True, max_length=160)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('empresa', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='storefront_config',
                    to='core.empresa',
                )),
            ],
            options={
                'verbose_name': 'Configuración Storefront',
                'verbose_name_plural': 'Configuraciones Storefront',
                'db_table': 'storefront_configuracion',
            },
        ),
    ]
