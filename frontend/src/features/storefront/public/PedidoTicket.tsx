// frontend/src/features/storefront/public/PedidoTicket.tsx
import { QRCodeSVG } from 'qrcode.react'
import type { Pedido } from '@/types/store-customer.types'

const ESTADO_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:   { label: 'Pendiente de pago',  color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.1)' },
  apartado:    { label: 'Apartado',            color: 'var(--color-info)', bg: 'rgba(59,130,246,0.1)' },
  pagado:      { label: 'Pagado',              color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  en_proceso:  { label: 'En proceso',          color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  listo:       { label: 'Listo para recoger',  color: '#1BAE91', bg: 'rgba(27,174,145,0.1)' },
  entregado:   { label: 'Entregado',           color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  cancelado:   { label: 'Cancelado',           color: 'var(--color-error)', bg: 'var(--color-error-bg)' },
}

interface Props {
  pedido:      Pedido
  nombreTienda: string
  onClose?:    () => void
}

export function PedidoTicket({ pedido, nombreTienda, onClose }: Props) {
  const est    = ESTADO_LABEL[pedido.estado] ?? ESTADO_LABEL['pendiente']
  const esCash = pedido.metodo_pago === 'efectivo_en_tienda'
  const fecha  = new Date(pedido.created_at).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 24, maxWidth: 420,
      width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 28 }}>{esCash ? '🧾' : '📲'}</p>
        <h2 style={{ fontWeight: 800, fontSize: 20, color: '#111827', margin: '4px 0' }}>
          {esCash ? '¡Pedido apartado!' : '¡Pedido recibido!'}
        </h2>
        <p style={{ fontSize: 13, color: '#6B7280' }}>{nombreTienda}</p>
      </div>

      {/* Número de pedido */}
      <div style={{
        background: '#F9FAFB', borderRadius: 12, padding: '14px 16px',
        textAlign: 'center', marginBottom: 16,
        border: '1px solid #E5E7EB',
      }}>
        <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>
          Número de pedido
        </p>
        <p style={{ fontWeight: 800, fontSize: 26, color: '#111827', letterSpacing: 2 }}>
          {pedido.numero_pedido}
        </p>
        <span style={{
          display: 'inline-block', padding: '3px 12px', borderRadius: 20,
          fontSize: 12, fontWeight: 600,
          color: est.color, background: est.bg,
          marginTop: 6,
        }}>
          {est.label}
        </span>
      </div>

      {/* QR */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ padding: 12, background: 'white', border: '1px solid #E5E7EB', borderRadius: 12 }}>
          <QRCodeSVG
            value={pedido.ticket_uuid}
            size={120}
            level="M"
            bgColor="white"
            fgColor="#111827"
          />
        </div>
      </div>

      {/* Detalles del pedido */}
      <div style={{ borderTop: '1px dashed #E5E7EB', paddingTop: 14, marginBottom: 14 }}>
        {pedido.detalles.map((d) => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 6 }}>
            <span>{d.nombre_snapshot} <span style={{ color: '#9CA3AF' }}>×{d.cantidad}</span></span>
            <span style={{ fontWeight: 600 }}>
              ${parseFloat(d.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#111827', borderTop: '1px dashed #E5E7EB', paddingTop: 10, marginTop: 6 }}>
          <span>Total</span>
          <span>${parseFloat(pedido.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Método de pago */}
      <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
        <p>
          Pago:{' '}
          <strong style={{ color: '#374151' }}>
            {esCash ? 'Efectivo en tienda' : 'Mercado Pago'}
          </strong>
        </p>
        <p style={{ marginTop: 4 }}>{fecha}</p>
      </div>

      {/* Instrucción */}
      {esCash && (
        <div style={{
          background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 10, padding: '12px 14px', textAlign: 'center',
          fontSize: 13, color: '#1D4ED8', marginBottom: 16,
        }}>
          📍 Presenta este código en el local para recoger tu pedido y pagar.
        </div>
      )}

      {onClose && (
        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 10,
            border: 'none', background: '#1BAE91', color: 'white',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          Cerrar
        </button>
      )}
    </div>
  )
}
