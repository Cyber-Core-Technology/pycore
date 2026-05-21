// frontend/src/features/storefront/public/ProductoDetailPage.tsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { storefrontApi } from '@/api/storefront-api'
import { mediaUrl } from '@/api/axios-config'
import { useStorefrontCart } from '@/store/storefrontCartStore'
import { useStorefrontAuth } from '@/store/storefrontAuthStore'
import { CartButton } from './CartButton'
import { CartDrawer } from './CartDrawer'
import { CustomerAuthModal } from './CustomerAuthModal'
import { CheckoutModal } from './CheckoutModal'
import type { StorefrontConfig, ProductoPublico } from '@/types/storefront.types'
import {
  ArrowLeft, Package, ShoppingCart, Check, Share2,
  MessageCircle, Link2, ChevronLeft, ChevronRight,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPrecio(precio: string | null): string {
  if (!precio) return ''
  const n = parseFloat(precio)
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return (
    <span style={{ padding: '4px 12px', borderRadius: 20, background: '#FEE2E2', color: '#DC2626', fontSize: 12, fontWeight: 700 }}>
      Agotado
    </span>
  )
  if (stock <= 5) return (
    <span style={{ padding: '4px 12px', borderRadius: 20, background: '#FEF3C7', color: '#D97706', fontSize: 12, fontWeight: 700 }}>
      Últimas {stock} unidades
    </span>
  )
  return (
    <span style={{ padding: '4px 12px', borderRadius: 20, background: '#DCFCE7', color: '#16A34A', fontSize: 12, fontWeight: 700 }}>
      En existencia
    </span>
  )
}

// ── Galería de imágenes ───────────────────────────────────────────────────────

function ImageGallery({ imagenPrincipal, galeria, nombre, color }: {
  imagenPrincipal: string
  galeria: string[]
  nombre: string
  color: string
}) {
  const allImages = [imagenPrincipal, ...galeria].filter(Boolean)
  const [active, setActive] = useState(0)

  const prev = () => setActive((i) => (i - 1 + allImages.length) % allImages.length)
  const next = () => setActive((i) => (i + 1) % allImages.length)

  if (allImages.length === 0) {
    return (
      <div style={{ aspectRatio: '1', background: '#F9FAFB', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Package size={64} style={{ color: '#D1D5DB' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Imagen principal */}
      <div style={{ position: 'relative', aspectRatio: '1', borderRadius: 16, overflow: 'hidden', background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
        <img
          src={mediaUrl(allImages[active])}
          alt={nombre}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {allImages.length > 1 && (
          <>
            <button
              onClick={prev}
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}
            >
              <ChevronRight size={18} />
            </button>
            <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
              {allImages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  style={{ width: i === active ? 18 : 7, height: 7, borderRadius: 4, border: 'none', background: i === active ? color : 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 0, transition: 'width 0.2s' }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {allImages.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                flexShrink: 0, width: 64, height: 64, borderRadius: 8, overflow: 'hidden', padding: 0, cursor: 'pointer',
                border: `2px solid ${i === active ? color : '#E5E7EB'}`,
                transition: 'border-color 0.15s',
              }}
            >
              <img src={mediaUrl(img)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Ficha técnica ─────────────────────────────────────────────────────────────

function FichaTecnica({ ficha }: { ficha: { clave: string; valor: string }[] }) {
  if (!ficha || ficha.length === 0) return null
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Ficha técnica</h3>
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        {ficha.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'grid', gridTemplateColumns: '40% 1fr',
              background: i % 2 === 0 ? '#F9FAFB' : 'white',
              borderBottom: i < ficha.length - 1 ? '1px solid #E5E7EB' : 'none',
            }}
          >
            <div style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#374151', borderRight: '1px solid #E5E7EB' }}>
              {item.clave}
            </div>
            <div style={{ padding: '10px 14px', fontSize: 13, color: '#6B7280' }}>
              {item.valor}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Botón compartir ───────────────────────────────────────────────────────────

function ShareButtons({ nombre, color }: { nombre: string; color: string }) {
  const [copied, setCopied] = useState(false)
  const url = window.location.href

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareWA = () => {
    const text = encodeURIComponent(`${nombre}\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
      <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>Compartir:</span>
      <button
        onClick={shareWA}
        title="Compartir en WhatsApp"
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', fontSize: 12, fontWeight: 600, color: '#25D366', cursor: 'pointer' }}
      >
        <MessageCircle size={13} />
        WhatsApp
      </button>
      <button
        onClick={copyLink}
        title="Copiar enlace"
        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', fontSize: 12, fontWeight: 600, color: copied ? '#10B981' : '#6B7280', cursor: 'pointer' }}
      >
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {copied ? '¡Copiado!' : 'Copiar enlace'}
      </button>
    </div>
  )
}

// ── Card relacionado (mini) ───────────────────────────────────────────────────

function RelacionadoCard({ producto, slug, color }: { producto: ProductoPublico; slug: string; color: string }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/p/${slug}/producto/${producto.slug}`)}
      style={{ borderRadius: 10, background: 'white', border: '1px solid #F3F4F6', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s, transform 0.2s', flexShrink: 0, width: 150 }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
    >
      <div style={{ aspectRatio: '1', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {producto.imagen_url
          ? <img src={mediaUrl(producto.imagen_url)} alt={producto.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Package size={28} style={{ color: '#D1D5DB' }} />
        }
      </div>
      <div style={{ padding: '8px 10px' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {producto.nombre}
        </p>
        {producto.precio_venta && (
          <p style={{ fontSize: 13, fontWeight: 800, color, marginTop: 4 }}>
            {formatPrecio(producto.precio_venta)}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 50%,#e5e7eb 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export function ProductoDetailPage() {
  const { slug = '', productoSlug = '' } = useParams<{ slug: string; productoSlug: string }>()
  const navigate = useNavigate()

  // Cargar config de la tienda
  const { data: config, isLoading: configLoading, isError: configError } = useQuery<StorefrontConfig>({
    queryKey: ['store', slug],
    queryFn:  () => storefrontApi.publicGetTienda(slug),
    retry: false,
    staleTime: 60_000,
  })

  // Cargar detalle del producto
  const { data: producto, isLoading: prodLoading, isError: prodError } = useQuery({
    queryKey: ['store-producto-detalle', slug, productoSlug],
    queryFn:  () => storefrontApi.publicGetProductoDetalle(slug, productoSlug),
    enabled:  !!config,
    retry: false,
    staleTime: 30_000,
  })

  // Cart / auth / checkout state
  const [cartOpen,       setCartOpen]       = useState(false)
  const [authOpen,       setAuthOpen]       = useState(false)
  const [checkoutOpen,   setCheckoutOpen]   = useState(false)
  const [authForCheckout, setAuthForCheckout] = useState(false)
  const [added, setAdded] = useState(false)

  const addItem   = useStorefrontCart((s) => s.addItem)
  const isAuth    = useStorefrontAuth((s) => s.isAuthenticated(slug))

  // Inyectar tema de colores
  useEffect(() => {
    if (!config) return
    const style = document.createElement('style')
    style.id = 'storefront-theme'
    style.textContent = `
      :root { --brand: ${config.color_primario}; --brand-dark: ${config.color_secundario}; }
      @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    `
    document.head.appendChild(style)
    return () => { style.remove() }
  }, [config])

  // Open Graph meta tags dinámicos por producto
  useEffect(() => {
    if (!producto || !config) return

    const title = `${producto.nombre} — ${config.nombre_tienda}`
    document.title = title

    const setMeta = (prop: string, content: string, attr = 'property') => {
      let el = document.querySelector(`meta[${attr}="${prop}"]`) as HTMLMetaElement | null
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, prop); document.head.appendChild(el) }
      el.content = content
    }

    const description = producto.descripcion_larga || producto.descripcion || config.meta_descripcion
    const image = producto.imagen_url
      ? (producto.imagen_url.startsWith('http') ? producto.imagen_url : `${window.location.origin}${producto.imagen_url}`)
      : ''

    setMeta('og:title',       title)
    setMeta('og:description', description)
    setMeta('og:url',         window.location.href)
    setMeta('og:type',        'product')
    if (image) setMeta('og:image', image)
    setMeta('twitter:card',        'summary_large_image', 'name')
    setMeta('twitter:title',       title, 'name')
    setMeta('twitter:description', description, 'name')
    if (image) setMeta('twitter:image', image, 'name')

    return () => {
      document.title = config.nombre_tienda || 'Tienda en línea'
    }
  }, [producto, config])

  const handleAgregar = () => {
    if (!producto || producto.stock_disponible === 0) return
    addItem(slug, {
      id:           producto.id,
      nombre:       producto.nombre,
      precio_venta: producto.precio_venta ?? '0',
      imagen_url:   producto.imagen_url ?? '',
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const handleNeedAuth  = () => { setCartOpen(false); setAuthForCheckout(true); setAuthOpen(true) }
  const handleAuthOk    = () => { setAuthOpen(false); if (authForCheckout) setCheckoutOpen(true); setAuthForCheckout(false) }
  const handleCheckout  = () => { setCartOpen(false); setCheckoutOpen(true) }

  // ── Loading ──
  const isLoading = configLoading || prodLoading
  if (isLoading || !config) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: 24 }}>
        <style>{`
          @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
          .pdp-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:32px;margin-top:24px}
          @media(max-width:640px){.pdp-grid{grid-template-columns:1fr;gap:20px}}
        `}</style>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <Skeleton h={20} w={120} r={6} />
          <div className="pdp-grid">
            <Skeleton h={380} r={16} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Skeleton h={32} r={8} />
              <Skeleton h={20} w="60%" r={6} />
              <Skeleton h={40} r={8} />
              <Skeleton h={20} r={6} />
              <Skeleton h={20} r={6} />
              <Skeleton h={20} w="80%" r={6} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 404 ──
  if (configError || prodError || !producto) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <p style={{ fontSize: 48 }}>📦</p>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Producto no encontrado</h1>
        <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', maxWidth: 320 }}>
          Este producto ya no está disponible o el enlace es incorrecto.
        </p>
        <button
          onClick={() => navigate(`/p/${slug}`)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: config.color_primario, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          <ArrowLeft size={14} />
          Volver a la tienda
        </button>
      </div>
    )
  }

  const agotado = producto.stock_disponible === 0

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', overflowX: 'hidden' }}>
      <style>{`
        .pdp-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:36px;align-items:start}
        .pdp-title{font-size:24px;font-weight:800;color:#111827;line-height:1.25;margin-bottom:12px}
        .pdp-price{font-size:32px;font-weight:900;margin-bottom:12px}
        .pdp-breadcrumb-cat{font-size:12px;opacity:.75}
        .pdp-breadcrumb-product{font-size:12px;opacity:.9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        @media(max-width:640px){
          .pdp-grid{grid-template-columns:1fr;gap:20px}
          .pdp-title{font-size:20px}
          .pdp-price{font-size:26px}
          .pdp-breadcrumb-cat{display:none}
          .pdp-breadcrumb-sep-cat{display:none}
          .pdp-breadcrumb-product{display:none}
          .pdp-main{padding:16px 14px!important}
        }
      `}</style>
      {/* Header mínimo con breadcrumb */}
      <header style={{ background: config.color_primario, color: 'white' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate(`/p/${slug}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '7px 12px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <ArrowLeft size={13} />
            {config.nombre_tienda || 'Tienda'}
          </button>
          <span style={{ fontSize: 12, opacity: 0.6 }}>›</span>
          {producto.categoria_nombre && (
            <>
              <span className="pdp-breadcrumb-cat">{producto.categoria_nombre}</span>
              <span className="pdp-breadcrumb-sep-cat" style={{ fontSize: 12, opacity: 0.6 }}>›</span>
            </>
          )}
          <span className="pdp-breadcrumb-product">
            {producto.nombre}
          </span>
        </div>
      </header>

      <main className="pdp-main" style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px' }}>
        {/* Layout dos columnas en desktop, una en móvil */}
        <div className="pdp-grid">

          {/* Columna izquierda — galería */}
          <ImageGallery
            imagenPrincipal={producto.imagen_url}
            galeria={producto.galeria_imagenes || []}
            nombre={producto.nombre}
            color={config.color_primario}
          />

          {/* Columna derecha — info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Categoría */}
            {producto.categoria_nombre && (
              <p style={{ fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                {producto.categoria_nombre}
              </p>
            )}

            {/* Nombre */}
            <h1 className="pdp-title">
              {producto.nombre}
            </h1>

            {/* Precio */}
            {producto.precio_venta ? (
              <p className="pdp-price" style={{ color: config.color_primario }}>
                {formatPrecio(producto.precio_venta)}
              </p>
            ) : (
              <p style={{ fontSize: 15, color: '#9CA3AF', marginBottom: 12 }}>Consultar precio</p>
            )}

            {/* Stock badge */}
            {producto.stock_disponible !== null && (
              <div style={{ marginBottom: 16 }}>
                <StockBadge stock={producto.stock_disponible} />
              </div>
            )}

            {/* Descripción corta */}
            {producto.descripcion && (
              <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.6, marginBottom: 16 }}>
                {producto.descripcion}
              </p>
            )}

            {/* Unidad de medida */}
            {producto.unidad_medida_nombre && (
              <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>
                Unidad: <strong style={{ color: '#6B7280' }}>{producto.unidad_medida_nombre}</strong>
              </p>
            )}

            {/* Botón agregar al carrito */}
            <button
              onClick={handleAgregar}
              disabled={agotado}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px 20px', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700,
                background: agotado ? '#E5E7EB' : added ? '#10B981' : config.color_primario,
                color: agotado ? '#9CA3AF' : 'white',
                cursor: agotado ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                width: '100%',
              }}
            >
              {added ? <Check size={16} /> : <ShoppingCart size={16} />}
              {agotado ? 'Agotado' : added ? '¡Agregado al carrito!' : 'Agregar al carrito'}
            </button>

            {/* Compartir */}
            <ShareButtons nombre={producto.nombre} color={config.color_primario} />
          </div>
        </div>

        {/* Descripción larga */}
        {producto.descripcion_larga && (
          <div style={{ marginTop: 40, padding: 24, background: 'white', borderRadius: 14, border: '1px solid #F3F4F6' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Descripción</h2>
            <div
              style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ __html: producto.descripcion_larga.replace(/\n/g, '<br/>') }}
            />
          </div>
        )}

        {/* Ficha técnica */}
        {producto.ficha_tecnica && producto.ficha_tecnica.length > 0 && (
          <div style={{ marginTop: 24, padding: 24, background: 'white', borderRadius: 14, border: '1px solid #F3F4F6' }}>
            <FichaTecnica ficha={producto.ficha_tecnica} />
          </div>
        )}

        {/* Productos relacionados */}
        {producto.relacionados && producto.relacionados.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
              Productos relacionados
            </h2>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
              {producto.relacionados.map((rel) => (
                <RelacionadoCard
                  key={rel.id}
                  producto={rel}
                  slug={slug}
                  color={config.color_primario}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ padding: '20px 16px', textAlign: 'center', borderTop: '1px solid #E5E7EB', marginTop: 40 }}>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>
          Tienda en línea impulsada por <span style={{ color: config.color_primario, fontWeight: 700 }}>PyCore ERP</span>
        </p>
      </footer>

      {/* FAB del carrito */}
      <CartButton slug={slug} color={config.color_primario} onClick={() => setCartOpen(true)} />

      <CartDrawer
        slug={slug} config={config}
        isOpen={cartOpen} onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        onNeedAuth={handleNeedAuth}
      />

      {authOpen && (
        <CustomerAuthModal slug={slug} onClose={() => setAuthOpen(false)} onSuccess={handleAuthOk} />
      )}

      {checkoutOpen && isAuth && (
        <CheckoutModal slug={slug} config={config} onClose={() => setCheckoutOpen(false)} />
      )}

      {/* Share icon flotante para mobile */}
      <button
        onClick={() => {
          if ('share' in navigator) {
            navigator.share({ title: producto.nombre, url: window.location.href })
          }
        }}
        style={{
          display: 'share' in navigator ? 'flex' : 'none',
          position: 'fixed', bottom: 90, right: 20,
          width: 46, height: 46, borderRadius: '50%',
          background: config.color_secundario, color: 'white',
          border: 'none', cursor: 'pointer',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
        }}
        title="Compartir"
      >
        <Share2 size={18} />
      </button>
    </div>
  )
}
