// frontend/src/features/storefront/public/CheckoutModal.tsx
import { useState } from 'react'
import { X, Banknote, ChevronLeft, Smartphone } from 'lucide-react'
import { useStorefrontCart } from '@/store/storefrontCartStore'
import { storeCustomerApi } from '@/api/store-customer-api'
import { PedidoTicket } from './PedidoTicket'
import type { StorefrontConfig } from '@/types/storefront.types'
import type { Pedido, MetodoPago } from '@/types/store-customer.types'

interface Props {
  slug:    string
  config:  StorefrontConfig
  onClose: () => void
}

type Step = 'metodo' | 'confirmacion' | 'ticket'

export function CheckoutModal({ slug, config, onClose }: Props) {
  const [step,        setStep]        = useState<Step>('metodo')
  const [metodo,      setMetodo]      = useState<MetodoPago>('efectivo_en_tienda')
  const [notas,       setNotas]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [pedido,      setPedido]      = useState<Pedido | null>(null)

  const cart      = useStorefrontCart((s) => s.getCart(slug))
  const total     = useStorefrontCart((s) => s.getTotal(slug))
  const clearCart = useStorefrontCart((s) => s.clearCart)

  const fmt = (n: number) => n.toLocaleString('es-MX', { minimumFractionDigits: 2 })

  const handleConfirmar = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await storeCustomerApi.crearPedido(slug, {
        metodo_pago:   metodo,
        notas_cliente: notas,
        detalles: cart.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
      })
      clearCart(slug)
      // Mercado Pago: redirect to checkout URL
      if (metodo === 'mercado_pago' && result.mp_checkout_url) {
        window.location.href = result.mp_checkout_url
        return
      }
      setPedido(result)
      setStep('ticket')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Error al procesar el pedido.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, overflowY: 'auto',
    }}>
      <div style={{
        background: 'white', borderRadius: 16,
        width: '100%', maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        {/* Ticket final */}
        {step === 'ticket' && pedido ? (
          <div style={{ padding: 20 }}>
            <PedidoTicket pedido={pedido} nombreTienda={config.nombre_tienda} onClose={onClose} />
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {step === 'confirmacion' && (
                  <button onClick={() => setStep('metodo')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 0, marginRight: 4 }}>
                    <ChevronLeft size={18} />
                  </button>
                )}
                <p style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>
                  {step === 'metodo' ? 'Forma de pago' : 'Confirmar pedido'}
                </p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FEF2F2', color: 'var(--color-error)', fontSize: 13, marginBottom: 16 }}>
                  {error}
                </div>
              )}

              {/* Paso 1: elegir método */}
              {step === 'metodo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Opción efectivo */}
                  {(['efectivo_en_tienda', ...(config.acepta_mp ? ['mercado_pago'] : [])] as MetodoPago[]).map((m) => {
                    const isEfectivo = m === 'efectivo_en_tienda'
                    const selected   = metodo === m
                    return (
                      <button
                        key={m}
                        onClick={() => setMetodo(m)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 14,
                          padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                          border: `2px solid ${selected ? config.color_primario : '#E5E7EB'}`,
                          background: selected ? `${config.color_primario}08` : 'white',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                          background: selected ? config.color_primario : '#F3F4F6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: selected ? 'white' : '#9CA3AF',
                        }}>
                          {isEfectivo ? <Banknote size={20} /> : <Smartphone size={20} />}
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
                            {isEfectivo ? 'Efectivo en tienda' : 'Mercado Pago'}
                          </p>
                          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 1.4 }}>
                            {isEfectivo
                              ? 'Aparta tu pedido ahora y paga cuando lo recojas en el local.'
                              : 'Paga en línea de forma segura con Mercado Pago (tarjeta, transferencia, etc.).'}
                          </p>
                        </div>
                      </button>
                    )
                  })}

                  <button
                    onClick={() => setStep('confirmacion')}
                    style={{
                      marginTop: 8, padding: '12px 0', borderRadius: 10, border: 'none',
                      background: config.color_primario, color: 'white',
                      fontWeight: 700, fontSize: 14, cursor: 'pointer',
                    }}
                  >
                    Continuar →
                  </button>
                </div>
              )}

              {/* Paso 2: confirmar */}
              {step === 'confirmacion' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Resumen de items */}
                  <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 14px' }}>
                    {cart.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 6 }}>
                        <span>{item.nombre} <span style={{ color: '#9CA3AF' }}>×{item.cantidad}</span></span>
                        <span style={{ fontWeight: 600 }}>
                          ${fmt(parseFloat(item.precio_venta || '0') * item.cantidad)}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, borderTop: '1px solid #E5E7EB', paddingTop: 8, marginTop: 6 }}>
                      <span>Total</span>
                      <span style={{ color: config.color_primario }}>${fmt(total)}</span>
                    </div>
                  </div>

                  {/* Pago seleccionado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151' }}>
                    {metodo === 'efectivo_en_tienda' ? <Banknote size={15} /> : <Smartphone size={15} />}
                    <span>{metodo === 'efectivo_en_tienda' ? 'Efectivo en tienda' : 'Mercado Pago'}</span>
                  </div>

                  {/* Notas */}
                  <textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Notas adicionales (opcional)..."
                    rows={2}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
                      border: '1px solid #E5E7EB', resize: 'none', outline: 'none', color: '#374151',
                    }}
                  />

                  {/* Nota informativa para Mercado Pago */}
                  {metodo === 'mercado_pago' && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 12, color: '#1D4ED8' }}>
                      📲 Serás redirigido a Mercado Pago para completar tu pago de forma segura.
                    </div>
                  )}

                  <button
                    onClick={handleConfirmar}
                    disabled={loading}
                    style={{
                      padding: '13px 0', borderRadius: 10, border: 'none',
                      background: config.color_primario, color: 'white',
                      fontWeight: 700, fontSize: 14,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? 'Procesando...' : metodo === 'mercado_pago' ? 'Pagar con Mercado Pago' : 'Confirmar pedido'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
