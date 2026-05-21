// frontend/src/features/storefront/public/CartDrawer.tsx
import { X, Trash2, ShoppingBag, Lock } from 'lucide-react'
import { useStorefrontCart } from '@/store/storefrontCartStore'
import { useStorefrontAuth } from '@/store/storefrontAuthStore'
import type { StorefrontConfig } from '@/types/storefront.types'

interface Props {
  slug:        string
  config:      StorefrontConfig
  isOpen:      boolean
  onClose:     () => void
  onCheckout:  () => void
  onNeedAuth:  () => void
}

export function CartDrawer({ slug, config, isOpen, onClose, onCheckout, onNeedAuth }: Props) {
  const cart          = useStorefrontCart((s) => s.getCart(slug))
  const updateQty     = useStorefrontCart((s) => s.updateQty)
  const removeItem    = useStorefrontCart((s) => s.removeItem)
  const total         = useStorefrontCart((s) => s.getTotal(slug))
  const isAuth        = useStorefrontAuth((s) => s.isAuthenticated(slug))

  if (!isOpen) return null

  const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 })

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 900 }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '100%', maxWidth: 360,
        background: 'white', zIndex: 901,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShoppingBag size={18} color={config.color_primario} />
            <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
              Mi carrito
            </span>
            {cart.length > 0 && (
              <span style={{
                background: config.color_primario, color: 'white',
                borderRadius: '50%', width: 20, height: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>
                {cart.reduce((a, i) => a + i.cantidad, 0)}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <X size={18} />
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 60 }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>🛒</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>Carrito vacío</p>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>Agrega productos para comenzar</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cart.map((item) => (
                <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                  {/* Imagen */}
                  <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#F3F4F6' }}>
                    {item.imagen_url
                      ? <img src={item.imagen_url} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📦</div>}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.nombre}
                    </p>
                    <p style={{ fontSize: 12, color: config.color_primario, fontWeight: 600 }}>
                      ${parseFloat(item.precio_venta || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  {/* Qty stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => updateQty(slug, item.id, item.cantidad - 1)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >−</button>
                    <span style={{ fontSize: 13, fontWeight: 600, minWidth: 16, textAlign: 'center' }}>{item.cantidad}</span>
                    <button
                      onClick={() => updateQty(slug, item.id, item.cantidad + 1)}
                      style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >+</button>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeItem(slug, item.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, flexShrink: 0 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 14, color: '#6B7280' }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>
                ${fmt(total)}
              </span>
            </div>

            {isAuth ? (
              <button
                onClick={onCheckout}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                  background: config.color_primario, color: 'white',
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}
              >
                Realizar pedido →
              </button>
            ) : (
              <button
                onClick={onNeedAuth}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                  background: '#111827', color: 'white',
                  fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Lock size={15} />
                Inicia sesión para pedir
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
