from django.urls import path
from rest_framework.routers import DefaultRouter
from apps.notifications.views import NotificacionViewSet, VapidPublicKeyView, PushSubscribeView

router = DefaultRouter()
router.register('', NotificacionViewSet, basename='notificacion')

urlpatterns = [
    path('push/vapid-key/',  VapidPublicKeyView.as_view(),  name='push-vapid-key'),
    path('push/subscribe/',  PushSubscribeView.as_view(),   name='push-subscribe'),
    *router.urls,
]
