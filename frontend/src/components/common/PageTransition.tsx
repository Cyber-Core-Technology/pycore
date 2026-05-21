import { useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'

interface Props {
  children: React.ReactNode
}

export function PageTransition({ children }: Props) {
  const location  = useLocation()
  const [visible, setVisible] = useState(true)
  const prevPath  = useRef(location.pathname)

  useEffect(() => {
    if (prevPath.current === location.pathname) return

    // Fade out rápido, luego fade in con la nueva página
    setVisible(false)
    const t = setTimeout(() => {
      prevPath.current = location.pathname
      setVisible(true)
    }, 80)

    return () => clearTimeout(t)
  }, [location.pathname])

  return (
    <div
      key={location.pathname}
      className="page-transition min-h-full"
      style={{
        opacity: visible ? undefined : 0,
        transition: 'opacity 0.08s ease',
      }}
    >
      {children}
    </div>
  )
}
