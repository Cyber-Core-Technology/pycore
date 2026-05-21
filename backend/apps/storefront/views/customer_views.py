from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import serializers as drf_serializers, status

from django_ratelimit.decorators import ratelimit
from django_ratelimit.exceptions import Ratelimited

from apps.storefront.auth import ClienteJWTAuthentication
from apps.storefront.permissions import IsClienteStorefront
from apps.storefront.serializers import (
    ClienteRegistroSerializer,
    ClienteLoginSerializer,
    ClienteRefreshSerializer,
    ClientePerfilSerializer,
    PedidoCreateSerializer,
    PedidoSerializer,
)
from apps.storefront.services import ClienteAuthService, PedidoService, OtpService
from apps.storefront.services.storefront_service import StorefrontService


# ── Helpers ────────────────────────────────────────────────────────────────

def _err(msg, code=status.HTTP_400_BAD_REQUEST):
    return Response({'detail': msg}, status=code)


# ── Auth ───────────────────────────────────────────────────────────────────

class EnviarCodigoView(APIView):
    """
    POST /api/v1/store/<slug>/auth/enviar-codigo/
    Body: { email, nombre }
    Rate-limited: 5 requests / hour per IP.
    Envía un OTP de 6 dígitos al correo del futuro cliente.
    """
    permission_classes     = [AllowAny]
    authentication_classes = []

    @method_decorator(ratelimit(key='ip', rate='5/h', method='POST', block=True))
    def post(self, request, slug):
        email  = (request.data.get('email') or '').strip().lower()
        nombre = (request.data.get('nombre') or '').strip()

        if not email or '@' not in email:
            return _err('Correo electrónico inválido.')

        # Verificar que la tienda existe
        config = StorefrontService.get_config_by_slug(slug)
        if not config:
            return _err('Tienda no encontrada.')

        from apps.storefront.models import ClienteStorefront
        if ClienteStorefront.objects.filter(empresa=config.empresa, email=email).exists():
            return _err('Ya existe una cuenta con ese correo en esta tienda.')

        nombre_tienda = config.nombre_tienda or slug
        enviado = OtpService.generar_y_enviar(slug, email, nombre_tienda)
        if not enviado:
            return _err('No se pudo enviar el correo. Inténtalo de nuevo.', status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({'detail': 'Código enviado. Revisa tu correo.'})

    def handle_exception(self, exc):
        if isinstance(exc, Ratelimited):
            return _err('Demasiados intentos. Espera antes de solicitar otro código.', status.HTTP_429_TOO_MANY_REQUESTS)
        return super().handle_exception(exc)


class ClienteRegistroView(APIView):
    permission_classes    = [AllowAny]
    authentication_classes = []

    @method_decorator(ratelimit(key='ip', rate='10/h', method='POST', block=True))
    def post(self, request, slug):
        # Honeypot: si el campo oculto viene relleno, es un bot
        if request.data.get('website'):
            return Response({'detail': 'ok'}, status=status.HTTP_201_CREATED)

        ser = ClienteRegistroSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        d = ser.validated_data

        otp_code = (request.data.get('otp_code') or '').strip()
        if not otp_code:
            return _err('El código de verificación es requerido.')

        if not OtpService.verificar(slug, d['email'], otp_code):
            return _err('Código inválido o expirado.')

        acepto = bool(request.data.get('acepto_privacidad', False))
        try:
            data = ClienteAuthService.registrar(
                slug=slug,
                email=d['email'],
                nombre=d['nombre'],
                password=d['password'],
                telefono=d.get('telefono', ''),
                acepto_privacidad=acepto,
            )
        except ValueError as e:
            return _err(str(e))
        return Response(data, status=status.HTTP_201_CREATED)

    def handle_exception(self, exc):
        if isinstance(exc, Ratelimited):
            return _err('Demasiados intentos de registro.', status.HTTP_429_TOO_MANY_REQUESTS)
        return super().handle_exception(exc)


class ClienteLoginView(APIView):
    permission_classes    = [AllowAny]
    authentication_classes = []

    def post(self, request, slug):
        ser = ClienteLoginSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        d = ser.validated_data
        try:
            data = ClienteAuthService.login(slug=slug, email=d['email'], password=d['password'])
        except ValueError as e:
            return _err(str(e))
        return Response(data)


class ClienteRefreshView(APIView):
    permission_classes    = [AllowAny]
    authentication_classes = []

    def post(self, request, slug):
        ser = ClienteRefreshSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            data = ClienteAuthService.refresh(ser.validated_data['refresh'])
        except ValueError as e:
            return _err(str(e), status.HTTP_401_UNAUTHORIZED)
        return Response(data)


class ClienteGoogleLoginView(APIView):
    """
    POST /api/v1/store/<slug>/auth/google/
    Body: { credential: <Google id_token>, acepto_privacidad: bool }
    """
    permission_classes    = [AllowAny]
    authentication_classes = []

    def post(self, request, slug):
        credential = (request.data.get('credential') or '').strip()
        if not credential:
            return _err('Token de Google requerido.')

        acepto = bool(request.data.get('acepto_privacidad', False))
        try:
            data = ClienteAuthService.google_login(
                slug=slug,
                credential=credential,
                acepto_privacidad=acepto,
            )
        except ValueError as e:
            return _err(str(e))
        return Response(data)


class ClienteMeView(APIView):
    authentication_classes = [ClienteJWTAuthentication]
    permission_classes     = [IsClienteStorefront]

    def get(self, request, slug):
        return Response(ClientePerfilSerializer(request.user).data)

    def patch(self, request, slug):
        ser = ClientePerfilSerializer(request.user, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()
        return Response(ser.data)


# ── Pedidos ────────────────────────────────────────────────────────────────

class PedidoListCreateView(APIView):
    authentication_classes = [ClienteJWTAuthentication]
    permission_classes     = [IsClienteStorefront]

    def get(self, request, slug):
        pedidos = PedidoService.get_pedidos_cliente(request.user)
        return Response(PedidoSerializer(pedidos, many=True).data)

    def post(self, request, slug):
        ser = PedidoCreateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        d = ser.validated_data
        try:
            pedido = PedidoService.crear_pedido(
                cliente     = request.user,
                metodo_pago = d['metodo_pago'],
                detalles    = d['detalles'],
                notas       = d.get('notas_cliente', ''),
            )
        except ValueError as e:
            return _err(str(e))
        return Response(PedidoSerializer(pedido).data, status=status.HTTP_201_CREATED)


class PedidoDetailView(APIView):
    authentication_classes = [ClienteJWTAuthentication]
    permission_classes     = [IsClienteStorefront]

    def get(self, request, slug, pedido_id):
        from apps.storefront.models import PedidoStorefront
        try:
            pedido = (
                PedidoStorefront.objects
                .prefetch_related('detalles')
                .get(id=pedido_id, cliente=request.user)
            )
        except PedidoStorefront.DoesNotExist:
            return _err('Pedido no encontrado.', status.HTTP_404_NOT_FOUND)
        return Response(PedidoSerializer(pedido).data)


# ── Mercado Pago Webhook ────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class MpWebhookView(APIView):
    permission_classes     = [AllowAny]
    authentication_classes = []

    def post(self, request):
        result = PedidoService.webhook_mp(request.data)
        return Response(result)
