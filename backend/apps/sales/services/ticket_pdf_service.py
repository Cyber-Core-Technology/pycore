"""
Generación del PDF del ticket de venta usando ReportLab.
Reproduce el ticket estilo recibo de 80mm que se muestra en el frontend,
para poder adjuntarlo y compartirlo por correo con el cliente.
"""
from __future__ import annotations

import io
from decimal import Decimal
from typing import TYPE_CHECKING

from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

if TYPE_CHECKING:
    from apps.sales.models import Venta

# Ancho del ticket: 80mm de papel menos los márgenes.
_PAGE_WIDTH = 80 * mm
_MARGIN = 4 * mm
_CONTENT_WIDTH = _PAGE_WIDTH - 2 * _MARGIN

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
    return f'${monto:,.2f}'


def _qty(value) -> str:
    num = Decimal(str(value or 0))
    # Elimina ceros decimales innecesarios (3 -> "3", 1.500 -> "1.5")
    texto = f'{num:.3f}'.rstrip('0').rstrip('.')
    return texto or '0'


class TicketPDFService:

    @staticmethod
    def generar(venta: 'Venta') -> bytes:
        """Genera el PDF del ticket de la venta. Devuelve los bytes del PDF."""
        empresa = venta.empresa
        detalles = list(venta.detalles.all())

        buf = io.BytesIO()
        # La altura se ajusta automáticamente al contenido en SimpleDocTemplate
        # usando un alto generoso; el papel térmico es de rollo continuo.
        doc = SimpleDocTemplate(
            buf,
            pagesize=(_PAGE_WIDTH, 297 * mm),
            rightMargin=_MARGIN, leftMargin=_MARGIN,
            topMargin=_MARGIN, bottomMargin=_MARGIN,
            title=f'Ticket {venta.folio}',
        )

        s_empresa = ParagraphStyle('empresa', fontSize=12, leading=14, alignment=TA_CENTER, fontName='Helvetica-Bold')
        s_meta    = ParagraphStyle('meta', fontSize=7, leading=9, alignment=TA_CENTER, textColor=colors.Color(0.33, 0.33, 0.33))
        s_folio   = ParagraphStyle('folio', fontSize=11, leading=13, alignment=TA_CENTER, fontName='Helvetica-Bold')
        s_label   = ParagraphStyle('label', fontSize=8, leading=11, textColor=colors.Color(0.4, 0.4, 0.4))
        s_value   = ParagraphStyle('value', fontSize=8, leading=11, alignment=TA_RIGHT)
        s_prod    = ParagraphStyle('prod', fontSize=8, leading=10, fontName='Helvetica-Bold')
        s_sku     = ParagraphStyle('sku', fontSize=6, leading=8, textColor=colors.Color(0.55, 0.55, 0.55))
        s_cell    = ParagraphStyle('cell', fontSize=8, leading=10, alignment=TA_RIGHT)
        s_cellb   = ParagraphStyle('cellb', fontSize=8, leading=10, alignment=TA_RIGHT, fontName='Helvetica-Bold')
        s_th      = ParagraphStyle('th', fontSize=6, leading=8, textColor=colors.Color(0.4, 0.4, 0.4))
        s_thr     = ParagraphStyle('thr', fontSize=6, leading=8, alignment=TA_RIGHT, textColor=colors.Color(0.4, 0.4, 0.4))
        s_sum_l   = ParagraphStyle('sum_l', fontSize=8, leading=11, textColor=colors.Color(0.27, 0.27, 0.27))
        s_sum_r   = ParagraphStyle('sum_r', fontSize=8, leading=11, alignment=TA_RIGHT, textColor=colors.Color(0.27, 0.27, 0.27))
        s_total_l = ParagraphStyle('total_l', fontSize=12, leading=14, fontName='Helvetica-Bold')
        s_total_r = ParagraphStyle('total_r', fontSize=13, leading=15, alignment=TA_RIGHT, fontName='Helvetica-Bold')
        s_thanks  = ParagraphStyle('thanks', fontSize=9, leading=12, alignment=TA_CENTER, fontName='Helvetica-Bold')
        s_footer  = ParagraphStyle('footer', fontSize=7, leading=9, alignment=TA_CENTER, textColor=colors.Color(0.4, 0.4, 0.4))
        s_print   = ParagraphStyle('print', fontSize=6, leading=8, alignment=TA_CENTER, textColor=colors.Color(0.66, 0.66, 0.66))

        story: list = []

        # ── Encabezado empresa ────────────────────────────────────────────────
        story.append(Paragraph(empresa.nombre, s_empresa))
        if empresa.rfc:
            story.append(Paragraph(f'RFC: {empresa.rfc}', s_meta))
        if empresa.razon_social and empresa.razon_social != empresa.nombre:
            story.append(Paragraph(empresa.razon_social, s_meta))
        if empresa.telefono:
            story.append(Paragraph(f'Tel: {empresa.telefono}', s_meta))
        if empresa.email:
            story.append(Paragraph(empresa.email, s_meta))
        if empresa.direccion:
            story.append(Paragraph(empresa.direccion.replace('\n', ' '), s_meta))

        story.append(HRFlowable(width='100%', thickness=1, color=colors.black, spaceBefore=5, spaceAfter=4))

        # ── Folio ─────────────────────────────────────────────────────────────
        story.append(Paragraph(f'# {venta.folio}', s_folio))
        story.append(HRFlowable(width='100%', thickness=0.5, color=colors.Color(0.6, 0.6, 0.6),
                                spaceBefore=4, spaceAfter=4, dash=(2, 2)))

        # ── Info de la venta ──────────────────────────────────────────────────
        fecha = timezone.localtime(venta.fecha_venta).strftime('%d/%m/%Y %H:%M')
        vendedor = f'{venta.vendedor.nombre} {venta.vendedor.apellido_paterno}'.strip()

        info_rows = [
            ('Fecha', fecha),
            ('Cajero', vendedor),
            ('Sucursal', venta.sucursal.nombre),
        ]
        if venta.cliente:
            info_rows.append(('Cliente', venta.cliente.nombre_comercial))
        if venta.metodo_pago:
            info_rows.append(('Pago', _METODO_LABEL.get(venta.metodo_pago, venta.metodo_pago)))

        info_data = [
            [Paragraph(label, s_label), Paragraph(str(value), s_value)]
            for label, value in info_rows
        ]
        t_info = Table(info_data, colWidths=[_CONTENT_WIDTH * 0.4, _CONTENT_WIDTH * 0.6])
        t_info.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(t_info)
        story.append(HRFlowable(width='100%', thickness=0.5, color=colors.Color(0.6, 0.6, 0.6),
                                spaceBefore=4, spaceAfter=2, dash=(2, 2)))

        # ── Tabla de productos ────────────────────────────────────────────────
        prod_data = [[
            Paragraph('Producto', s_th),
            Paragraph('Cant', s_thr),
            Paragraph('P.U.', s_thr),
            Paragraph('Total', s_thr),
        ]]
        for d in detalles:
            nombre = getattr(d.producto, 'nombre', '') or ''
            sku = getattr(d.producto, 'sku', '') or ''
            prod_cell = [Paragraph(nombre, s_prod)]
            if sku:
                prod_cell.append(Paragraph(sku, s_sku))
            prod_data.append([
                prod_cell,
                Paragraph(_qty(d.cantidad), s_cellb),
                Paragraph(_mxn(d.precio_unitario), s_cell),
                Paragraph(_mxn(d.total), s_cellb),
            ])

        t_prod = Table(
            prod_data,
            colWidths=[
                _CONTENT_WIDTH * 0.46,
                _CONTENT_WIDTH * 0.14,
                _CONTENT_WIDTH * 0.20,
                _CONTENT_WIDTH * 0.20,
            ],
        )
        t_prod.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.Color(0.8, 0.8, 0.8)),
            ('LINEBELOW', (0, 1), (-1, -1), 0.3, colors.Color(0.88, 0.88, 0.88)),
        ]))
        story.append(t_prod)
        story.append(HRFlowable(width='100%', thickness=0.5, color=colors.Color(0.6, 0.6, 0.6),
                                spaceBefore=4, spaceAfter=4, dash=(2, 2)))

        # ── Totales ───────────────────────────────────────────────────────────
        sum_rows = [
            [Paragraph('Subtotal', s_sum_l), Paragraph(_mxn(venta.subtotal), s_sum_r)],
        ]
        if Decimal(str(venta.descuento or 0)) > 0:
            sum_rows.append([
                Paragraph('Descuento', s_sum_l),
                Paragraph(f'- {_mxn(venta.descuento)}', s_sum_r),
            ])
        sum_rows.append([Paragraph('IVA', s_sum_l), Paragraph(_mxn(venta.impuestos), s_sum_r)])

        t_sum = Table(sum_rows, colWidths=[_CONTENT_WIDTH * 0.5, _CONTENT_WIDTH * 0.5])
        t_sum.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(t_sum)

        t_total = Table(
            [[Paragraph('TOTAL', s_total_l), Paragraph(_mxn(venta.total), s_total_r)]],
            colWidths=[_CONTENT_WIDTH * 0.5, _CONTENT_WIDTH * 0.5],
        )
        t_total.setStyle(TableStyle([
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('LINEABOVE', (0, 0), (-1, 0), 1.2, colors.black),
        ]))
        story.append(t_total)

        story.append(HRFlowable(width='100%', thickness=1, color=colors.black, spaceBefore=5, spaceAfter=5))

        # ── Pie ───────────────────────────────────────────────────────────────
        story.append(Paragraph('¡Gracias por su compra!', s_thanks))
        footer_msg = (
            'Este documento NO es un comprobante fiscal'
            if empresa.tipo_negocio == 'informal'
            else 'Solicite su factura CFDI al vendedor'
        )
        story.append(Paragraph(footer_msg, s_footer))
        ahora = timezone.localtime().strftime('%d/%m/%Y %H:%M')
        story.append(Spacer(1, 3))
        story.append(Paragraph(f'Generado: {ahora} · PyCore ERP', s_print))

        doc.build(story)
        return buf.getvalue()
