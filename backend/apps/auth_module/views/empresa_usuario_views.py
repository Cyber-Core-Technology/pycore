from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.auth_module.models import Usuario, Rol, UsuarioRol
from apps.auth_module.serializers.empresa_usuario_serializers import (
    UsuarioEmpresaListSerializer,
    CrearUsuarioEmpresaSerializer,
    ActualizarRolesSerializer,
)
from apps.auth_module.repositories import UsuarioRepository

PLAN_MAX_USUARIOS = {
    'basico':      3,
    'profesional': 10,
    'empresarial': 30,
    'elite':       float('inf'),
}

repo = UsuarioRepository()


def _is_admin(user) -> bool:
    roles = [r.lower() for r in repo.get_roles_usuario(user)]
    return any(r in ('admin', 'administrador') for r in roles) or user.is_staff


class UsuariosEmpresaListCreateView(APIView):
    """
    GET  /api/v1/usuarios/  — lista usuarios activos de la empresa del request
    POST /api/v1/usuarios/  — crea un nuevo usuario en la empresa (solo admin)
    """
    permission_classes = [IsAuthenticated]

    def _require_admin(self, request):
        if not _is_admin(request.user):
            return Response(
                {'detail': 'Solo los administradores pueden gestionar usuarios.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def get(self, request):
        empresa = request.user.empresa
        if not empresa:
            return Response({'detail': 'Sin empresa asociada.'}, status=status.HTTP_400_BAD_REQUEST)

        usuarios = (
            Usuario.objects.filter(empresa=empresa, activo=True)
            .prefetch_related('usuario_roles__rol')
            .order_by('created_at')
        )
        serializer = UsuarioEmpresaListSerializer(usuarios, many=True)
        return Response(serializer.data)

    @transaction.atomic
    def post(self, request):
        err = self._require_admin(request)
        if err:
            return err

        empresa = request.user.empresa
        if not empresa:
            return Response({'detail': 'Sin empresa asociada.'}, status=status.HTTP_400_BAD_REQUEST)

        # Verificar límite del plan
        max_usuarios = PLAN_MAX_USUARIOS.get(empresa.plan, 3)
        count_actual = Usuario.objects.filter(empresa=empresa, activo=True).count()
        if count_actual >= max_usuarios:
            return Response(
                {'detail': f'Has alcanzado el límite de {max_usuarios} usuarios para el plan {empresa.plan}.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CrearUsuarioEmpresaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        usuario = repo.crear(
            empresa=empresa,
            email=data['email'],
            username=data['username'],
            nombre=data['nombre'],
            apellido_paterno=data['apellido_paterno'],
            apellido_materno=data.get('apellido_materno', ''),
            password=data['password'],
            verificado=True,
            activo=True,
        )

        # Asignar roles
        for nombre_rol in data['roles']:
            rol, _ = Rol.objects.get_or_create(
                empresa=empresa,
                nombre=nombre_rol,
                defaults={'descripcion': nombre_rol.capitalize(), 'es_sistema': True},
            )
            repo.asignar_rol(usuario, rol)

        from apps.auth_module.events import publicar_usuario_creado
        publicar_usuario_creado(usuario)

        return Response(
            UsuarioEmpresaListSerializer(usuario).data,
            status=status.HTTP_201_CREATED,
        )


class UsuariosEmpresaDetailView(APIView):
    """
    PATCH  /api/v1/usuarios/{id}/  — actualiza roles del usuario (solo admin)
    DELETE /api/v1/usuarios/{id}/  — da de baja al usuario (solo admin)
    """
    permission_classes = [IsAuthenticated]

    def _require_admin(self, request):
        if not _is_admin(request.user):
            return Response(
                {'detail': 'Solo los administradores pueden gestionar usuarios.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def _get_usuario(self, user_id, empresa):
        try:
            return Usuario.objects.get(id=user_id, empresa=empresa, activo=True)
        except Usuario.DoesNotExist:
            return None

    @transaction.atomic
    def patch(self, request, pk):
        err = self._require_admin(request)
        if err:
            return err

        usuario = self._get_usuario(pk, request.user.empresa)
        if not usuario:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ActualizarRolesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        empresa = request.user.empresa

        # ── Campos de perfil ─────────────────────────────────────────────
        user_fields_changed = []
        for field in ('nombre', 'apellido_paterno', 'apellido_materno', 'telefono'):
            if field in data:
                setattr(usuario, field, data[field])
                user_fields_changed.append(field)

        if 'email' in data:
            new_email = data['email']
            if new_email != usuario.email:
                if Usuario.objects.filter(email=new_email).exclude(id=usuario.id).exists():
                    return Response({'detail': 'Ya existe un usuario con ese correo.'}, status=status.HTTP_400_BAD_REQUEST)
                usuario.email = new_email
                user_fields_changed.append('email')

        if user_fields_changed:
            usuario.save(update_fields=user_fields_changed)

        # ── Roles ────────────────────────────────────────────────────────
        if 'roles' in data:
            UsuarioRol.objects.filter(usuario=usuario).delete()
            for nombre_rol in data['roles']:
                rol, _ = Rol.objects.get_or_create(
                    empresa=empresa,
                    nombre=nombre_rol,
                    defaults={'descripcion': nombre_rol.capitalize(), 'es_sistema': True},
                )
                repo.asignar_rol(usuario, rol)

        # ── Jefe ─────────────────────────────────────────────────────────
        if 'jefe_id' in data:
            jefe_id = data['jefe_id']
            if jefe_id is None:
                usuario.jefe = None
            elif str(jefe_id) != str(usuario.id):
                try:
                    usuario.jefe = Usuario.objects.get(id=jefe_id, empresa=empresa, activo=True)
                except Usuario.DoesNotExist:
                    pass
            usuario.save(update_fields=['jefe'])

        return Response(UsuarioEmpresaListSerializer(usuario).data)

    @transaction.atomic
    def delete(self, request, pk):
        err = self._require_admin(request)
        if err:
            return err

        usuario = self._get_usuario(pk, request.user.empresa)
        if not usuario:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if str(usuario.id) == str(request.user.id):
            return Response(
                {'detail': 'No puedes darte de baja a ti mismo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario.activo = False
        usuario.save(update_fields=['activo'])

        return Response(status=status.HTTP_204_NO_CONTENT)
