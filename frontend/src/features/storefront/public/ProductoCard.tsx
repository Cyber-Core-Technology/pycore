// frontend/src/features/storefront/public/ProductoCard.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, ShoppingCart, Check } from 'lucide-react'
import { useStorefrontCart } from '@/store/storefrontCartStore'
import { mediaUrl } from '@/api/axios-config'
import type { ProductoPublico, StorefrontConfig } from '@/types/storefront.types'

function formatPrecio(precio: string | null): string {
  if (!precio) return ''
  const n = parseFloat(precio)
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: '#FEE2E2', color: '#DC2626', fontSize: 10, fontWeight: 700 }}>
        Agotado
      </span>
    )
  }
  if (stock <= 5) {
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: '#FEF3C7', color: '#D97706', fontSize: 10, fontWeight: 700 }}>
        Últimas {stock}
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, background: '#DCFCE7', color: '#16A34A', fontSize: 10, fontWeight: 700 }}>
      Disponible
    </span>
  )
}

interface Props {
  producto: ProductoPublico
  config:   StorefrontConfig
  slug:     string
}

export function ProductoCard({ producto, config, slug }: Props) {
  const agotado   = producto.stock_disponible === 0
  const addItem   = useStorefrontCart((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const navigate  = useNavigate()

  const detalleActivo = config.pagina_detalle_activa && !!producto.slug

  const handleAgregar = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (agotado) return
    addItem(slug, {
      id:           producto.id,
      nombre:       producto.nombre,
      precio_venta: producto.precio_venta ?? '0',
      imagen_url:   producto.imagen_url ?? '',
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const handleCardClick = () => {
    if (detalleActivo) {
      navigate(`/p/${slug}/producto/${producto.slug}`)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      style={{
        borderRadius: 12, background: 'white',
        border: '1px solid #F3F4F6',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.2s, transform 0.2s',
        opacity: agotado ? 0.65 : 1,
        cursor: detalleActivo ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (!agotado) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
        }
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      }}
    >
      {/* Imagen */}
      <div style={{ aspectRatio: '1', background: '#F9FAFB', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {producto.imagen_url ? (
          <img src={mediaUrl(producto.imagen_url)} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Package size={36} style={{ color: '#D1D5DB' }} />
        )}
        {agotado && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.7)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', letterSpacing: '0.1em' }}>AGOTADO</span>
          </div>
        )}
        {detalleActivo && !agotado && (
          <div style={{
            position: 'absolute', bottom: 6, right: 6,
            background: config.color_secundario, color: 'white', borderRadius: 6,
            fontSize: 9, fontWeight: 700, padding: '3px 7px', letterSpacing: '0.05em',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
          }}>
            VER DETALLE
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {producto.categoria_nombre && (
          <p style={{ fontSize: 10, color: config.color_secundario, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, opacity: 0.85 }}>
            {producto.categoria_nombre}
          </p>
        )}
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {producto.nombre}
        </p>
        {producto.descripcion && (
          <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {producto.descripcion}
          </p>
        )}
        {producto.stock_disponible !== null && <StockBadge stock={producto.stock_disponible} />}

        <div style={{ flex: 1 }} />

        {/* Precio + botón agregar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          {producto.precio_venta ? (
            <p style={{ fontSize: 16, fontWeight: 800, color: config.color_primario }}>
              {formatPrecio(producto.precio_venta)}
            </p>
          ) : (
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>Consultar precio</p>
          )}

          {!agotado && (
            <button
              onClick={handleAgregar}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: added ? config.color_secundario : config.color_primario,
                color: 'white', transition: 'background 0.2s',
              }}
              title="Agregar al carrito"
            >
              {added ? <Check size={12} /> : <ShoppingCart size={12} />}
              {added ? '¡Agregado!' : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
