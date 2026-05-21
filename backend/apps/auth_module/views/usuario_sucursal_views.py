from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from apps.auth_module.models import Usuario, UsuarioSucursal
from apps.auth_module.repositories import UsuarioRepository
from apps.core.models import Sucursal

repo = UsuarioRepository()


def _is_admin(user) -> bool:
    roles = [r.lower() for r in repo.get_roles_usuario(user)]
    return any(r in ('admin', 'administrador') for r in roles) or user.is_staff


def _serialize_sucursal(us: UsuarioSucursal) -> dict:
    s = us.sucursal
    return {
        'id_sucursal':      str(s.id_sucursal),
        'nombre':           s.nombre,
        'codigo':           s.codigo,
        'es_principal':     s.es_principal,
        'es_predeterminada': us.es_predeterminada,
    }


class UsuarioSucursalesView(APIView):
    """
    GET  /api/v1/usuarios/{pk}/sucursales/   — lista sucursales asignadas (admin)
    POST /api/v1/usuarios/{pk}/sucursales/   — asigna una sucursal (admin)
    PUT  /api/v1/usuarios/{pk}/sucursales/   — reemplaza el conjunto completo (admin)
    """
    permission_classes = [IsAuthenticated]

    def _get_usuario(self, request, pk):
        try:
            return Usuario.objects.select_related('empresa').get(
                id=pk, empresa=request.user.empresa, activo=True
            )
        except Usuario.DoesNotExist:
            return None

    def get(self, request, pk):
        if not _is_admin(request.user):
            return Response({'detail': 'Solo administradores.'}, status=status.HTTP_403_FORBIDDEN)
        usuario = self._get_usuario(request, pk)
        if not usuario:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        asignaciones = (
            UsuarioSucursal.objects
            .filter(usuario=usuario)
            .select_related('sucursal')
        )
        return Response([_serialize_sucursal(a) for a in asignaciones])

    def post(self, request, pk):
        if not _is_admin(request.user):
            return Response({'detail': 'Solo administradores.'}, status=status.HTTP_403_FORBIDDEN)
        usuario = self._get_usuario(request, pk)
        if not usuario:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        sucursal_id = request.data.get('sucursal_id')
        if not sucursal_id:
            return Response({'detail': 'sucursal_id es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sucursal = Sucursal.objects.get(
                id_sucursal=sucursal_id, empresa=request.user.empresa, activo=True
            )
        except Sucursal.DoesNotExist:
            return Response({'detail': 'Sucursal no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        es_predeterminada = request.data.get('es_predeterminada', False)
        us, created = UsuarioSucursal.objects.get_or_create(
            usuario=usuario,
            sucursal=sucursal,
            defaults={'es_predeterminada': es_predeterminada},
        )
        return Response(
            _serialize_sucursal(us),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def put(self, request, pk):
        """Reemplaza el conjunto completo de sucursales asignadas al usuario."""
        if not _is_admin(request.user):
            return Response({'detail': 'Solo administradores.'}, status=status.HTTP_403_FORBIDDEN)
        usuario = self._get_usuario(request, pk)
        if not usuario:
            return Response({'detail': 'Usuario no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        sucursal_ids = request.data.get('sucursal_ids', [])
        repo.set_sucursales(usuario, sucursal_ids)

        asignaciones = (
            UsuarioSucursal.objects
            .filter(usuario=usuario)
            .select_related('sucursal')
        )
        return Response([_serialize_sucursal(a) for a in asignaciones])


class UsuarioSucursalDeleteView(APIView):
    """
    DELETE /api/v1/usuarios/{pk}/sucursales/{sucursal_id}/  — quita acceso a sucursal (admin)
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, sucursal_id):
        if not _is_admin(request.user):
            return Response({'detail': 'Solo administradores.'}, status=status.HTTP_403_FORBIDDEN)
        deleted, _ = UsuarioSucursal.objects.filter(
            usuario__id=pk,
            usuario__empresa=request.user.empresa,
            sucursal__id_sucursal=sucursal_id,
        ).delete()
        if not deleted:
            return Response({'detail': 'Asignación no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeSucursalesView(APIView):
    """
    GET /api/v1/auth/me/sucursales/  — sucursales del usuario autenticado
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        asignaciones = (
            UsuarioSucursal.objects
            .filter(usuario=request.user)
            .select_related('sucursal')
        )
        return Response([_serialize_sucursal(a) for a in asignaciones])
