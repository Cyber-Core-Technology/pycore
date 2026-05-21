import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pycore.settings.development')

app = Celery('pycore')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')


# ============================================================
# TAREAS PROGRAMADAS — Celery Beat
# ============================================================
app.conf.beat_schedule = {

    # -------------------------------------------------------
    # 🪞 TEZCA — Inteligencia de Negocios
    # -------------------------------------------------------
    'tezca-analisis-horario': {
        'task':     'tezca.analizar_todos_los_tenants',
        'schedule': crontab(minute=0),
    },
    'tezca-limpieza-semanal': {
        'task':     'tezca.limpiar_insights_viejos',
        'schedule': crontab(day_of_week=1, hour=3, minute=0),
    },

    # -------------------------------------------------------
    # 💾 CORE — Backup de base de datos a S3
    # -------------------------------------------------------
    'core-backup-diario': {
        'task':     'core.backup_db',
        'schedule': crontab(hour=3, minute=30),   # 3:30 AM México
    },
}