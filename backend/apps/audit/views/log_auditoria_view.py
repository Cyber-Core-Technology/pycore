import logging
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from apps.audit.services import AuditService
from apps.audit.serializers import LogAuditoriaSerializer

logger = logging.getLogger(__name__)


class _AuditoriaPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class LogAuditoriaListView(APIView):
    permission_classes = [IsAuthenticated]

    def _is_admin(self, user) -> bool:
        if user.is_staff or getattr(user, 'is_superuser', False):
            return True
        try:
            from apps.auth_module.repositories import UsuarioRepository
            roles = UsuarioRepository().get_roles_usuario(user)
            return any(r.lower() in ('admin', 'administrador') for r in roles)
        except Exception:
            return False

    def get(self, request):
        user = request.user
        if not self._is_admin(user):
            return Response(
                {'error': 'Sin permisos para ver auditoría.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        filters = {k: v for k, v in {
            'accion':        request.query_params.get('accion'),
            'tabla':         request.query_params.get('tabla'),
            'id_registro':   request.query_params.get('id_registro'),
            'id_usuario':    request.query_params.get('id_usuario'),
            'usuario_email': request.query_params.get('usuario_email'),
            'fecha_desde':   request.query_params.get('fecha_desde'),
            'fecha_hasta':   request.query_params.get('fecha_hasta'),
        }.items() if v}

        service = AuditService()

        if user.is_staff:
            id_empresa = request.query_params.get('id_empresa')
            qs = service.listar(id_empresa, filters) if id_empresa else service.listar_all(filters)
        else:
            qs = service.listar(user.empresa_id, filters)

        paginator = _AuditoriaPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = LogAuditoriaSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
