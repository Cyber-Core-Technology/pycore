from django.apps import AppConfig


class SalesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.sales'
    verbose_name = 'Ventas'

    def ready(self):
        try:
            from apps.sales.events.handlers import setup_sales_event_handlers
            setup_sales_event_handlers()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error configurando sales handlers: {e}")
