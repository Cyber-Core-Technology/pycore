from django.urls import re_path
from apps.ws.consumers import EmpresaConsumer

websocket_urlpatterns = [
    re_path(r'^ws/empresa/$', EmpresaConsumer.as_asgi()),
]
