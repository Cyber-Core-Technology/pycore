import type { Venta } from '@/types/sales.types'
import type { Empresa } from '@/types/auth.types'

const METODO_LABEL: Record<string, string> = {
  efectivo:        'Efectivo',
  tarjeta_debito:  'Tarjeta de débito',
  tarjeta_credito: 'Tarjeta de crédito',
  transferencia:   'Transferencia bancaria',
  cheque:          'Cheque',
  credito:         'Crédito',
  otro:            'Otro',
}

function formatMXN(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

/** Formatea una cantidad eliminando ceros decimales innecesarios */
export function formatQty(n: number | string): string {
  const num = parseFloat(String(n))
  return num.toLocaleString('es-MX', { maximumFractionDigits: 3 })
}

export function buildTicketHTML(venta: Venta, empresa: Empresa, clienteNombre?: string): string {
  const fecha = new Date(venta.fecha_venta).toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const ahora = new Date().toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const subtotal  = parseFloat(venta.subtotal)
  const descuento = parseFloat(venta.descuento)
  const impuestos = parseFloat(venta.impuestos)
  const total     = parseFloat(venta.total)

  const detalles = venta.detalles ?? []

  const filas = detalles.map((d) => {
    const skuHtml = d.sku_producto
      ? `<div class="dim small">${d.sku_producto}</div>`
      : ''
    const descHtml = Number(d.descuento) > 0
      ? `<span class="badge-desc">-${d.descuento}%</span>`
      : ''
    const precioUnitHtml = Number(d.descuento) > 0
      ? `<div class="price-original">${formatMXN(Number(d.precio_unitario))}</div><div>${descHtml}</div>`
      : `<div>${formatMXN(Number(d.precio_unitario))}</div>`

    return `
      <tr>
        <td>
          <div class="prod-name">${d.nombre_producto}</div>
          ${skuHtml}
        </td>
        <td class="right qty">${formatQty(d.cantidad)}</td>
        <td class="right">${precioUnitHtml}</td>
        <td class="right bold total-col">${formatMXN(Number(d.total))}</td>
      </tr>`
  }).join('')

  const rfcHtml          = empresa.rfc ? `<div class="meta">RFC: ${empresa.rfc}</div>` : ''
  const razonSocialHtml  = empresa.razon_social && empresa.razon_social !== empresa.nombre
    ? `<div class="meta">${empresa.razon_social}</div>` : ''
  const telefonoHtml     = empresa.telefono ? `<div class="meta">Tel: ${empresa.telefono}</div>` : ''
  const emailHtml        = empresa.email ? `<div class="meta">${empresa.email}</div>` : ''
  const direccionHtml    = empresa.direccion ? `<div class="meta addr">${empresa.direccion}</div>` : ''

  const clienteHtml   = clienteNombre
    ? `<div class="info-row"><span>Cliente</span><span>${clienteNombre}</span></div>` : ''
  const metodoPagoHtml = venta.metodo_pago
    ? `<div class="info-row"><span>Pago</span><span class="bold">${METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago}</span></div>` : ''
  const descuentoHtml  = descuento > 0
    ? `<div class="sum-row"><span>Descuento</span><span class="neg">- ${formatMXN(descuento)}</span></div>` : ''

  const footerMsg = empresa.tipo_negocio === 'informal'
    ? 'Este documento <strong>NO</strong> es un comprobante fiscal'
    : 'Solicite su factura CFDI al vendedor'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${venta.folio}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #111;
      background: #fff;
      width: 80mm;
      max-width: 80mm;
      padding: 8mm 6mm;
    }
    @media print {
      @page { margin: 0; size: 80mm auto; }
      body { padding: 3mm; }
      .no-print { display: none !important; }
    }

    /* Header empresa */
    .header { text-align: center; margin-bottom: 8px; }
    .empresa-name { font-size: 16px; font-weight: bold; letter-spacing: 0.04em; margin-bottom: 3px; }
    .meta { font-size: 10px; color: #555; line-height: 1.5; }
    .addr { margin-top: 2px; }

    /* Divisores */
    .divider { border: none; border-top: 1px dashed #999; margin: 7px 0; }
    .divider-solid { border: none; border-top: 1px solid #111; margin: 6px 0; }

    /* Badge folio */
    .folio-badge {
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      letter-spacing: 0.08em;
      margin: 5px 0;
    }

    /* Info rows (cajero, sucursal, etc.) */
    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      margin: 3px 0;
    }
    .info-row span:first-child { color: #666; }

    /* Tabla productos */
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    thead tr th {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
      padding: 3px 0;
      border-bottom: 1px solid #ccc;
    }
    th.right, td.right { text-align: right; }
    td {
      padding: 5px 2px 5px 0;
      vertical-align: top;
      font-size: 11px;
      border-bottom: 1px dashed #e0e0e0;
    }
    td:last-child { padding-right: 0; }
    .prod-name { font-weight: 600; font-size: 11px; line-height: 1.3; }
    .small { font-size: 9px; color: #888; margin-top: 1px; }
    .qty { font-weight: bold; white-space: nowrap; padding: 5px 4px; }
    .total-col { white-space: nowrap; font-weight: bold; }
    .price-original { font-size: 10px; }
    .badge-desc {
      display: inline-block;
      font-size: 9px;
      background: #fee;
      color: #c00;
      padding: 0 3px;
      border-radius: 3px;
    }

    /* Totales */
    .sum-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin: 2px 0;
      color: #444;
    }
    .sum-row .neg { color: #c00; }
    .grand-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      font-size: 16px;
      font-weight: bold;
      margin-top: 5px;
      padding-top: 5px;
      border-top: 2px solid #111;
    }
    .grand-row .amount { font-size: 18px; }

    /* Footer */
    .footer {
      text-align: center;
      font-size: 10px;
      color: #666;
      line-height: 1.6;
      margin-top: 2px;
    }
    .footer .thanks {
      font-size: 12px;
      font-weight: bold;
      color: #111;
      margin: 4px 0 2px;
    }
    .bold { font-weight: bold; }
    .dim  { color: #666; }
  </style>
</head>
<body>

  <!-- Empresa -->
  <div class="header">
    <div class="empresa-name">${empresa.nombre}</div>
    ${rfcHtml}
    ${razonSocialHtml}
    ${telefonoHtml}
    ${emailHtml}
    ${direccionHtml}
  </div>

  <hr class="divider-solid">

  <!-- Folio -->
  <div class="folio-badge"># ${venta.folio}</div>

  <hr class="divider">

  <!-- Info venta -->
  <div class="info-row"><span>Fecha</span><span>${fecha}</span></div>
  <div class="info-row"><span>Cajero</span><span>${venta.nombre_vendedor}</span></div>
  <div class="info-row"><span>Sucursal</span><span>${venta.nombre_sucursal}</span></div>
  ${clienteHtml}
  ${metodoPagoHtml}

  <hr class="divider">

  <!-- Productos -->
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Producto</th>
        <th class="right">Cant</th>
        <th class="right">P.U.</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
    </tbody>
  </table>

  <hr class="divider">

  <!-- Totales -->
  <div class="sum-row"><span>Subtotal</span><span>${formatMXN(subtotal)}</span></div>
  ${descuentoHtml}
  <div class="sum-row"><span>IVA (16%)</span><span>${formatMXN(impuestos)}</span></div>
  <div class="grand-row">
    <span>TOTAL</span>
    <span class="amount">${formatMXN(total)}</span>
  </div>

  <hr class="divider-solid">

  <!-- Footer -->
  <div class="footer">
    <div class="thanks">¡Gracias por su compra!</div>
    <div>${footerMsg}</div>
    <div style="margin-top:4px; color:#aaa; font-size:9px">Impreso: ${ahora} · PyCore ERP</div>
  </div>

</body>
</html>`
}

/** Abre el ticket en una nueva ventana y lanza el diálogo de impresión */
export function printTicket(venta: Venta, empresa: Empresa, clienteNombre?: string): void {
  const win = window.open('', '_blank', 'width=420,height=720,scrollbars=yes')
  if (!win) {
    alert('Permite los popups para imprimir el ticket')
    return
  }
  win.document.write(buildTicketHTML(venta, empresa, clienteNombre))
  win.document.close()
  setTimeout(() => win.print(), 400)
}
