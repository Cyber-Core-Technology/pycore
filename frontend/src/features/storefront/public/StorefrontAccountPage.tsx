// frontend/src/features/storefront/public/StorefrontAccountPage.tsx
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, User, ShoppingBag, LogOut, Phone, Mail, Pencil, Check, X, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { storefrontApi } from '@/api/storefront-api'
import { storeCustomerApi } from '@/api/store-customer-api'
import { useStorefrontAuth } from '@/store/storefrontAuthStore'
import type { Pedido, ClientePerfilUpdate } from '@/types/store-customer.types'

// ── Estado badge ─────────────────────────────────────────────────────────────

const ESTADO: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: 'Pendiente de pago',  color: 'var(--color-warning)', bg: 'rgba(245,158,11,0.1)' },
  apartado:   { label: 'Apartado',            color: 'var(--color-info)', bg: 'rgba(59,130,246,0.1)' },
  pagado:     { label: 'Pagado',              color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  en_proceso: { label: 'En proceso',          color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  listo:      { label: 'Listo para recoger',  color: '#1BAE91', bg: 'rgba(27,174,145,0.1)' },
  entregado:  { label: 'Entregado',           color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  cancelado:  { label: 'Cancelado',           color: 'var(--color-error)', bg: 'var(--color-error-bg)' },
}

function EstadoBadge({ estado }: { estado: string }) {
  const e = ESTADO[estado] ?? ESTADO['pendiente']
  return (
    <span style={{
      display: 'inline-block', padding: '3px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 600, color: e.color, background: e.bg,
    }}>
      {e.label}
    </span>
  )
}

// ── Tarjeta de pedido ─────────────────────────────────────────────────────────

function PedidoCard({ pedido, colorPrimario }: { pedido: Pedido; colorPrimario: string }) {
  const [open, setOpen] = useState(false)
  const esCash = pedido.metodo_pago === 'efectivo_en_tienda'
  const fmt    = (n: string) => parseFloat(n).toLocaleString('es-MX', { minimumFractionDigits: 2 })
  const fecha  = new Date(pedido.created_at).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', background: 'white' }}>
      {/* Cabecera */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '16px 18px', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#111827', letterSpacing: 1 }}>
              {pedido.numero_pedido}
            </span>
            <EstadoBadge estado={pedido.estado} />
          </div>
          <p style={{ fontSize: 12, color: '#6B7280' }}>
            {fecha} · <strong style={{ color: '#374151' }}>${fmt(pedido.total)}</strong>
            {' · '}{esCash ? '💵 Efectivo en tienda' : '💳 Mercado Pago'}
          </p>
        </div>
        <span style={{ fontSize: 12, color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▼</span>
      </button>

      {/* Detalle expandido */}
      {open && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* QR */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ padding: 12, border: '1px solid #E5E7EB', borderRadius: 12, background: 'white' }}>
              <QRCodeSVG value={pedido.ticket_uuid} size={110} level="M" bgColor="white" fgColor="#111827" />
              <p style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 6 }}>
                Muestra este QR en el local
              </p>
            </div>
          </div>

          {/* Items */}
          <div>
            {pedido.detalles.map((d) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 6 }}>
                <span>{d.nombre_snapshot} <span style={{ color: '#9CA3AF' }}>×{d.cantidad}</span></span>
                <span style={{ fontWeight: 600 }}>${fmt(d.subtotal)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, borderTop: '1px dashed #E5E7EB', paddingTop: 8, marginTop: 4 }}>
              <span>Total</span>
              <span style={{ color: colorPrimario }}>${fmt(pedido.total)}</span>
            </div>
          </div>

          {pedido.notas_cliente ? (
            <p style={{ fontSize: 12, color: '#6B7280', padding: '8px 12px', background: '#F9FAFB', borderRadius: 8 }}>
              📝 {pedido.notas_cliente}
            </p>
          ) : null}

          {pedido.estado === 'listo' && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(27,174,145,0.08)', border: '1px solid rgba(27,174,145,0.25)', fontSize: 13, color: '#065F46', textAlign: 'center', fontWeight: 600 }}>
              ✅ ¡Tu pedido está listo! Pasa al local con este QR.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Formulario de perfil editable ──────────────────────────────────────────────

const FIELD_LABEL: Record<string, string> = {
  nombre: 'Nombre', telefono: 'Teléfono',
  rfc: 'RFC', razon_social: 'Razón social',
  tipo_persona: 'Tipo de persona', regimen_fiscal: 'Régimen fiscal',
  calle: 'Calle', numero_exterior: 'Núm. exterior', numero_interior: 'Núm. interior',
  colonia: 'Colonia', codigo_postal: 'Código postal',
  ciudad: 'Ciudad', estado: 'Estado', pais: 'País',
}

const FISCAL_FIELDS: (keyof ClientePerfilUpdate)[] = [
  'nombre', 'telefono',
  'rfc', 'razon_social', 'tipo_persona', 'regimen_fiscal',
  'calle', 'numero_exterior', 'numero_interior', 'colonia',
  'codigo_postal', 'ciudad', 'estado', 'pais',
]

function PerfilForm({
  slug, perfil, colorPrimario,
}: { slug: string; perfil: Record<string, string>; colorPrimario: string }) {
  const qc = useQueryClient()
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState<ClientePerfilUpdate>({})
  const [ok, setOk] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: ClientePerfilUpdate) => storeCustomerApi.actualizarPerfil(slug, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store-me', slug] })
      setEditando(false)
      setOk(true)
      setTimeout(() => setOk(false), 2500)
    },
  })

  const startEdit = () => {
    const initial: ClientePerfilUpdate = {}
    FISCAL_FIELDS.forEach((k) => { (initial as Record<string, string>)[k] = perfil[k] ?? '' })
    setForm(initial)
    setEditando(true)
  }

  const inp = (key: keyof ClientePerfilUpdate) => (
    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 11, color: '#9CA3AF' }}>{FIELD_LABEL[key]}</label>
      <input
        value={(form as Record<string, string>)[key] ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        style={{
          padding: '7px 10px', borderRadius: 8, border: '1px solid #D1D5DB',
          fontSize: 13, outline: 'none', background: 'white', color: '#111827',
        }}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Datos personales y fiscales</p>
        {!editando && (
          <button
            onClick={startEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: `1px solid ${colorPrimario}`, background: 'transparent', color: colorPrimario, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >
            <Pencil size={12} /> Editar
          </button>
        )}
      </div>

      {ok && (
        <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', fontSize: 13, color: '#065F46', fontWeight: 600 }}>
          ✅ Perfil actualizado correctamente.
        </div>
      )}

      {editando ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {FISCAL_FIELDS.map(inp)}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setEditando(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', cursor: 'pointer', fontSize: 13 }}
            >
              <X size={13} /> Cancelar
            </button>
            <button
              onClick={() => {
                // No enviar campos vacíos — el backend conserva el valor existente
                const payload = Object.fromEntries(
                  Object.entries(form).filter(([, v]) => v !== undefined && v !== '')
                ) as ClientePerfilUpdate
                mutation.mutate(payload)
              }}
              disabled={mutation.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, border: 'none', background: colorPrimario, color: 'white', cursor: mutation.isPending ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              <Check size={13} /> {mutation.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {FISCAL_FIELDS.map((key) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{FIELD_LABEL[key]}</p>
              <p style={{ fontSize: 13, color: perfil[key] ? '#111827' : '#D1D5DB', fontWeight: perfil[key] ? 500 : 400 }}>
                {perfil[key] || '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

// ── Sección 2FA para clientes ─────────────────────────────────────────────────

function TwoFASection({ slug, colorPrimario, initialEnabled, initialMethod }: {
  slug: string; colorPrimario: string; initialEnabled: boolean; initialMethod: string
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [method,  setMethod]  = useState(initialMethod)
  const [step,    setStep]    = useState<'idle' | 'setup-totp' | 'setup-email' | 'disable'>('idle')
  const [qrData,  setQrData]  = useState<{ qr_image: string; secret: string } | null>(null)
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')
  const [err,     setErr]     = useState('')

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
    fontSize: 16, outline: 'none', textAlign: 'center', letterSpacing: 8, fontWeight: 700, color: '#111827',
    boxSizing: 'border-box',
  }
  const btnPrimary = (disabled: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#D1D5DB' : colorPrimario, color: disabled ? '#9CA3AF' : 'white',
  })
  const btnGhost: React.CSSProperties = {
    flex: 1, padding: '9px', borderRadius: 9, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', fontSize: 13, color: '#6B7280',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
        background: enabled ? 'rgba(16,185,129,0.08)' : '#F9FAFB',
        border: `1px solid ${enabled ? 'rgba(16,185,129,0.25)' : '#E5E7EB'}` }}>
        {enabled ? <ShieldCheck size={18} color="#10B981" /> : <ShieldOff size={18} color="#9CA3AF" />}
        <div>
          <p style={{ fontWeight: 600, fontSize: 13, color: '#111827', margin: 0 }}>
            {enabled ? '2FA activado' : '2FA desactivado'}
          </p>
          {enabled && <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
            {method === 'totp' ? 'App autenticadora' : 'Correo electrónico'}
          </p>}
        </div>
      </div>

      {err && <p style={{ fontSize: 12, color: '#EF4444', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>{err}</p>}
      {msg && <p style={{ fontSize: 12, color: '#065F46', background: 'rgba(16,185,129,0.08)', padding: '8px 12px', borderRadius: 8 }}>{msg}</p>}

      {/* Activar */}
      {step === 'idle' && !enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 9, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', fontSize: 13, color: '#374151' }}
            onClick={async () => {
              setLoading(true); setErr('')
              try { const d = await storeCustomerApi.twoFaSetup(slug, 'totp'); setQrData({ qr_image: d.qr_image!, secret: d.secret! }); setStep('setup-totp') }
              catch { setErr('No se pudo iniciar la configuración.') }
              finally { setLoading(false) }
            }} disabled={loading}>
            <Smartphone size={15} style={{ color: colorPrimario }} /> App autenticadora (TOTP)
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 9, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', fontSize: 13, color: '#374151' }}
            onClick={async () => {
              setLoading(true); setErr('')
              try { await storeCustomerApi.twoFaSetup(slug, 'email'); setStep('setup-email'); setMsg('Código enviado a tu correo.') }
              catch { setErr('No se pudo enviar el código.') }
              finally { setLoading(false) }
            }} disabled={loading}>
            <Mail size={15} style={{ color: colorPrimario }} /> Correo electrónico
          </button>
        </div>
      )}

      {/* Setup TOTP */}
      {step === 'setup-totp' && qrData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12, color: '#6B7280' }}>Escanea este QR con Google Authenticator o Authy.</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img src={`data:image/png;base64,${qrData.qr_image}`} alt="QR 2FA" style={{ width: 140, borderRadius: 8, border: '1px solid #E5E7EB' }} />
          </div>
          <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', wordBreak: 'break-all' }}>Clave: <strong>{qrData.secret}</strong></p>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="Código de 6 dígitos" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={inp} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnGhost} onClick={() => { setStep('idle'); setQrData(null); setCode(''); setErr('') }}>Cancelar</button>
            <button style={btnPrimary(code.length < 6 || loading)} disabled={code.length < 6 || loading} onClick={async () => {
              setLoading(true); setErr('')
              try { await storeCustomerApi.twoFaEnable(slug, 'totp', code); setEnabled(true); setMethod('totp'); setStep('idle'); setQrData(null); setCode(''); setMsg('¡2FA activado!') }
              catch (e: any) { setErr(e?.response?.data?.detail ?? 'Código incorrecto.') }
              finally { setLoading(false) }
            }}>{loading ? 'Verificando…' : 'Activar'}</button>
          </div>
        </div>
      )}

      {/* Setup Email */}
      {step === 'setup-email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12, color: '#6B7280' }}>Ingresa el código enviado a tu correo para confirmar.</p>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="Código de 6 dígitos" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={inp} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnGhost} onClick={() => { setStep('idle'); setCode(''); setErr(''); setMsg('') }}>Cancelar</button>
            <button style={btnPrimary(code.length < 6 || loading)} disabled={code.length < 6 || loading} onClick={async () => {
              setLoading(true); setErr('')
              try { await storeCustomerApi.twoFaEnable(slug, 'email', code); setEnabled(true); setMethod('email'); setStep('idle'); setCode(''); setMsg('¡2FA activado!') }
              catch (e: any) { setErr(e?.response?.data?.detail ?? 'Código incorrecto.') }
              finally { setLoading(false) }
            }}>{loading ? 'Verificando…' : 'Activar'}</button>
          </div>
        </div>
      )}

      {/* Desactivar */}
      {step === 'idle' && enabled && (
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 9, border: '1px solid #FCA5A5', background: 'rgba(239,68,68,0.05)', cursor: 'pointer', fontSize: 13, color: '#EF4444' }}
          onClick={() => { setStep('disable'); setErr(''); setMsg('') }}>
          <ShieldOff size={15} /> Desactivar 2FA
        </button>
      )}

      {step === 'disable' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12, color: '#6B7280' }}>Ingresa tu código actual para desactivar el 2FA.</p>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="Código de 6 dígitos" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} style={inp} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={btnGhost} onClick={() => { setStep('idle'); setCode(''); setErr('') }}>Cancelar</button>
            <button style={{ ...btnPrimary(code.length < 6 || loading), background: code.length < 6 ? '#D1D5DB' : '#EF4444' }} disabled={code.length < 6 || loading} onClick={async () => {
              setLoading(true); setErr('')
              try { await storeCustomerApi.twoFaDisable(slug, code); setEnabled(false); setMethod(''); setStep('idle'); setCode(''); setMsg('2FA desactivado.') }
              catch (e: any) { setErr(e?.response?.data?.detail ?? 'Código incorrecto.') }
              finally { setLoading(false) }
            }}>{loading ? 'Desactivando…' : 'Confirmar'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

type TabCuenta = 'pedidos' | 'perfil'

export function StorefrontAccountPage() {
  const { slug }   = useParams<{ slug: string }>()
  const navigate   = useNavigate()
  const [tab, setTab] = useState<TabCuenta>('pedidos')

  const isAuth        = useStorefrontAuth((s) => s.isAuthenticated(slug!))
  const cliente       = useStorefrontAuth((s) => s.getCliente(slug!))
  const logoutCliente = useStorefrontAuth((s) => s.logout)

  // Redirigir si no hay sesión
  if (!isAuth || !cliente) {
    navigate(`/p/${slug}`, { replace: true })
    return null
  }

  const { data: config } = useQuery({
    queryKey: ['store-config-public', slug],
    queryFn:  () => storefrontApi.publicGetTienda(slug!),
    staleTime: 60_000,
  })

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['store-mis-pedidos', slug],
    queryFn:  () => storeCustomerApi.getPedidos(slug!),
    enabled:  isAuth,
    staleTime: 30_000,
  })

  const { data: perfil } = useQuery({
    queryKey: ['store-me', slug],
    queryFn:  () => storeCustomerApi.me(slug!),
    enabled:  isAuth,
    staleTime: 60_000,
  })

  const colorPrimario = config?.color_primario ?? '#1BAE91'

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Header */}
      <header style={{ background: colorPrimario, color: 'white' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to={`/p/${slug}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 13, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.12)' }}
          >
            <ArrowLeft size={14} />
            Tienda
          </Link>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{config?.nombre_tienda ?? slug}</p>
            <p style={{ fontSize: 11, opacity: 0.75 }}>Mi cuenta</p>
          </div>
          <button
            onClick={() => { logoutCliente(slug!); navigate(`/p/${slug}`) }}
            title="Cerrar sesión"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer', fontSize: 12 }}
          >
            <LogOut size={13} />
            Salir
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
        {/* Saludo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: colorPrimario, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
            {cliente.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Hola, {cliente.nombre.split(' ')[0]} 👋</p>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{cliente.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #E5E7EB' }}>
          {([
            { key: 'pedidos', label: 'Mis pedidos', icon: ShoppingBag },
            { key: 'perfil',  label: 'Mi perfil',   icon: User },
          ] as { key: TabCuenta; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 16px', border: 'none', background: 'none',
                fontSize: 13, fontWeight: tab === key ? 700 : 400, cursor: 'pointer',
                color: tab === key ? colorPrimario : '#6B7280',
                borderBottom: `2px solid ${tab === key ? colorPrimario : 'transparent'}`,
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Pedidos */}
        {tab === 'pedidos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {isLoading && <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: 32 }}>Cargando pedidos...</p>}

            {!isLoading && pedidos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: '#6B7280' }}>
                <p style={{ fontSize: 40, marginBottom: 12 }}>🛍️</p>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#374151' }}>Aún no tienes pedidos</p>
                <p style={{ fontSize: 13, marginTop: 6 }}>Explora la tienda y realiza tu primer pedido.</p>
                <Link
                  to={`/p/${slug}`}
                  style={{ display: 'inline-block', marginTop: 16, padding: '10px 24px', borderRadius: 10, background: colorPrimario, color: 'white', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
                >
                  Ver catálogo
                </Link>
              </div>
            )}

            {pedidos.map((p) => (
              <PedidoCard key={p.id} pedido={p} colorPrimario={colorPrimario} />
            ))}
          </div>
        )}

        {/* Tab: Perfil */}
        {tab === 'perfil' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Tarjeta de identidad */}
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: colorPrimario, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
                {cliente.nombre.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{perfil?.nombre ?? cliente.nombre}</p>
                <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280' }}>
                    <Mail size={12} /> {cliente.email}
                  </span>
                  {(perfil?.telefono || cliente.telefono) && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280' }}>
                      <Phone size={12} /> {perfil?.telefono ?? cliente.telefono}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { logoutCliente(slug!); navigate(`/p/${slug}`) }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid #FCA5A5', background: 'rgba(239,68,68,0.05)', color: '#EF4444', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}
              >
                <LogOut size={12} /> Salir
              </button>
            </div>

            {/* Formulario de datos fiscales */}
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
              <PerfilForm
                slug={slug!}
                perfil={(perfil ?? cliente) as unknown as Record<string, string>}
                colorPrimario={colorPrimario}
              />
            </div>

            {/* 2FA */}
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', marginBottom: 14 }}>Seguridad — Verificación en dos pasos</p>
              {perfil && (
                <TwoFASection
                  slug={slug!}
                  colorPrimario={colorPrimario}
                  initialEnabled={(perfil as any).two_fa_enabled ?? false}
                  initialMethod={(perfil as any).two_fa_method ?? ''}
                />
              )}
            </div>

            <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
              {pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} realizados
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
