from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import PushSubscription


class VapidPublicKeyView(APIView):
    """GET /api/v1/notifications/push/vapid-key/ — devuelve la clave pública VAPID."""
    permission_classes = [AllowAny]

    def get(self, request):
        public_key = getattr(settings, 'VAPID_PUBLIC_KEY', '')
        if not public_key:
            return Response(
                {'detail': 'Web Push no configurado en este servidor.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({'public_key': public_key})


class PushSubscribeView(APIView):
    """
    POST   /api/v1/notifications/push/subscribe/   → registra suscripción
    DELETE /api/v1/notifications/push/subscribe/   → elimina suscripción del dispositivo
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        endpoint    = request.data.get('endpoint', '').strip()
        keys        = request.data.get('keys', {})
        p256dh      = keys.get('p256dh', '').strip()
        auth        = keys.get('auth', '').strip()
        user_agent  = request.META.get('HTTP_USER_AGENT', '')[:300]

        if not endpoint or not p256dh or not auth:
            return Response(
                {'detail': 'Se requieren endpoint, keys.p256dh y keys.auth.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        empresa = getattr(request.user, 'empresa', None)
        if not empresa:
            return Response(
                {'detail': 'Usuario sin empresa asignada.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        sub, created = PushSubscription.objects.update_or_create(
            endpoint=endpoint,
            defaults={
                'usuario':    request.user,
                'empresa':    empresa,
                'keys_p256dh': p256dh,
                'keys_auth':  auth,
                'user_agent': user_agent,
            },
        )

        return Response(
            {'detail': 'Suscripción registrada.' if created else 'Suscripción actualizada.'},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        endpoint = request.data.get('endpoint', '').strip()
        if not endpoint:
            return Response(
                {'detail': 'Se requiere endpoint.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted, _ = PushSubscription.objects.filter(
            endpoint=endpoint,
            usuario=request.user,
        ).delete()
        return Response({'detail': f'{deleted} suscripción(es) eliminada(s).'})
