from django.urls import path
from apps.storefront.views import (
    StorefrontHomeView, StorefrontProductosView, StorefrontProductoDetalleView,
    EnviarCodigoView,
    ClienteRegistroView, ClienteLoginView, ClienteRefreshView, ClienteGoogleLoginView, ClienteMeView,
    PedidoListCreateView, PedidoDetailView,
    MpWebhookView,
    ClienteTwoFAVerifyView, ClienteTwoFAResendEmailView,
    ClienteTwoFASetupView, ClienteTwoFAEnableView, ClienteTwoFADisableView,
)

urlpatterns = [
    # ── Catálogo público ──────────────────────────────────────────────────
    path('<slug:slug>/',                              StorefrontHomeView.as_view(),            name='store-home'),
    path('<slug:slug>/productos/',                    StorefrontProductosView.as_view(),       name='store-productos'),
    path('<slug:slug>/productos/<slug:producto_slug>/', StorefrontProductoDetalleView.as_view(), name='store-producto-detalle'),

    # ── Auth de clientes ──────────────────────────────────────────────────
    path('<slug:slug>/auth/enviar-codigo/', EnviarCodigoView.as_view(),    name='store-enviar-codigo'),
    path('<slug:slug>/auth/registro/',      ClienteRegistroView.as_view(),    name='store-registro'),
    path('<slug:slug>/auth/login/',         ClienteLoginView.as_view(),       name='store-login'),
    path('<slug:slug>/auth/google/',        ClienteGoogleLoginView.as_view(), name='store-google-login'),
    path('<slug:slug>/auth/refresh/',       ClienteRefreshView.as_view(),  name='store-refresh'),
    path('<slug:slug>/auth/me/',            ClienteMeView.as_view(),       name='store-me'),

    # ── 2FA ───────────────────────────────────────────────────────────────
    path('<slug:slug>/auth/2fa/verify/',  ClienteTwoFAVerifyView.as_view(),      name='store-2fa-verify'),
    path('<slug:slug>/auth/2fa/resend/',  ClienteTwoFAResendEmailView.as_view(), name='store-2fa-resend'),
    path('<slug:slug>/auth/2fa/setup/',   ClienteTwoFASetupView.as_view(),       name='store-2fa-setup'),
    path('<slug:slug>/auth/2fa/enable/',  ClienteTwoFAEnableView.as_view(),      name='store-2fa-enable'),
    path('<slug:slug>/auth/2fa/disable/', ClienteTwoFADisableView.as_view(),     name='store-2fa-disable'),

    # ── Pedidos ───────────────────────────────────────────────────────────
    path('<slug:slug>/pedidos/',               PedidoListCreateView.as_view(), name='store-pedidos'),
    path('<slug:slug>/pedidos/<uuid:pedido_id>/', PedidoDetailView.as_view(),  name='store-pedido-detail'),

    # ── Mercado Pago webhook (sin slug) ───────────────────────────────────
    path('mp/webhook/', MpWebhookView.as_view(), name='store-mp-webhook'),
]
