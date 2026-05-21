from apps.hr.models import Asistencia


class AsistenciaRepository:

    def get_by_id(self, id, empresa) -> Asistencia | None:
        try:
            return Asistencia.objects.select_related(
                'colaborador'
            ).get(id=id, empresa=empresa)
        except Asistencia.DoesNotExist:
            return None

    def list_by_empresa(self, empresa, filters: dict = None):
        qs = Asistencia.objects.filter(
            empresa=empresa
        ).select_related('colaborador')

        if not filters:
            return qs

        if filters.get('id_colaborador'):
            qs = qs.filter(colaborador=filters['id_colaborador'])
        if filters.get('fecha'):
            qs = qs.filter(fecha=filters['fecha'])
        if filters.get('fecha_desde'):
            qs = qs.filter(fecha__gte=filters['fecha_desde'])
        if filters.get('fecha_hasta'):
            qs = qs.filter(fecha__lte=filters['fecha_hasta'])
        if filters.get('estado'):
            qs = qs.filter(estado=filters['estado'])
        if filters.get('tipo'):
            qs = qs.filter(tipo=filters['tipo'])

        return qs

    def create(self, **kwargs) -> Asistencia:
        return Asistencia.objects.create(**kwargs)

    def save(self, asistencia: Asistencia) -> Asistencia:
        asistencia.save()
        return asistencia
