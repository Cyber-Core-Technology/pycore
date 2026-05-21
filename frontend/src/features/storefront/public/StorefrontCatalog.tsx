// frontend/src/features/storefront/public/StorefrontCatalog.tsx
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { storefrontApi } from '@/api/storefront-api'
import { ProductoCard } from './ProductoCard'
import { CartButton } from './CartButton'
import { CartDrawer } from './CartDrawer'
import { CustomerAuthModal } from './CustomerAuthModal'
import { CheckoutModal } from './CheckoutModal'
import { useStorefrontAuth } from '@/store/storefrontAuthStore'
import type { StorefrontConfig, ProductoPublico } from '@/types/storefront.types'
import { useNavigate, Link } from 'react-router-dom'
import { Search, Mail, Phone, LogOut, User } from 'lucide-react'

// ── Debounce hook ────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms = 300): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return deb
}

// ── Header de la tienda ──────────────────────────────────────────────────────

function StorefrontHeader({
  config, slug,
  onAuthClick, onLogout, clienteNombre,
}: {
  config:        StorefrontConfig
  slug:          string
  onAuthClick:   () => void
  onLogout:      () => void
  clienteNombre: string | null
}) {
  const navigate = useNavigate()
  return (
    <header style={{ background: config.color_primario, color: 'white' }}>
      {config.banner_url && (
        <div style={{ height: 180, backgroundImage: `url(${config.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, flexShrink: 0, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
          🏪
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontWeight: 800, fontSize: 20, lineHeight: 1.2, margin: 0 }}>
            {config.nombre_tienda || 'Mi Tienda'}
          </h1>
          {config.descripcion && (
            <p style={{ fontSize: 13, opacity: 0.85, marginTop: 4, lineHeight: 1.4 }}>{config.descripcion}</p>
          )}
        </div>

        {/* Contacto + sesión */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {config.whatsapp && (
            <a href={`https://wa.me/${config.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: 'white', textDecoration: 'none', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)' }}>
              <Phone size={13} />
              WhatsApp
            </a>
          )}
          {config.email_pub && (
            <a href={`mailto:${config.email_pub}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: 'white', textDecoration: 'none', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)' }}>
              <Mail size={13} />
              Email
            </a>
          )}

          {/* Sesión cliente */}
          {clienteNombre ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => navigate(`/p/${slug}/cuenta`)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,255,255,0.25)', color: 'white', cursor: 'pointer' }}
              >
                <User size={13} />
                {clienteNombre.split(' ')[0]}
              </button>
              <button onClick={onLogout} title="Cerrar sesión"
                style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 12 }}>
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button onClick={onAuthClick}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <User size={13} />
              Iniciar sesión
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

// ── Catálogo ──────────────────────────────────────────────────────────────────

export function StorefrontCatalog({ slug, config }: { slug: string; config: StorefrontConfig }) {
  const [search,    setSearch]    = useState('')
  const [categoria, setCategoria] = useState('')
  const [page,      setPage]      = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  // Modales
  const [cartOpen,       setCartOpen]       = useState(false)
  const [authOpen,       setAuthOpen]       = useState(false)
  const [checkoutOpen,   setCheckoutOpen]   = useState(false)
  const [authForCheckout, setAuthForCheckout] = useState(false)

  // Auth cliente
  const isAuth        = useStorefrontAuth((s) => s.isAuthenticated(slug))
  const cliente       = useStorefrontAuth((s) => s.getCliente(slug))
  const logoutCliente = useStorefrontAuth((s) => s.logout)

  const { data, isLoading } = useQuery({
    queryKey: ['store-productos', slug, debouncedSearch, categoria, page],
    queryFn:  () => storefrontApi.publicGetProductos(slug, {
      q: debouncedSearch, categoria: categoria || undefined, page,
    }),
    staleTime: 30_000,
  })

  const productos: ProductoPublico[] = data?.results ?? []
  const totalCount = data?.count ?? 0
  const hasNext = !!data?.next
  const hasPrev = !!data?.previous

  // Categorías estables (no se borran al filtrar)
  const [stableCats, setStableCats] = useState<string[]>([])
  const prevProductosRef = useRef<ProductoPublico[]>([])

  useEffect(() => {
    if (!categoria && productos.length > 0) {
      const cats = Array.from(
        new Set(productos.map((p) => p.categoria_nombre).filter(Boolean))
      ).sort() as string[]
      if (cats.length >= stableCats.length) setStableCats(cats)
    }
    prevProductosRef.current = productos
  }, [productos, categoria]) // eslint-disable-line react-hooks/exhaustive-deps

  const categorias = stableCats

  // MP return params
  const [mpBanner, setMpBanner] = useState<{ status: string; pedido: string } | null>(() => {
    const params = new URLSearchParams(window.location.search)
    const mp     = params.get('mp')
    const pedido = params.get('pedido') ?? ''
    if (mp) {
      // Clean URL
      const clean = window.location.pathname
      window.history.replaceState({}, '', clean)
      return { status: mp, pedido }
    }
    return null
  })

  const handleCartClick = () => setCartOpen(true)
  const handleNeedAuth  = () => { setCartOpen(false); setAuthForCheckout(true); setAuthOpen(true) }
  const handleAuthOk    = () => { setAuthOpen(false); if (authForCheckout) { setCheckoutOpen(true) }; setAuthForCheckout(false) }
  const handleCheckout  = () => { setCartOpen(false); setCheckoutOpen(true) }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', overflowX: 'hidden' }}>
      <StorefrontHeader
        config={config}
        slug={slug}
        clienteNombre={cliente?.nombre ?? null}
        onAuthClick={() => { setAuthForCheckout(false); setAuthOpen(true) }}
        onLogout={() => logoutCliente(slug)}
      />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
        {/* Banner retorno Mercado Pago */}
        {mpBanner && (
          <div style={{
            marginBottom: 20, padding: '14px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            ...(mpBanner.status === 'success'
              ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#065F46' }
              : mpBanner.status === 'pending'
                ? { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#92400E' }
                : { background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.3)', color: '#7F1D1D' }),
          }}>
            <span>
              {mpBanner.status === 'success'
                ? `✅ ¡Pago confirmado! Tu pedido ${mpBanner.pedido} está en proceso.`
                : mpBanner.status === 'pending'
                  ? `⏳ Pago pendiente para el pedido ${mpBanner.pedido}. Te avisaremos cuando se confirme.`
                  : `❌ Hubo un problema con el pago del pedido ${mpBanner.pedido}. Intenta de nuevo.`}
            </span>
            <button onClick={() => setMpBanner(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, opacity: 0.6 }}>×</button>
          </div>
        )}

        {/* Barra de búsqueda */}
        <div style={{ position: 'relative', marginBottom: categorias.length > 0 ? 10 : 20 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar producto..."
            style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 14, background: 'white', outline: 'none', color: '#111827', boxSizing: 'border-box' }}
            onFocus={(e) => (e.target.style.borderColor = config.color_primario)}
            onBlur={(e)  => (e.target.style.borderColor = '#E5E7EB')}
          />
        </div>

        {/* Filtro por categoría — pills */}
        {categorias.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => { setCategoria(''); setPage(1) }}
              style={{
                padding: '5px 14px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
                border: `1.5px solid ${!categoria ? config.color_primario : '#E5E7EB'}`,
                background: !categoria ? config.color_primario : 'white',
                color: !categoria ? 'white' : '#6B7280',
                fontSize: 12, fontWeight: 600,
              }}
            >
              Todas
            </button>
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setCategoria(c === categoria ? '' : c); setPage(1) }}
                style={{
                  padding: '5px 14px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
                  border: `1.5px solid ${categoria === c ? config.color_secundario : '#E5E7EB'}`,
                  background: categoria === c ? config.color_secundario : 'white',
                  color: categoria === c ? 'white' : '#6B7280',
                  fontSize: 12, fontWeight: 600,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {totalCount > 0 && (
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>
            <strong style={{ color: config.color_secundario }}>{totalCount}</strong>{' '}
            producto{totalCount !== 1 ? 's' : ''}
            {search && <> para <em>"{search}"</em></>}
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 12, background: 'white', overflow: 'hidden', border: '1px solid #F3F4F6' }}>
                <div style={{ height: 160, background: '#F3F4F6' }} />
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 12, background: '#E5E7EB', borderRadius: 4 }} />
                  <div style={{ height: 10, width: '60%', background: '#E5E7EB', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🔍</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>
              {search ? 'Sin resultados' : 'Catálogo vacío'}
            </p>
            <p style={{ fontSize: 14, color: '#9CA3AF', marginTop: 6 }}>
              {search ? `No encontramos "${search}"` : 'Esta tienda aún no tiene productos publicados'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {productos.map((p) => (
              <ProductoCard key={p.id} producto={p} config={config} slug={slug} />
            ))}
          </div>
        )}

        {/* Paginación */}
        {(hasPrev || hasNext) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 28 }}>
            <button onClick={() => setPage((p) => p - 1)} disabled={!hasPrev}
              style={{ padding: '8px 18px', borderRadius: 8, fontSize: 14, cursor: hasPrev ? 'pointer' : 'not-allowed', transition: 'all 0.15s', border: `1px solid ${hasPrev ? config.color_secundario : '#E5E7EB'}`, background: 'white', color: hasPrev ? config.color_secundario : '#9CA3AF', fontWeight: hasPrev ? 600 : 400 }}>
              ← Anterior
            </button>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: '#6B7280', padding: '0 10px', fontWeight: 600 }}>
              {page}
            </span>
            <button onClick={() => setPage((p) => p + 1)} disabled={!hasNext}
              style={{ padding: '8px 18px', borderRadius: 8, fontSize: 14, cursor: hasNext ? 'pointer' : 'not-allowed', transition: 'all 0.15s', border: `1px solid ${hasNext ? config.color_secundario : '#E5E7EB'}`, background: 'white', color: hasNext ? config.color_secundario : '#9CA3AF', fontWeight: hasNext ? 600 : 400 }}>
              Siguiente →
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ padding: '20px 16px', textAlign: 'center', borderTop: `2px solid ${config.color_secundario}30`, marginTop: 32 }}>
        <p style={{ fontSize: 12, color: '#9CA3AF' }}>
          Tienda en línea impulsada por{' '}
          <span style={{ color: config.color_secundario, fontWeight: 700 }}>PyCore ERP</span>
        </p>
        <p style={{ fontSize: 11, color: '#D1D5DB', marginTop: 6 }}>
          <Link to="/privacidad" target="_blank" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Aviso de Privacidad</Link>
          {' · '}
          <Link to="/terminos" target="_blank" style={{ color: '#9CA3AF', textDecoration: 'none' }}>Términos de Uso</Link>
        </p>
      </footer>

      {/* Cart FAB */}
      <CartButton slug={slug} color={config.color_primario} onClick={handleCartClick} />

      {/* Cart Drawer */}
      <CartDrawer
        slug={slug} config={config}
        isOpen={cartOpen} onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        onNeedAuth={handleNeedAuth}
      />

      {/* Auth Modal */}
      {authOpen && (
        <CustomerAuthModal slug={slug} onClose={() => setAuthOpen(false)} onSuccess={handleAuthOk} />
      )}

      {/* Checkout Modal */}
      {checkoutOpen && isAuth && (
        <CheckoutModal slug={slug} config={config} onClose={() => setCheckoutOpen(false)} />
      )}
    </div>
  )
}
