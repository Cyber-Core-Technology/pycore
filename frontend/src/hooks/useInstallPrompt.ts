import { useEffect, useMemo, useState } from 'react'

/** Evento nativo del navegador — no tipado en lib.dom por defecto. */
export type BeforeInstallPromptEvent = Event & {
  prompt:     () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface InstallPromptState {
  /** true en Chrome/Edge cuando el prompt está disponible */
  canInstall:   boolean
  /** true en iPhone / iPad / iPod */
  isIOS:        boolean
  /** true cuando ya está ejecutando como PWA instalada */
  isStandalone: boolean
  /** Abre el diálogo nativo de instalación (solo Android/Chrome) */
  install:      () => Promise<void>
}

const DISMISSED_KEY = 'pycore_install_dismissed'

export function useInstallPrompt(): InstallPromptState & { dismissed: boolean; dismiss: () => void } {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed,      setDismissed]      = useState(
    () => localStorage.getItem(DISMISSED_KEY) === '1'
  )

  const isIOS = useMemo(
    () => /iphone|ipad|ipod/i.test(navigator.userAgent),
    []
  )

  const isStandalone = useMemo(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true,
    []
  )

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    function onAppInstalled() {
      // Ya instalada — ocultar banner
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled',        onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled',        onAppInstalled)
    }
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return {
    canInstall:   !!deferredPrompt,
    isIOS,
    isStandalone,
    install,
    dismissed,
    dismiss,
  }
}
