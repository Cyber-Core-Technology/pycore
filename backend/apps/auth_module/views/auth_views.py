from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.auth_module.serializers import (
    LoginSerializer, LogoutSerializer, RegisterSerializer, TokenRefreshSerializer
)
from apps.auth_module.services import AuthService, UsuarioService

auth_service = AuthService()
usuario_service = UsuarioService()


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resultado = usuario_service.registrar_empresa_y_admin(serializer.validated_data)
        usuario  = resultado['usuario']
        empresa  = resultado['empresa']

        tokens       = auth_service._generar_tokens(usuario)
        datos_usuario = auth_service._datos_usuario(usuario)

        return Response(
            {
                'message': '¡Empresa registrada exitosamente!',
                **tokens,
                'usuario': datos_usuario,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = (
            request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            or request.META.get('REMOTE_ADDR', '')
        )
        resultado = auth_service.login(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            ip_address=ip,
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            trust_token=serializer.validated_data.get('trust_token', ''),
        )
        return Response(resultado, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = (
            request.META.get('HTTP_X_FORWARDED_FOR', '').split(',')[0].strip()
            or request.META.get('REMOTE_ADDR', '')
        )
        auth_service.logout(
            refresh_token=serializer.validated_data['refresh'],
            usuario=request.user,
            ip_address=ip,
        )
        return Response({'message': 'Sesión cerrada correctamente.'}, status=status.HTTP_200_OK)


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        resultado = auth_service.refresh(serializer.validated_data['refresh'])
        return Response(resultado, status=status.HTTP_200_OK)
