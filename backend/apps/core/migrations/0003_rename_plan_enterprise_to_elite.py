from django.db import migrations, models


def forward(apps, schema_editor):
    Empresa = apps.get_model('core', 'Empresa')
    Empresa.objects.filter(plan='enterprise').update(plan='elite')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_alter_empresa_logo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='empresa',
            name='plan',
            field=models.CharField(
                choices=[
                    ('basico',       'Básico'),
                    ('profesional',  'Profesional'),
                    ('empresarial',  'Empresarial'),
                    ('elite',        'Elite'),
                ],
                default='basico',
                max_length=20,
            ),
        ),
        migrations.RunPython(forward, migrations.RunPython.noop),
    ]
