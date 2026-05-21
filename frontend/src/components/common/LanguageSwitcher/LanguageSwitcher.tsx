import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'es', label: 'Español',    flag: '🇲🇽' },
  { code: 'en', label: 'English',    flag: '🇺🇸' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'it', label: 'Italiano',   flag: '🇮🇹' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'zh', label: '中文',        flag: '🇨🇳' },
  { code: 'ja', label: '日本語',      flag: '🇯🇵' },
  { code: 'ru', label: 'Русский',    flag: '🇷🇺' },
  { code: 'ko', label: '한국어',      flag: '🇰🇷' },
  { code: 'ar', label: 'العربية',    flag: '🇸🇦' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentCode = i18n.language?.slice(0, 2) ?? 'es'
  const current = LANGS.find(l => l.code === currentCode) ?? LANGS[0]

  const select = (code: string) => {
    i18n.changeLanguage(code)
    localStorage.setItem('pycore_lang', code)
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr'
    setOpen(false)
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Apply RTL on mount if language is Arabic
  useEffect(() => {
    document.documentElement.dir = currentCode === 'ar' ? 'rtl' : 'ltr'
  }, [currentCode])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           5,
          padding:       '6px 10px',
          borderRadius:  8,
          fontSize:      12,
          fontWeight:    600,
          background:    open ? 'var(--surface-hover)' : 'var(--surface-hover)',
          border:        open ? '1px solid var(--color-primary)' : '1px solid var(--border)',
          color:         open ? 'var(--color-primary)' : 'var(--text-secondary)',
          cursor:        'pointer',
          transition:    'all 0.15s',
          letterSpacing: '0.03em',
          userSelect:    'none',
        }}
        onMouseEnter={e => {
          const b = e.currentTarget as HTMLButtonElement
          b.style.color = 'var(--color-primary)'
          b.style.borderColor = 'var(--color-primary)'
        }}
        onMouseLeave={e => {
          if (!open) {
            const b = e.currentTarget as HTMLButtonElement
            b.style.color = 'var(--text-secondary)'
            b.style.borderColor = 'var(--border)'
          }
        }}
      >
        <span style={{ fontSize: 14 }}>{current.flag}</span>
        <span>{current.code.toUpperCase()}</span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position:        'absolute',
            top:             'calc(100% + 6px)',
            right:           0,
            zIndex:          1000,
            background:      'var(--surface)',
            border:          '1px solid var(--border)',
            borderRadius:    10,
            boxShadow:       '0 8px 24px rgba(0,0,0,0.12)',
            minWidth:        160,
            padding:         '4px 0',
            display:         'flex',
            flexDirection:   'column',
          }}
        >
          {LANGS.map(lang => {
            const isActive = lang.code === currentCode
            return (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            10,
                  padding:        '8px 14px',
                  border:         'none',
                  background:     isActive ? 'var(--color-primary-bg, rgba(13,147,115,0.08))' : 'transparent',
                  color:          isActive ? 'var(--color-primary)' : 'var(--text)',
                  fontSize:       13,
                  fontWeight:     isActive ? 700 : 500,
                  cursor:         isActive ? 'default' : 'pointer',
                  textAlign:      'left',
                  width:          '100%',
                  transition:     'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.label}</span>
                {isActive && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
