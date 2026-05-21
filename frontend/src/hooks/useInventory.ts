import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi } from '@/api/inventory-api'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { FiltrosProducto, FiltrosMovimiento, AjusteRequest, EntradaRequest } from '@/types/inventory.types'

// ── Productos ─────────────────────────────────────────────────────────────────

export function useProductos(filtros: FiltrosProducto = {}) {
  return useQuery({
    queryKey: ['productos', filtros],
    queryFn:  () => inventoryApi.listarProductos(filtros),
  })
}

export function useProducto(id: string | null) {
  return useQuery({
    queryKey: ['producto', id],
    queryFn:  () => inventoryApi.obtenerProducto(id!),
    enabled:  id !== null,
  })
}

export function useEliminarProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => inventoryApi.eliminarProducto(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

// ── Stock ─────────────────────────────────────────────────────────────────────

export function useStock(sucursalId?: string) {
  return useQuery({
    queryKey: ['stock', sucursalId],
    queryFn:  () => inventoryApi.listarStock(sucursalId),
  })
}

export function useAlertasStock() {
  return useQuery({
    queryKey: ['stock-alertas'],
    queryFn:  inventoryApi.alertasStock,
  })
}

export function useRegistrarAjuste() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AjusteRequest) => inventoryApi.registrarAjuste(data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
      qc.invalidateQueries({ queryKey: ['stock-alertas'] })
    },
  })
}

export function useRegistrarEntrada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EntradaRequest) => inventoryApi.registrarEntrada(data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['movimientos'] })
    },
  })
}

// ── Movimientos ───────────────────────────────────────────────────────────────

export function useMovimientos(filtros: FiltrosMovimiento = {}) {
  return useQuery({
    queryKey: ['movimientos', filtros],
    queryFn:  () => inventoryApi.listarMovimientos(filtros),
  })
}

// ── Barcode ───────────────────────────────────────────────────────────────────

export function useBarcodeScanner() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const buscar = useCallback(async (codigo: string) => {
    setLoading(true)
    setError(null)
    try {
      return await inventoryApi.buscarPorBarcode(codigo)
    } catch {
      setError('Error al consultar el código de barras')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { buscar, loading, error }
}

// ── Scan Session ──────────────────────────────────────────────────────────────

export function useScanSession() {
  const [token,     setToken]     = useState<string | null>(null)
  const [qr,        setQr]        = useState<string | null>(null)
  const [url,       setUrl]       = useState<string | null>(null)
  const [esperando, setEsperando] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const iniciar = useCallback(async (onResult: (producto: any) => void) => {
    setError(null)
    try {
      const baseUrl = window.location.origin
      const sesion  = await inventoryApi.crearScanSession(baseUrl)
      setToken(sesion.token)
      setQr(sesion.qr_base64)
      setUrl(sesion.url_escaneo)
      setEsperando(true)

      // Polling cada 1.5s
      intervalRef.current = setInterval(async () => {
        try {
          const resultado = await inventoryApi.pollScanSession(sesion.token)
          if (resultado.listo) {
            detener()
            onResult(resultado.producto)
          } else if (resultado.expirado) {
            detener()
            setError('La sesión expiró. Genera un nuevo QR.')
          }
        } catch {
          detener()
          setError('Error al verificar el escaneo.')
        }
      }, 1500)
    } catch {
      setError('No se pudo crear la sesión de escaneo.')
    }
  }, [])

  const detener = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setEsperando(false)
  }, [])

  useEffect(() => () => detener(), [])

  return { token, qr, url, esperando, error, iniciar, detener }
}
