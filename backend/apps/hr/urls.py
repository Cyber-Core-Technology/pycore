from rest_framework.routers import DefaultRouter
from apps.hr.views import ColaboradorViewSet, AsistenciaViewSet

router = DefaultRouter()
router.register('colaboradores', ColaboradorViewSet, basename='colaborador')
router.register('asistencias', AsistenciaViewSet, basename='asistencia')

urlpatterns = router.urls
