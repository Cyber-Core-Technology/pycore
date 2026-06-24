import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pycore.settings.development')

app = Celery('pycore')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')


# El calendario de Celery Beat vive en settings.CELERY_BEAT_SCHEDULE
# (única fuente de verdad; con DatabaseScheduler se sincroniza a la BD).