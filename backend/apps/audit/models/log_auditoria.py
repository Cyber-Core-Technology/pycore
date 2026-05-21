import uuid
from django.db import models


class LogAuditoria(models.Model):

    ACCION_CHOICES = [
        # Eventos de negocio
        ('venta.creada', 'Venta creada'),
        ('venta.cancelada', 'Venta cancelada'),
        ('venta.pagada', 'Venta pagada'),
        ('devolucion.creada', 'Devolución creada'),
        ('compra.creada', 'Compra creada'),
        ('compra.recibida', 'Compra recibida'),
        ('compra.cancelada', 'Compra cancelada'),
        ('stock.bajo', 'Stock bajo mínimo'),
        ('movimiento.creado', 'Movimiento de inventario'),
        ('cuenta_cobrar.creada', 'CxC creada'),
        ('cuenta_cobrar.pagada', 'CxC pagada'),
        ('cuenta_pagar.creada', 'CxP creada'),
        ('cuenta_pagar.pagada', 'CxP pagada'),
        ('pago.registrado', 'Pago registrado'),
        ('usuario.creado', 'Usuario creado'),
        ('usuario.login', 'Inicio de sesión'),
        ('usuario.logout', 'Cierre de sesión'),
        ('usuario.bloqueado', 'Usuario bloqueado'),
        ('colaborador.creado', 'Colaborador creado'),
        ('asistencia.registrada', 'Asistencia registrada'),
        # Genérico
        ('sistema.error_critico', 'Error crítico del sistema'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Tenant — SET_NULL para conservar historial aunque se elimine la empresa
    empresa = models.ForeignKey(
        'core.Empresa',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        db_index=True,
        related_name='logs_auditoria',
    )

    # Quién — SET_NULL para conservar historial aunque se elimine el usuario
    usuario = models.ForeignKey(
        'auth_module.Usuario',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        db_index=True,
        related_name='logs_auditoria',
    )
    usuario_email = models.CharField(max_length=255, blank=True)

    # Qué
    accion = models.CharField(max_length=50, choices=ACCION_CHOICES, db_index=True)
    tabla = models.CharField(max_length=100, blank=True)
    id_registro = models.CharField(max_length=100, blank=True)

    # Datos
    payload = models.JSONField(default=dict)
    datos_anteriores = models.JSONField(null=True, blank=True)
    datos_nuevos = models.JSONField(null=True, blank=True)

    # Contexto
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'Logs_Auditoria'
        verbose_name = 'Log de Auditoría'
        verbose_name_plural = 'Logs de Auditoría'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['empresa', 'accion', 'created_at']),
            models.Index(fields=['empresa', 'tabla', 'id_registro']),
        ]

    def __str__(self):
        return f"{self.accion} — empresa={self.empresa_id} — {self.created_at}"
