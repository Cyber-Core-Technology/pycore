import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface ExcelColumn {
  header: string
  key: string
  width?: number
}

export interface PdfColumn {
  header: string
  key: string
}

export interface EmpresaInfo {
  nombre: string
  logo_url?: string | null
}

export interface SummaryItem {
  label: string
  value: string
}

export interface PDFParams {
  data: Record<string, unknown>[]
  columns: PdfColumn[]
  filename: string
  title: string
  desde: string
  hasta: string
  empresa: EmpresaInfo
  summary?: SummaryItem[]
  total?: number
}

// ─── Private helpers ──────────────────────────────────────────────────────────

const PRIMARY: [number, number, number] = [24, 174, 145]

const fmtMXN = (val: number) =>
  val.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }
      ctx.drawImage(img, 0, 0)
      try { resolve(canvas.toDataURL('image/png')) }
      catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function formatPeriodo(desde: string, hasta: string): string {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const fmt = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day} ${months[Number(m) - 1]} ${y}`
  }
  return desde === hasta ? fmt(desde) : `${fmt(desde)} — ${fmt(hasta)}`
}

// ─── Core PDF builder (shared logic) ─────────────────────────────────────────

async function buildPDFDoc({
  data, columns, filename: _filename, title,
  desde, hasta, empresa, summary, total,
}: PDFParams): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  let y = 8

  // ── Logo ──
  let logoLoaded = false
  if (empresa.logo_url) {
    const b64 = await loadImageAsBase64(empresa.logo_url)
    if (b64) {
      try { doc.addImage(b64, 'PNG', 10, y, 22, 11); logoLoaded = true }
      catch { /* formato no soportado */ }
    }
  }

  // ── Encabezado: empresa + reporte (izquierda) / período + fecha (derecha) ──
  const textX = logoLoaded ? 36 : 10
  doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(15, 15, 15)
  doc.text(empresa.nombre, textX, y + 5)
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(50, 50, 50)
  doc.text(title, textX, y + 10)

  doc.setFontSize(7.5).setTextColor(110, 110, 110)
  doc.text(`Período: ${formatPeriodo(desde, hasta)}`, pageW - 10, y + 5, { align: 'right' })
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageW - 10, y + 10, { align: 'right' })

  y += 17

  // ── Línea divisora ──
  doc.setDrawColor(...PRIMARY).setLineWidth(0.4)
  doc.line(10, y, pageW - 10, y)
  y += 4

  // ── Tarjetas de resumen ──
  if (summary?.length) {
    const count = summary.length
    const cardW = (pageW - 20 - (count - 1) * 3) / count
    summary.forEach((s, i) => {
      const x = 10 + i * (cardW + 3)
      doc.setFillColor(242, 248, 245).setDrawColor(200, 220, 212)
      doc.roundedRect(x, y, cardW, 14, 1.5, 1.5, 'FD')
      doc.setFontSize(6).setFont('helvetica', 'normal').setTextColor(100, 100, 100)
      doc.text(s.label.toUpperCase(), x + 3, y + 5)
      doc.setFontSize(9.5).setFont('helvetica', 'bold').setTextColor(15, 15, 15)
      doc.text(s.value, x + 3, y + 11)
    })
    y += 18
  }

  // ── Tabla ──
  autoTable(doc, {
    startY: y,
    head: [columns.map((c) => c.header)],
    body: data.map((row) =>
      columns.map((c) => {
        const val = row[c.key]
        return val === null || val === undefined ? '' : String(val)
      })
    ),
    foot: total !== undefined
      ? [[{
          content: `TOTAL: ${fmtMXN(total)}`,
          colSpan: columns.length,
          styles: { halign: 'right' as const, fontStyle: 'bold' as const, fontSize: 8 },
        }]]
      : undefined,
    styles: { fontSize: 7, cellPadding: 2.2, overflow: 'linebreak' },
    headStyles: {
      fillColor: PRIMARY,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [242, 248, 245] as [number, number, number],
      textColor: [15, 15, 15] as [number, number, number],
    },
    alternateRowStyles: { fillColor: [249, 252, 250] as [number, number, number] },
    tableLineColor: [215, 228, 222] as [number, number, number],
    tableLineWidth: 0.15,
    margin: { left: 10, right: 10 },
  })

  // ── Pie de página ──
  const totalPages = doc.getNumberOfPages()
  const pageH = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(6.5).setFont('helvetica', 'normal').setTextColor(140, 140, 140)
    doc.text(
      `${data.length} registro${data.length !== 1 ? 's' : ''}  ·  ${title}`,
      10, pageH - 4
    )
    doc.text(`${i} / ${totalPages}`, pageW - 10, pageH - 4, { align: 'right' })
  }

  return doc
}

// ─── PDF: Preview (devuelve blob URL + callback de descarga segura) ───────────
// La descarga usa doc.save() en lugar de <a download> para evitar bloqueos
// de browsers (Brave, Firefox strict mode) con blob URLs.

export async function previewPDF(params: PDFParams): Promise<{
  url: string
  filename: string
  onDownload: () => void
}> {
  const doc = await buildPDFDoc(params)
  const filename = `${params.filename}.pdf`
  const blob = doc.output('blob')
  return {
    url: URL.createObjectURL(blob),
    filename,
    onDownload: () => doc.save(filename),
  }
}

// ─── PDF: Descarga directa ────────────────────────────────────────────────────

export async function exportToPDF(params: PDFParams): Promise<void> {
  const doc = await buildPDFDoc(params)
  doc.save(`${params.filename}.pdf`)
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

export async function exportToExcel({
  data, columns, filename, title, desde, hasta, empresa,
}: {
  data: Record<string, unknown>[]
  columns: ExcelColumn[]
  filename: string
  title: string
  desde: string
  hasta: string
  empresa: EmpresaInfo
}) {
  const wb = XLSX.utils.book_new()

  const headerRows: (string | number)[][] = [
    [empresa.nombre],
    [title],
    [`Período: ${formatPeriodo(desde, hasta)}`],
    [`Generado: ${new Date().toLocaleString('es-MX')}`],
    [],
    columns.map((c) => c.header),
  ]

  const dataRows = data.map((row) =>
    columns.map((c) => {
      const val = row[c.key]
      return val === null || val === undefined ? '' : (val as string | number)
    })
  )

  const lastKey = columns[columns.length - 1]?.key
  const total = data.reduce((s, r) => s + Number(r[lastKey] ?? 0), 0)
  const totalRow: (string | number)[] = [
    ...Array(columns.length - 1).fill(''),
    `TOTAL: ${fmtMXN(total)}`,
  ]

  const ws = XLSX.utils.aoa_to_sheet([...headerRows, ...dataRows, [], totalRow])
  ws['!cols'] = columns.map((c) => ({ wch: c.width ?? 22 }))
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  triggerDownload(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${filename}.xlsx`
  )
}
