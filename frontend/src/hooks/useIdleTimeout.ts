import { useEffect, useRef } from 'react'

const EVENTS: (keyof WindowEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
]

/**
 * Llama a `onIdle` después de `timeoutMs` ms sin actividad del usuario.
 * El timer se reinicia con cualquier evento de interacción.
 */
export function useIdleTimeout(onIdle: () => void, timeoutMs = 30 * 60 * 1000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => onIdleRef.current(), timeoutMs)
    }

    // Arrancar timer al montar
    reset()

    EVENTS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      EVENTS.forEach((ev) => window.removeEventListener(ev, reset))
    }
  }, [timeoutMs])
}
