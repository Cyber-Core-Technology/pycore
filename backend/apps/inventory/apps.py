from django.apps import AppConfig


class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.inventory'
    verbose_name = 'Inventario'

    def ready(self):
        try:
            from apps.inventory.events.handlers import setup_inventory_event_handlers
            setup_inventory_event_handlers()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error configurando inventory handlers: {e}")
