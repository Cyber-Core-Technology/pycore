from apps.hr.models import Colaborador


class ColaboradorRepository:

    def get_by_id(self, id, empresa) -> Colaborador | None:
        try:
            return Colaborador.objects.select_related(
                'sucursal', 'usuario'
            ).get(id=id, empresa=empresa, deleted_at__isnull=True)
        except Colaborador.DoesNotExist:
            return None

    def list_by_empresa(self, empresa, filters: dict = None):
        qs = Colaborador.objects.filter(
            empresa=empresa, deleted_at__isnull=True
        ).select_related('sucursal', 'usuario')

        if not filters:
            return qs

        if filters.get('estado'):
            qs = qs.filter(estado=filters['estado'])
        if filters.get('departamento'):
            qs = qs.filter(departamento__icontains=filters['departamento'])
        if filters.get('id_sucursal'):
            qs = qs.filter(sucursal=filters['id_sucursal'])
        if filters.get('q'):
            from django.db.models import Q
            q = filters['q']
            qs = qs.filter(
                Q(nombre__icontains=q) |
                Q(apellido_paterno__icontains=q) |
                Q(numero_empleado__icontains=q) |
                Q(puesto__icontains=q)
            )
        return qs

    def create(self, **kwargs) -> Colaborador:
        return Colaborador.objects.create(**kwargs)

    def save(self, colaborador: Colaborador) -> Colaborador:
        colaborador.save()
        return colaborador

    def generar_numero_empleado(self, empresa) -> str:
        ultimo = (
            Colaborador.objects.filter(empresa=empresa)
            .order_by('-created_at')
            .values_list('numero_empleado', flat=True)
            .first()
        )
        if ultimo:
            try:
                num = int(ultimo.split('-')[-1])
            except ValueError:
                num = 0
        else:
            num = 0
        return f"EMP-{num + 1:04d}"
