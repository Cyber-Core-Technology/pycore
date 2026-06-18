import { useEffect, useRef } from 'react'

interface Options {
  /** Se invoca con el código cuando se detecta un escaneo de pistola. */
  onScan: (codigo: string) => void
  /** Desactiva el listener (p. ej. cuando hay otro modal abierto). */
  enabled?: boolean
  /** Longitud mínima del código para considerarlo válido. Default 6. */
  minLength?: number
  /**
   * Pausa máxima (ms) entre teclas para seguir considerándolas parte del mismo
   * escaneo. Una pistola dispara las teclas en ráfaga (típico <30ms cableada,
   * <60ms Bluetooth); un humano teclea con pausas >100ms. Default 100ms para
   * tolerar pistolas Bluetooth sin confundirse con tecleo manual.
   */
  resetGapMs?: number
}

/**
 * Detecta escaneos de una pistola de código de barras (lector HID que se
 * comporta como teclado) a nivel global, SIN necesidad de que un campo tenga
 * el foco.
 *
 * Heurística: como solo escucha cuando NO hay un campo editable enfocado, basta
 * con acumular las teclas que llegan en ráfaga y disparar al recibir Enter si el
 * buffer alcanza la longitud mínima. Si el foco está en un input/textarea, se
 * ignora: ese campo maneja su propio Enter (evita doble lectura).
 */
export function useScannerGun({
  onScan,
  enabled = true,
  minLength = 6,
  resetGapMs = 100,
}: Options) {
  const bufferRef   = useRef('')
  const lastTimeRef = useRef(0)
  const onScanRef   = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (!enabled) return

    const esEditable = (el: EventTarget | null): boolean => {
      const node = el as HTMLElement | null
      if (!node) return false
      const tag = node.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable
    }

    const handler = (e: KeyboardEvent) => {
      // El foco está en un campo editable → lo maneja ese campo.
      if (esEditable(document.activeElement)) return
      // Ignorar combinaciones con modificadores (atajos de teclado).
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const ahora = Date.now()
      const delta = ahora - lastTimeRef.current
      lastTimeRef.current = ahora

      // Pausa larga ⇒ empieza una secuencia nueva.
      if (delta > resetGapMs) bufferRef.current = ''

      if (e.key === 'Enter') {
        const codigo = bufferRef.current.trim()
        bufferRef.current = ''
        if (codigo.length >= minLength) {
          e.preventDefault()
          onScanRef.current(codigo)
        }
        return
      }

      // Solo caracteres imprimibles de un carácter (dígitos/letras del código).
      if (e.key.length === 1) {
        bufferRef.current += e.key
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, minLength, resetGapMs])
}
