import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
        ('notifications', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PushSubscription',
            fields=[
                ('id',          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('endpoint',    models.TextField(unique=True)),
                ('keys_p256dh', models.TextField()),
                ('keys_auth',   models.TextField()),
                ('user_agent',  models.CharField(blank=True, max_length=300)),
                ('created_at',  models.DateTimeField(auto_now_add=True)),
                ('empresa',  models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='push_subscriptions', to='core.empresa')),
                ('usuario',  models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='push_subscriptions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name':        'Suscripción Push',
                'verbose_name_plural': 'Suscripciones Push',
                'db_table':            'push_subscriptions',
                'indexes':             [models.Index(fields=['usuario', 'empresa'], name='push_sub_usuario_empresa_idx')],
            },
        ),
    ]
