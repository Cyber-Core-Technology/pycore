import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Footer } from './Footer'
import { PageTransition } from '@/components/common/PageTransition'
import { useWsConnection } from '@/hooks/useWebSocket'
import { useTheme } from '@/hooks/useTheme'

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  useWsConnection()
  useTheme()

  useEffect(() => {
    const theme = localStorage.getItem('pycore_theme')
    if (theme === 'dark')
      document.documentElement.classList.add('dark')
    else
      document.documentElement.classList.remove('dark')
  }, [])

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuClick={() => setMobileOpen(true)} />

        {/* 🔥 MAIN CORREGIDO */}
        <main id="main-content" className="flex-1 overflow-y-auto p-3 md:p-6" style={{ position: "relative" }}>
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>

        <div className="app-footer"><Footer /></div>
      </div>
    </div>
  )
}