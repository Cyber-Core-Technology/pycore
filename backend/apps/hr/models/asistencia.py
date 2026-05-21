import uuid
from django.db import models
from apps.hr.models.colaborador import Colaborador
from apps.core.models.empresa import Empresa


class Asistencia(models.Model):

    TIPO_CHOICES = [
        ('entrada', 'Entrada'),
        ('salida', 'Salida'),
        ('entrada_descanso', 'Entrada a descanso'),
        ('salida_descanso', 'Salida de descanso'),
    ]

    ESTADO_CHOICES = [
        ('puntual', 'Puntual'),
        ('retardo', 'Retardo'),
        ('falta', 'Falta'),
        ('justificado', 'Justificado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa, on_delete=models.CASCADE, related_name='asistencias'
    )
    colaborador = models.ForeignKey(
        Colaborador, on_delete=models.CASCADE, related_name='asistencias'
    )

    # Registro
    fecha = models.DateField()
    hora_registro = models.DateTimeField()
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='puntual')

    # Contexto
    notas = models.TextField(blank=True)
    registrado_por = models.CharField(max_length=100, blank=True)  # usuario que registró

    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'Asistencias'
        verbose_name = 'Asistencia'
        verbose_name_plural = 'Asistencias'
        ordering = ['-fecha', '-hora_registro']
        indexes = [
            models.Index(fields=['empresa', 'fecha']),
            models.Index(fields=['colaborador', 'fecha']),
        ]

    def __str__(self):
        return f"{self.colaborador} — {self.tipo} {self.fecha}"
