import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from apps.core.models.empresa import Empresa
from apps.core.models.sucursal import Sucursal


class UsuarioManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es obligatorio')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('verificado', True)
        return self.create_user(email, username, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    empresa = models.ForeignKey(
        Empresa,
        on_delete=models.CASCADE,
        related_name='usuarios',
        null=True,
        blank=True,
    )
    jefe = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        related_name='subordinados',
        null=True,
        blank=True,
    )

    # Identidad
    username = models.CharField(max_length=50, unique=True)
    email = models.EmailField(unique=True)

    # Información personal
    nombre = models.CharField(max_length=100)
    apellido_paterno = models.CharField(max_length=100, blank=True)
    apellido_materno = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=20, blank=True)
    foto_url = models.URLField(max_length=500, blank=True)

    # Control de acceso
    activo = models.BooleanField(default=True)
    verificado = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    ultimo_acceso = models.DateTimeField(null=True, blank=True)
    intentos_fallidos = models.PositiveSmallIntegerField(default=0)
    bloqueado_hasta = models.DateTimeField(null=True, blank=True)

    # Doble factor de autenticación (opcional)
    two_fa_enabled = models.BooleanField(default=False)
    two_fa_method  = models.CharField(max_length=10, blank=True)   # 'totp' | 'email'
    totp_secret    = models.CharField(max_length=64, blank=True)

    # Preferencias
    idioma = models.CharField(max_length=5, default='es-mx')
    zona_horaria = models.CharField(max_length=50, default='America/Mexico_City')
    tema = models.CharField(max_length=20, default='light')

    # Auditoría
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UsuarioManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'nombre']

    class Meta:
        db_table = 'auth_usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        indexes = [
            models.Index(fields=['empresa', 'activo']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f'{self.email} ({self.empresa})'

    @property
    def nombre_completo(self):
        partes = [self.nombre, self.apellido_paterno, self.apellido_materno]
        return ' '.join(p for p in partes if p)

    def esta_bloqueado(self):
        from django.utils import timezone
        if self.bloqueado_hasta and self.bloqueado_hasta > timezone.now():
            return True
        return False