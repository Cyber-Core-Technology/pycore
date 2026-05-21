from django.apps import AppConfig


class PurchasesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.purchases'
    verbose_name = 'Compras'

    def ready(self):
        from apps.purchases.events.handlers import setup_purchases_event_handlers
        setup_purchases_event_handlers()
