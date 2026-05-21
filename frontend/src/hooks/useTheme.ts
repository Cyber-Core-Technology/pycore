import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { applyTheme }  from '@/lib/themes'
import { useWsEvent }  from '@/hooks/useWebSocket'

export function useTheme(): void {
  const themeKey = useAuthStore((s) => s.usuario?.empresa?.theme_key ?? 'esmeralda')

  // Aplicar tema cuando cambia la clave (login, cambio en tiempo real)
  useEffect(() => {
    applyTheme(themeKey)
  }, [themeKey])

  // Escuchar cambios en tiempo real vía WebSocket
  useWsEvent('empresa.tema_actualizado', (payload: any) => {
    if (payload?.theme_key) {
      applyTheme(payload.theme_key)
    }
  })
}
