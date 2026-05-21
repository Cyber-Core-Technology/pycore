import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from shared.events import event_bus, DomainEvents

logger = logging.getLogger(__name__)

VALID_THEMES = {
    'esmeralda', 'indigo', 'violeta', 'carmesi',
    'ambar', 'oceano', 'rosa', 'lima', 'naranja', 'pizarra',
}

PLAN_CON_TEMAS = {'empresarial', 'elite'}


class EmpresaThemeView(APIView):
    """
    GET  /api/v1/core/tema/  → devuelve el theme_key activo de la empresa.
    PUT  /api/v1/core/tema/  → actualiza el theme_key (requiere admin + plan empresarial/elite).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return Response({'theme_key': 'esmeralda'})
        return Response({'theme_key': empresa.theme_key or 'esmeralda'})

    def put(self, request):
        usuario = request.user
        empresa = getattr(usuario, 'empresa', None)

        if not empresa:
            return Response({'detail': 'Sin empresa asociada.'}, status=status.HTTP_400_BAD_REQUEST)

        is_admin = usuario.is_staff or (
            hasattr(usuario, 'roles') and usuario.roles.filter(slug='admin').exists()
        )
        if not is_admin:
            return Response(
                {'detail': 'Solo el administrador puede cambiar el tema.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if empresa.plan not in PLAN_CON_TEMAS:
            return Response(
                {'detail': 'La personalización de tema está disponible en los planes Empresarial y Elite.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        theme_key = (request.data.get('theme_key') or '').strip()
        if theme_key not in VALID_THEMES:
            return Response(
                {'detail': f'Tema inválido. Opciones: {", ".join(sorted(VALID_THEMES))}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        empresa.theme_key = theme_key
        empresa.save(update_fields=['theme_key'])

        try:
            event_bus.publish(DomainEvents.EMPRESA_TEMA_ACTUALIZADO, {
                'empresa_id': str(empresa.id_empresa),
                'id_empresa': str(empresa.id_empresa),
                'theme_key':  theme_key,
            })
        except Exception as e:
            logger.warning(f'[Theme] No se pudo publicar evento tema_actualizado: {e}')

        return Response({'theme_key': theme_key})
