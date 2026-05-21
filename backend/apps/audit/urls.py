from django.urls import path
from apps.audit.views import LogAuditoriaListView

urlpatterns = [
    path('logs/', LogAuditoriaListView.as_view(), name='audit-logs'),
]
