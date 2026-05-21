import { api } from '@/api/axios-config'

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface VentaItem {
  id?: string
  folio?: string
  fecha?: string
  total?: string | number
  [key: string]: unknown
}

export interface CompraItem {
  id?: string
  folio?: string
  fecha?: string
  proveedor?: string
  proveedor_nombre?: string
  total?: string | number
  [key: string]: unknown
}

export interface GastoItem {
  id?: string
  folio?: string
  fecha_gasto?: string
  fecha?: string
  concepto?: string
  categoria?: string
  metodo_pago?: string
  total?: string | number
  monto?: string | number
  [key: string]: unknown
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Paginated<T> { count?: number; results?: T[] }

const extractAll = <T,>(data: T[] | Paginated<T>): T[] =>
  Array.isArray(data) ? data : (data?.results ?? [])

// ─── Fetch all (ignores UI pagination) ───────────────────────────────────────

export const fetchAllVentas = async (desde: string, hasta: string): Promise<VentaItem[]> => {
  const res = await api.get('/api/v1/sales/ventas/', {
    params: { fecha_desde: desde, fecha_hasta: hasta, page_size: 9999, estado: 'activo,pagado' },
  })
  return extractAll<VentaItem>(res.data)
}

export const fetchAllCompras = async (desde: string, hasta: string): Promise<CompraItem[]> => {
  const res = await api.get('/api/v1/purchases/compras/', {
    params: { fecha_desde: desde, fecha_hasta: hasta, page_size: 9999 },
  })
  return extractAll<CompraItem>(res.data)
}

export const fetchAllGastos = async (desde: string, hasta: string): Promise<GastoItem[]> => {
  const res = await api.get('/api/v1/finance/gastos/', {
    params: { fecha_desde: desde, fecha_hasta: hasta, page_size: 9999 },
  })
  return extractAll<GastoItem>(res.data)
}
