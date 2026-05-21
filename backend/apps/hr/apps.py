from django.apps import AppConfig


class HrConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.hr'
    verbose_name = 'Recursos Humanos'

    def ready(self):
        try:
            from apps.hr.events.handlers import setup_hr_event_handlers
            setup_hr_event_handlers()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error configurando hr handlers: {e}")
