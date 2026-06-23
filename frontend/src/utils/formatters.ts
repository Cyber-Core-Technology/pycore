export function formatMXN(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)     return `$${(amount / 1_000).toFixed(0)}K`
  return new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', maximumFractionDigits: 0
  }).format(amount)
}

/** Formatea una cantidad quitando ceros decimales sobrantes: "15.0000" → "15", "1.5000" → "1.5" */
export function formatCantidad(value: string | number): string {
  const n = typeof value === 'number' ? value : parseFloat(value)
  if (isNaN(n)) return String(value)
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 4 }).format(n)
}

export function formatFecha(iso: string): string {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short'
  })
}

export function pctChange(actual: number, anterior: number): number {
  if (!anterior) return 0
  return Math.round(((actual - anterior) / anterior) * 100)
}
