from django.urls import path
from apps.auth_module.views import (
    RegisterView, LoginView, LogoutView, TokenRefreshView,
    MeView, MeFotoView, CambiarPasswordView,
    MeSucursalesView,
    TwoFAVerifyView, TwoFASetupView, TwoFAEnableView, TwoFADisableView, TwoFAResendEmailView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('me/foto/', MeFotoView.as_view(), name='auth-me-foto'),
    path('me/password/', CambiarPasswordView.as_view(), name='auth-cambiar-password'),
    path('me/sucursales/', MeSucursalesView.as_view(), name='auth-me-sucursales'),
    # 2FA
    path('2fa/verify/',  TwoFAVerifyView.as_view(),     name='auth-2fa-verify'),
    path('2fa/resend/',  TwoFAResendEmailView.as_view(), name='auth-2fa-resend'),
    path('me/2fa/setup/',   TwoFASetupView.as_view(),   name='auth-2fa-setup'),
    path('me/2fa/enable/',  TwoFAEnableView.as_view(),  name='auth-2fa-enable'),
    path('me/2fa/disable/', TwoFADisableView.as_view(), name='auth-2fa-disable'),
]
