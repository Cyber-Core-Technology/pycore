from django.db import transaction

from apps.auth_module.repositories import UsuarioRepository
from apps.auth_module.exceptions import UsuarioYaExisteException
from apps.auth_module.models import Rol, UsuarioRol
from apps.core.services import EmpresaService
from apps.core.repositories import EmpresaRepository

repo = UsuarioRepository()
empresa_repo = EmpresaRepository()
empresa_service = EmpresaService()


class UsuarioService:

    @transaction.atomic
    def registrar_empresa_y_admin(self, data: dict) -> dict:
        """
        Onboarding completo: crea empresa + usuario administrador + rol admin.
        """
        # Verificar duplicados
        if repo.get_by_email(data['email']):
            raise UsuarioYaExisteException(detail='Ya existe un usuario con ese email.')
        if repo.get_by_username(data['username']):
            raise UsuarioYaExisteException(detail='Ya existe un usuario con ese username.')

        # 1. Crear empresa usando EmpresaService existente
        empresa = empresa_service.crear({
            'nombre': data['nombre_empresa'],
            'rfc': data.get('rfc', ''),
            'tipo_negocio': data.get('tipo_negocio', 'informal'),
        })
        giro = data.get('giro_negocio', '')
        if giro:
            empresa.giro_negocio = giro
            empresa.save(update_fields=['giro_negocio'])
            self._sembrar_categorias(empresa, giro)

        # 2. Crear usuario admin
        usuario = repo.crear(
            empresa=empresa,
            email=data['email'],
            username=data['username'],
            nombre=data['nombre'],
            apellido_paterno=data.get('apellido_paterno', ''),
            apellido_materno=data.get('apellido_materno', ''),
            telefono=data.get('telefono', ''),
            password=data['password'],
            verificado=True,
        )

        # 3. Crear rol admin de sistema para la empresa y asignarlo
        rol_admin, _ = Rol.objects.get_or_create(
            empresa=empresa,
            nombre='admin',
            defaults={
                'descripcion': 'Administrador de la empresa',
                'es_sistema': True,
            },
        )
        repo.asignar_rol(usuario, rol_admin)

        from apps.auth_module.events import publicar_usuario_creado
        publicar_usuario_creado(usuario, id_empresa=str(empresa.id_empresa))

        return {
            'usuario': usuario,
            'empresa': empresa,
        }

    def _sembrar_categorias(self, empresa, giro: str):
        from apps.catalogs.models import Categoria
        from apps.catalogs.giro_templates import GIRO_CATEGORIAS

        plantilla = GIRO_CATEGORIAS.get(giro, [])
        for i, (nombre_cat, subcats) in enumerate(plantilla):
            codigo = f'{giro[:3].upper()}{i+1:02d}'
            padre = Categoria.objects.create(
                empresa=empresa,
                nombre=nombre_cat,
                codigo=codigo,
            )
            for j, nombre_sub in enumerate(subcats):
                Categoria.objects.create(
                    empresa=empresa,
                    nombre=nombre_sub,
                    codigo=f'{codigo}-{j+1:02d}',
                    padre=padre,
                )

    def actualizar_perfil(self, usuario, data: dict):
        campos_permitidos = [
            'nombre', 'apellido_paterno', 'apellido_materno',
            'telefono', 'foto_url', 'idioma', 'zona_horaria', 'tema',
        ]
        for campo in campos_permitidos:
            if campo in data:
                setattr(usuario, campo, data[campo])
        usuario.save()
        return usuario

    def cambiar_password(self, usuario, password_actual: str, password_nuevo: str):
        if not usuario.check_password(password_actual):
            from apps.auth_module.exceptions import CredencialesInvalidasException
            raise CredencialesInvalidasException(detail='Contraseña actual incorrecta.')
        usuario.set_password(password_nuevo)
        usuario.save()
