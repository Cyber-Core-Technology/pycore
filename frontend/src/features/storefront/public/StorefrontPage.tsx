// frontend/src/features/storefront/public/StorefrontPage.tsx
import { useState, useEffect, useCallback } from 'react'
import { useParams }   from 'react-router-dom'
import { useQuery }    from '@tanstack/react-query'
import { storefrontApi } from '@/api/storefront-api'
import { StorefrontCatalog } from './StorefrontCatalog'
import type { StorefrontConfig } from '@/types/storefront.types'

// ── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

// ── 404 de tienda ───────────────────────────────────────────────────────────

function StorefrontNotFound({ slug }: { slug: string }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
      background: '#F9FAFB',
    }}>
      <p style={{ fontSize: 48 }}>🏪</p>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>
        Tienda no encontrada
      </h1>
      <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', maxWidth: 320 }}>
        No existe ninguna tienda con el slug <strong>"{slug}"</strong>, o aún no está publicada.
      </p>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export function StorefrontPage() {
  const { slug = '' } = useParams<{ slug: string }>()

  const { data: config, isLoading, isError } = useQuery<StorefrontConfig>({
    queryKey: ['store', slug],
    queryFn:  () => storefrontApi.publicGetTienda(slug),
    retry:    false,
    staleTime: 60_000,
  })

  // Inyectar estilos CSS del tema de la tienda en el <head>
  useEffect(() => {
    if (!config) return
    const style = document.createElement('style')
    style.id = 'storefront-theme'
    style.textContent = `
      :root {
        --brand: ${config.color_primario};
        --brand-dark: ${config.color_secundario};
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `
    document.head.appendChild(style)
    // Actualizar título de la pestaña
    document.title = config.nombre_tienda || 'Tienda en línea'
    return () => {
      style.remove()
      document.title = 'PyCore ERP'
    }
  }, [config])

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: 24 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Skeleton h={120} r={12} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} h={200} r={10} />)}
          </div>
        </div>
      </div>
    )
  }

  if (isError || !config) {
    return <StorefrontNotFound slug={slug} />
  }

  return <StorefrontCatalog slug={slug} config={config} />
}
