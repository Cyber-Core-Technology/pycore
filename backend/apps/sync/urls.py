from django.urls import path
from apps.sync.views.sync_views import SyncPullView, SyncPushView, SyncStatusView

urlpatterns = [
    path('pull/', SyncPullView.as_view(), name='sync-pull'),
    path('push/', SyncPushView.as_view(), name='sync-push'),
    path('status/', SyncStatusView.as_view(), name='sync-status'),
]
