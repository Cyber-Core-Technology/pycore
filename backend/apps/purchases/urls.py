from rest_framework.routers import DefaultRouter
from apps.purchases.views import CompraViewSet

router = DefaultRouter()
router.register(r'compras', CompraViewSet, basename='compras')

urlpatterns = router.urls
