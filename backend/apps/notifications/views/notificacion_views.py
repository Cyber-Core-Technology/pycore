# apps/notifications/views/notificacion_views.py
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.mixins import ListModelMixin, RetrieveModelMixin
from rest_framework.permissions import IsAuthenticated

from apps.notifications.models import Notificacion
from apps.notifications.serializers import NotificacionSerializer, BroadcastSerializer
from apps.notifications.services import NotificacionService


class NotificacionViewSet(ListModelMixin, RetrieveModelMixin, GenericViewSet):
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Sin slice para que get_object() pueda filtrar por pk correctamente.
        # El límite de 100 se aplica solo en list().
        return Notificacion.objects.filter(
            destinatario=self.request.user
        ).select_related('remitente').order_by('-created_at')

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()[:100]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='leer')
    def leer(self, request, pk=None):
        notif = self.get_object()
        if not notif.leida:
            notif.leida = True
            notif.save(update_fields=['leida'])
        return Response(NotificacionSerializer(notif).data)

    @action(detail=False, methods=['post'], url_path='marcar-todas-leidas')
    def marcar_todas_leidas(self, request):
        updated = Notificacion.objects.filter(
            destinatario=request.user, leida=False
        ).update(leida=True)
        return Response({'updated': updated})

    @action(detail=False, methods=['get'], url_path='no-leidas')
    def no_leidas(self, request):
        count = Notificacion.objects.filter(
            destinatario=request.user, leida=False
        ).count()
        return Response({'count': count})

    @action(detail=False, methods=['post'], url_path='broadcast')
    def broadcast(self, request):
        # Solo admins/staff pueden broadcast
        user = request.user
        empresa = getattr(user, 'empresa', None)

        if not empresa:
            return Response({'detail': 'Sin empresa asignada.'}, status=status.HTTP_403_FORBIDDEN)

        # Verificar que el usuario tiene rol admin en la empresa
        tiene_admin = user.is_staff or user.usuario_roles.filter(rol__nombre='Administrador').exists()
        if not tiene_admin:
            return Response(
                {'detail': 'Solo administradores pueden enviar mensajes masivos.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = BroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        count = NotificacionService.broadcast(
            empresa=empresa,
            remitente=user,
            titulo=serializer.validated_data['titulo'],
            mensaje=serializer.validated_data['mensaje'],
            rol_slug=serializer.validated_data.get('rol_slug', ''),
        )
        return Response({'enviadas': count}, status=status.HTTP_201_CREATED)
