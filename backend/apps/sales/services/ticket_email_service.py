"""
Envío del ticket de venta por correo al cliente con el PDF adjunto.
Usa la infraestructura de correo de Django (EmailMultiAlternatives) y una
plantilla HTML homologada con el correo de bienvenida.
"""
import logging
from decimal import Decimal

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)

_METODO_LABEL = {
    'efectivo':        'Efectivo',
    'tarjeta_debito':  'Tarjeta de débito',
    'tarjeta_credito': 'Tarjeta de crédito',
    'transferencia':   'Transferencia bancaria',
    'cheque':          'Cheque',
    'credito':         'Crédito',
    'otro':            'Otro',
}


def _mxn(value) -> str:
    monto = Decimal(str(value or 0))
    return f'${monto:,.2f} MXN'


def _qty(value) -> str:
    num = Decimal(str(value or 0))
    texto = f'{num:.3f}'.rstrip('0').rstrip('.')
    return texto or '0'


class TicketEmailService:

    @staticmethod
    def enviar(venta, email_destino: str, pdf_bytes: bytes) -> bool:
        """
        Envía el ticket de la venta por correo con el PDF adjunto.
        Devuelve True si se envió; propaga la excepción si falla para que la
        vista pueda reportar el error al usuario.
        """
        empresa = venta.empresa
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        total = Decimal(str(venta.total or 0))

        nombre_cliente = ''
        if venta.cliente and venta.cliente.nombre_comercial:
            nombre_cliente = venta.cliente.nombre_comercial

        detalles = [
            {
                'nombre':   getattr(d.producto, 'nombre', '') or '',
                'cantidad': _qty(d.cantidad),
                'total':    _mxn(d.total),
            }
            for d in venta.detalles.all()
        ]

        descuento = Decimal(str(venta.descuento or 0))

        contexto = {
            'logo_url':       f'{frontend_url}/Logo.png',
            'empresa_nombre': empresa.nombre,
            'nombre':         nombre_cliente,
            'folio':          venta.folio,
            'fecha':          timezone.localtime(venta.fecha_venta).strftime('%d/%m/%Y %H:%M'),
            'sucursal':       venta.sucursal.nombre,
            'metodo_pago':    _METODO_LABEL.get(venta.metodo_pago, venta.metodo_pago),
            'detalles':       detalles,
            'subtotal':       _mxn(venta.subtotal),
            'descuento':      _mxn(descuento) if descuento > 0 else '',
            'impuestos':      _mxn(venta.impuestos),
            'total':          _mxn(total),
            # Contacto del negocio (no de PyCore): solo si la empresa lo tiene.
            'contacto_email': empresa.email or '',
            'contacto_tel':   empresa.telefono or '',
        }

        html_body = render_to_string('emails/ticket_venta.html', contexto)
        plain_body = (
            f'¡Gracias por tu compra en {empresa.nombre}!\n\n'
            f'Folio: {venta.folio}\n'
            f'Fecha: {contexto["fecha"]}\n'
            f'Total: {_mxn(total)}\n\n'
            f'Adjuntamos tu ticket de compra en PDF.\n'
        )

        msg = EmailMultiAlternatives(
            subject=f'Tu ticket de compra — {empresa.nombre} (Folio {venta.folio})',
            body=plain_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email_destino],
        )
        msg.attach_alternative(html_body, 'text/html')
        msg.attach(f'Ticket_{venta.folio}.pdf', pdf_bytes, 'application/pdf')
        msg.send()

        logger.info('Ticket de venta %s enviado por correo a %s', venta.folio, email_destino)
        return True
