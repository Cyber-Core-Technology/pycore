from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('auth_module', '0002_usuario_jefe'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UsuarioSucursal',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('es_predeterminada', models.BooleanField(default=False)),
                ('usuario', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='usuario_sucursales',
                    to='auth_module.usuario',
                )),
                ('sucursal', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='usuario_sucursales',
                    to='core.sucursal',
                )),
            ],
            options={
                'verbose_name': 'Usuario-Sucursal',
                'verbose_name_plural': 'Usuarios-Sucursales',
                'db_table': 'auth_usuario_sucursales',
            },
        ),
        migrations.AlterUniqueTogether(
            name='usuariosucursal',
            unique_together={('usuario', 'sucursal')},
        ),
    ]
