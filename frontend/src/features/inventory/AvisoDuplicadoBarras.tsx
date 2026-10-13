import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Store } from 'lucide-react'
import { inventoryApi } from '@/api/inventory-api'
import type { Producto } from '@/types/inventory.types'

/** Lo que responde el alta (409) cuando el código de barras ya es de otro producto. */
export interface DuplicadoBarras {
  mensaje:  string
  producto: {
    id: string; codigo: string; nombre: string; codigo_barras: string
    sucursales: { id: string; nombre: string }[]
  }
  /** Sucursales del alta donde el producto que ya existe todavía no se maneja. */
  falta_en: string[]
}

/** Saca el duplicado de un error de axios, o `null` si el error es otra cosa. */
export function leerDuplicadoBarras(e: any): DuplicadoBarras | null {
  const data = e?.response?.data
  if (!data || data.code !== 'codigo_barras_duplicado' || !data.producto) return null
  return { mensaje: String(data.detail ?? ''), producto: data.producto, falta_en: data.falta_en ?? [] }
}

/**
 * El alta chocó con un código de barras que ya existe.
 *
 * Casi nunca es un descuido: el producto está dado de alta en otra sucursal, la
 * lista de ésta no lo muestra y se captura otra vez — así es como un negocio
 * acaba con dos fichas del mismo artículo y la existencia partida entre las
 * dos. Por eso el aviso no se queda en "ya existe": ofrece habilitar aquí el
 * que ya está.
 */
export function AvisoDuplicadoBarras({ dup, soloSucursal, onHabilitado }: {
  dup: DuplicadoBarras
  /** Acota el botón a una sucursal (la activa) aunque el alta pidiera más. */
  soloSucursal?: string
  onHabilitado: (producto: Producto) => void
}) {
  const qc = useQueryClient()
  const [enviando, setEnviando] = useState(false)
  const destino = soloSucursal
    ? dup.falta_en.filter((s) => s === soloSucursal)
    : dup.falta_en

  const habilitar = async () => {
    setEnviando(true)
    try {
      await inventoryApi.replicarASucursales({ ids: [dup.producto.id], sucursales: destino })
      const producto = await inventoryApi.obtenerProducto(dup.producto.id)
      toast.success(`«${dup.producto.nombre}» ya se maneja en esta sucursal`)
      qc.invalidateQueries({ queryKey: ['productos'] })
      qc.invalidateQueries({ queryKey: ['productos-pagina'] })
      qc.invalidateQueries({ queryKey: ['productos-search'] })
      qc.invalidateQueries({ queryKey: ['productos-search-compra'] })
      qc.invalidateQueries({ queryKey: ['stock'] })
      onHabilitado(producto)
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'No se pudo habilitar el producto.')
      setEnviando(false)
    }
  }

  return (
    <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8, padding: '9px 12px', borderRadius: 8, background: 'var(--color-error-bg)', border: '1px solid var(--color-error)' }}>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--color-error)', lineHeight: 1.45 }}>
        {dup.mensaje}
      </p>
      {destino.length > 0 && (
        <button
          type="button"
          onClick={habilitar}
          disabled={enviando}
          style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.7 : 1 }}
        >
          <Store size={13} />
          {enviando ? 'Habilitando…' : 'Habilitar el que ya existe en esta sucursal'}
        </button>
      )}
    </div>
  )
}
