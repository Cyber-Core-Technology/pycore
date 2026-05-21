from django.apps import AppConfig


class FinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.finance'
    verbose_name = 'Finanzas'

    def ready(self):
        try:
            from apps.finance.events.handlers import setup_finance_event_handlers
            setup_finance_event_handlers()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error configurando finance handlers: {e}")
