from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.audit'
    verbose_name = 'Auditoría y Logs'

    def ready(self):
        try:
            from apps.audit.events.handlers import setup_audit_event_handlers
            setup_audit_event_handlers()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error configurando audit handlers: {e}")
