import os
import time
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser

from apps.auth_module.serializers import (
    UsuarioPerfilSerializer, UsuarioActualizarSerializer, CambiarPasswordSerializer
)
from apps.auth_module.services import UsuarioService

usuario_service = UsuarioService()


def _usar_s3():
    return bool(getattr(settings, 'AWS_STORAGE_BUCKET_NAME', ''))


def _s3_client():
    import boto3
    return boto3.client(
        's3',
        region_name=settings.AWS_S3_REGION_NAME,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioPerfilSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UsuarioActualizarSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        usuario = usuario_service.actualizar_perfil(request.user, serializer.validated_data)
        return Response(UsuarioPerfilSerializer(usuario).data)


class MeFotoView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    ALLOWED = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB

    def _s3_key(self, usuario):
        slug = usuario.empresa.slug if usuario.empresa else 'sin-empresa'
        usuario_short = str(usuario.id)[:8]
        return f'empresas/{slug}/usuarios/{usuario_short}/foto'

    def _borrar_foto_s3(self, usuario):
        s3 = _s3_client()
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        prefix = self._s3_key(usuario)
        resp = s3.list_objects_v2(Bucket=bucket, Prefix=prefix)
        for obj in resp.get('Contents', []):
            s3.delete_object(Bucket=bucket, Key=obj['Key'])

    def _borrar_foto_local(self, usuario_id: str):
        carpeta = settings.MEDIA_ROOT / 'usuarios' / 'fotos'
        for ext in ('.jpg', '.jpeg', '.png', '.webp', '.gif'):
            f = carpeta / f"{usuario_id}{ext}"
            if f.exists():
                f.unlink()

    def post(self, request):
        archivo = request.FILES.get('foto')
        if not archivo:
            return Response({'detail': 'No se recibió ningún archivo.'}, status=status.HTTP_400_BAD_REQUEST)
        if archivo.content_type not in self.ALLOWED:
            return Response({'detail': 'Formato no permitido. Usa JPG, PNG, WEBP o GIF.'}, status=status.HTTP_400_BAD_REQUEST)
        if archivo.size > self.MAX_SIZE:
            return Response({'detail': 'El archivo excede el límite de 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        usuario = request.user
        ext = os.path.splitext(archivo.name)[1].lower() or '.jpg'

        if _usar_s3():
            self._borrar_foto_s3(usuario)
            s3_key = f'{self._s3_key(usuario)}_{int(time.time())}{ext}'
            s3 = _s3_client()
            s3.upload_fileobj(
                archivo,
                settings.AWS_STORAGE_BUCKET_NAME,
                s3_key,
                ExtraArgs={'ContentType': archivo.content_type},
            )
            dominio = settings.AWS_CLOUDFRONT_DOMAIN or f'{settings.AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com'
            foto_url = f'https://{dominio}/{s3_key}'
        else:
            self._borrar_foto_local(str(usuario.id))
            carpeta = settings.MEDIA_ROOT / 'usuarios' / 'fotos'
            carpeta.mkdir(parents=True, exist_ok=True)
            nombre_archivo = f"{usuario.id}{ext}"
            ruta = carpeta / nombre_archivo
            with open(ruta, 'wb') as f:
                for chunk in archivo.chunks():
                    f.write(chunk)
            foto_url = f"{settings.MEDIA_URL}usuarios/fotos/{nombre_archivo}"

        usuario.foto_url = foto_url
        usuario.save(update_fields=['foto_url'])
        return Response({'foto_url': foto_url}, status=status.HTTP_200_OK)

    def delete(self, request):
        usuario = request.user
        if _usar_s3():
            self._borrar_foto_s3(usuario)
        else:
            self._borrar_foto_local(str(usuario.id))
        usuario.foto_url = ''
        usuario.save(update_fields=['foto_url'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CambiarPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usuario_service.cambiar_password(
            request.user,
            serializer.validated_data['password_actual'],
            serializer.validated_data['password_nuevo'],
        )
        return Response({'message': 'Contraseña actualizada correctamente.'})
