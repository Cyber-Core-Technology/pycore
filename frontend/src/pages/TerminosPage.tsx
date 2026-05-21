// frontend/src/pages/TerminosPage.tsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ArrowLeft } from 'lucide-react'

const FECHA_ACTUALIZACION = '29 de abril de 2026'
const RESPONSABLE = 'Cyber Core Technology S.A.S de C.V.'
const EMAIL_SOPORTE = 'scorpion@cyco.tech'
const EMAIL_LEGAL = 'scorpion@cyco.tech'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #E5E7EB' }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.8 }}>
        {children}
      </div>
    </section>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>
}

export function TerminosPage() {
  useEffect(() => { document.title = 'Términos de Uso — PyCore ERP' }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: 'var(--color-primary-text)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9CA3AF', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={15} /> Volver
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <FileText size={18} color="#10B981" />
          <span style={{ color: '#E6F2EE', fontWeight: 700, fontSize: 15 }}>PyCore ERP</span>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(16,185,129,0.1)', padding: '8px 20px', borderRadius: 100, marginBottom: 20 }}>
            <FileText size={16} color="#10B981" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>Términos y Condiciones de Uso</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#111827', margin: '0 0 12px', lineHeight: 1.2 }}>
            Términos de Uso
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>
            Última actualización: <strong>{FECHA_ACTUALIZACION}</strong>
          </p>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>
            Al acceder o utilizar PyCore ERP, usted acepta quedar vinculado por estos términos.
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '40px 48px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

          <Section title="I. Aceptación de los términos">
            <p>
              Al registrarse, acceder o utilizar la plataforma <strong>PyCore ERP</strong> operada por <strong>{RESPONSABLE}</strong> («CyCo.Tech», «nosotros»), usted acepta cumplir con estos Términos de Uso («Términos»). Si no está de acuerdo, no utilice la plataforma.
            </p>
            <p style={{ marginTop: 12 }}>
              Estos Términos aplican tanto a las <strong>empresas que contratan el servicio</strong> («Empresas Cliente») como a sus <strong>usuarios internos</strong> (administradores, vendedores, contadores, etc.) y a los <strong>clientes finales de tiendas en línea</strong> habilitadas por PyCore ERP («Storefront»).
            </p>
          </Section>

          <Section title="II. Descripción del servicio">
            <p style={{ marginBottom: 12 }}>PyCore ERP es una plataforma de software como servicio (SaaS) de gestión empresarial que incluye:</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Módulos de ventas, inventario, compras y gestión de proveedores</Li>
              <Li>Facturación electrónica (CFDI) mediante integración con el SAT</Li>
              <Li>Gestión de recursos humanos, asistencias y nómina</Li>
              <Li>Finanzas: cuentas por cobrar, cuentas por pagar, tesorería y gastos</Li>
              <Li>Tienda en línea (Storefront) con procesamiento de pagos vía Mercado Pago</Li>
              <Li>Reportes, estadísticas y dashboard en tiempo real</Li>
              <Li>Gestión multi-sucursal y multi-usuario con roles y permisos</Li>
            </ul>
          </Section>

          <Section title="III. Registro y cuentas de usuario">
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>Empresas Cliente:</p>
            <p style={{ marginBottom: 16 }}>
              El representante legal o administrador que registra la empresa declara tener facultades suficientes para vincularla a estos Términos. Es responsabilidad de la Empresa Cliente gestionar el acceso de sus usuarios y mantener la confidencialidad de las credenciales.
            </p>
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>Usuarios internos:</p>
            <p style={{ marginBottom: 16 }}>
              Las cuentas son de uso personal e intransferible. El usuario es responsable de toda actividad realizada bajo sus credenciales. Debe notificar de inmediato cualquier acceso no autorizado a <strong>{EMAIL_SOPORTE}</strong>.
            </p>
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>Clientes de Storefront:</p>
            <p>
              El correo electrónico utilizado en el registro debe ser válido y de su propiedad; se verificará mediante código OTP. Un correo puede vincularse a múltiples tiendas con cuentas independientes.
            </p>
          </Section>

          <Section title="IV. Uso permitido y restricciones">
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>Usted puede:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <Li>Utilizar la plataforma para gestionar operaciones comerciales legítimas</Li>
              <Li>Exportar sus propios datos en cualquier momento</Li>
              <Li>Personalizar la plataforma dentro de las opciones disponibles</Li>
            </ul>
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>Usted no puede:</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Intentar acceder a datos de otras empresas (violación de arquitectura multi-tenant)</Li>
              <Li>Realizar ingeniería inversa, descompilar o desensamblar la plataforma</Li>
              <Li>Usar la plataforma para actividades ilegales, fraudulentas o que violen derechos de terceros</Li>
              <Li>Compartir credenciales de acceso con personas no autorizadas</Li>
              <Li>Realizar ataques de fuerza bruta, inyección de código u otras técnicas de intrusión</Li>
              <Li>Sobrecargar deliberadamente la infraestructura del servicio</Li>
              <Li>Registrar cuentas de forma automatizada o masiva</Li>
            </ul>
          </Section>

          <Section title="V. Planes, pagos y facturación">
            <p style={{ marginBottom: 12 }}>
              PyCore ERP se ofrece bajo un modelo de suscripción mensual recurrente. El plan contratado por la Empresa Cliente determina el número de usuarios, sucursales y módulos disponibles.
            </p>
            <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
              <Li>Los pagos de suscripción son en moneda nacional (MXN) más IVA, salvo indicación contraria</Li>
              <Li>No se realizan reembolsos por períodos parciales, salvo disposición legal en contrario</Li>
              <Li>El impago puede resultar en la suspensión del servicio tras un período de gracia de 7 días</Li>
              <Li>Los datos se conservan durante 30 días adicionales tras la suspensión antes de ser eliminados definitivamente</Li>
            </ul>
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>Cobro automático domiciliado (cargo recurrente):</p>
            <p style={{ marginBottom: 10 }}>
              Al contratar cualquier plan de suscripción de PyCore ERP, usted <strong>autoriza expresamente a Stripe, Inc.</strong> a realizar cargos automáticos y recurrentes al método de pago registrado por el importe correspondiente al plan seleccionado, en cada fecha de renovación del período contratado (mensual), hasta que la suscripción sea cancelada.
            </p>
            <ul style={{ paddingLeft: 20, marginBottom: 10 }}>
              <Li>El primer cargo ocurre al momento de confirmar la suscripción en el portal de pago</Li>
              <Li>Los cargos subsecuentes se realizan automáticamente en la misma fecha cada mes, sin necesidad de acción adicional por parte del usuario</Li>
              <Li>En caso de que el cargo automático falle, Stripe reintentará el cobro de acuerdo con su política de reintentos. La suscripción puede pasar a estado <em>vencida</em> si el pago no se regulariza</Li>
              <Li>Recibirá un comprobante de pago por correo electrónico en cada cargo exitoso, emitido directamente por Stripe</Li>
            </ul>
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>Cancelación del cobro automático:</p>
            <p>
              Puede cancelar la renovación automática en cualquier momento desde la sección <strong>Configuración → Suscripción → "Gestionar pago / cancelar"</strong> dentro de la plataforma. La cancelación tiene efecto al término del período ya pagado; no genera reembolso por el tiempo restante. Una vez cancelada, no se realizarán cargos adicionales.
            </p>
          </Section>

          <Section title="VI. Procesamiento de pagos de suscripción (Stripe)">
            <p style={{ marginBottom: 12 }}>
              Los pagos de suscripción a PyCore ERP son procesados por <strong>Stripe, Inc.</strong>, un proveedor de servicios de pago certificado PCI DSS. Al ingresar sus datos de pago y confirmar la suscripción, usted:
            </p>
            <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
              <Li>Acepta los <a href="https://stripe.com/es-mx/legal/ssa" target="_blank" rel="noreferrer" style={{ color: '#059669' }}>Términos de Servicio de Stripe</a> y su <a href="https://stripe.com/es-mx/privacy" target="_blank" rel="noreferrer" style={{ color: '#059669' }}>Política de Privacidad</a></Li>
              <Li>Autoriza a Stripe a almacenar de forma segura su método de pago para realizar los cargos recurrentes descritos en la sección V</Li>
              <Li>Entiende que <strong>CyCo.Tech no almacena ni tiene acceso</strong> a los datos completos de su tarjeta de crédito o débito; dicha información es gestionada exclusivamente por Stripe bajo estándares PCI DSS nivel 1</Li>
              <Li>Acepta que las disputas, contracargos y reclamaciones relacionadas con el procesamiento del pago se gestionan a través de los mecanismos de Stripe y de la institución emisora de su tarjeta</Li>
            </ul>
            <p style={{ fontSize: 13, color: '#6B7280' }}>
              Para actualizar, cambiar o eliminar su método de pago, acceda al portal de Stripe desde <strong>Configuración → Suscripción → "Gestionar pago / cancelar"</strong> en la plataforma.
            </p>
          </Section>

          <Section title="VII. Propiedad intelectual">
            <p style={{ marginBottom: 12 }}>
              <strong>{RESPONSABLE}</strong> es titular de todos los derechos de propiedad intelectual sobre PyCore ERP, incluyendo su código fuente, diseño visual, logotipos, algoritmos y documentación. Nada en estos Términos se interpretará como una cesión de dichos derechos.
            </p>
            <p>
              Los datos ingresados por la Empresa Cliente (productos, clientes, transacciones, etc.) son de su propiedad exclusiva. CyCo.Tech actúa como encargado del tratamiento y no adquiere derechos sobre dichos datos.
            </p>
          </Section>

          <Section title="VIII. Procesamiento de pagos en tiendas (Mercado Pago)">
            <p style={{ marginBottom: 12 }}>
              Las tiendas en línea habilitadas mediante Storefront procesan pagos a través de <strong>Mercado Pago S.R.L.</strong>, un servicio de pago de terceros. Al realizar una compra en una tienda Storefront, usted:
            </p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Acepta los <a href="https://www.mercadopago.com.mx/ayuda/terminos-y-condiciones_299" target="_blank" rel="noreferrer" style={{ color: '#059669' }}>Términos y Condiciones de Mercado Pago</a></Li>
              <Li>Entiende que CyCo.Tech no almacena datos de tarjetas de crédito/débito</Li>
              <Li>Acepta que las disputas de pago se rigen por las políticas de Mercado Pago</Li>
            </ul>
            <p style={{ marginTop: 12, fontSize: 13, color: '#6B7280' }}>
              Cada tienda Storefront es operada de forma independiente por la Empresa Cliente. CyCo.Tech es el proveedor de la plataforma tecnológica, no el vendedor de los productos o servicios ofrecidos en dichas tiendas.
            </p>
          </Section>

          <Section title="IX. Disponibilidad y mantenimiento">
            <p style={{ marginBottom: 12 }}>
              Nos esforzamos por mantener una disponibilidad del servicio del 99.5% mensual. Sin embargo, no garantizamos disponibilidad ininterrumpida. La plataforma puede estar temporalmente no disponible por:
            </p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Mantenimiento programado (notificado con al menos 24 horas de anticipación)</Li>
              <Li>Actualizaciones de seguridad urgentes</Li>
              <Li>Causas de fuerza mayor (fallas de infraestructura de terceros, desastres naturales, etc.)</Li>
            </ul>
          </Section>

          <Section title="X. Limitación de responsabilidad">
            <p style={{ marginBottom: 12 }}>
              En la medida permitida por la ley aplicable, <strong>{RESPONSABLE}</strong> no será responsable por:
            </p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Pérdidas de negocio, lucro cesante o daños indirectos derivados del uso de la plataforma</Li>
              <Li>Errores en los datos ingresados por la Empresa Cliente o sus usuarios</Li>
              <Li>Incumplimientos fiscales derivados de una configuración incorrecta por parte del usuario</Li>
              <Li>Pérdida de datos causada por el usuario (eliminaciones, sobreescrituras)</Li>
              <Li>Interrupciones del servicio atribuibles a proveedores externos (nube, internet, Mercado Pago)</Li>
            </ul>
            <p style={{ marginTop: 12 }}>
              La responsabilidad máxima de CyCo.Tech por cualquier reclamación no excederá el monto pagado por la Empresa Cliente en los 3 meses previos al evento que originó la reclamación.
            </p>
          </Section>

          <Section title="XI. Terminación">
            <p style={{ marginBottom: 12 }}>
              <strong>Por parte de la Empresa Cliente:</strong> puede cancelar su suscripción en cualquier momento. Los datos permanecerán accesibles hasta el fin del período pagado y serán eliminados 30 días después.
            </p>
            <p>
              <strong>Por parte de CyCo.Tech:</strong> nos reservamos el derecho de suspender o cancelar cuentas que violen estos Términos, con notificación previa excepto en casos de actividad ilegal o fraude donde la suspensión puede ser inmediata.
            </p>
          </Section>

          <Section title="XII. Modificaciones">
            <p>
              Podemos modificar estos Términos en cualquier momento. Los cambios sustanciales serán notificados con al menos <strong>15 días de anticipación</strong> por correo electrónico y mediante aviso en la plataforma. El uso continuado del servicio tras la entrada en vigor de los cambios constituye aceptación de los nuevos Términos.
            </p>
          </Section>

          <Section title="XIII. Legislación aplicable">
            <p>
              Estos Términos se rigen por las leyes de los <strong>Estados Unidos Mexicanos</strong>. Para cualquier controversia, las partes se someten a la jurisdicción de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles por razón de su domicilio presente o futuro.
            </p>
          </Section>

          <Section title="XIV. Contacto">
            <p>
              Para consultas sobre estos Términos o el servicio en general:
            </p>
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              <Li><strong>Soporte técnico:</strong> {EMAIL_SOPORTE}</Li>
              <Li><strong>Asuntos legales:</strong> {EMAIL_LEGAL}</Li>
              <Li><strong>Aviso de Privacidad:</strong> <Link to="/privacidad" style={{ color: '#059669' }}>/privacidad</Link></Li>
            </ul>
          </Section>

          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '16px 20px', marginTop: 24, fontSize: 13, color: '#14532D' }}>
            <strong>Contacto legal:</strong> {EMAIL_LEGAL} &nbsp;|&nbsp; <strong>Versión:</strong> {FECHA_ACTUALIZACION}
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '24px 16px', borderTop: '1px solid #E5E7EB', fontSize: 12, color: '#9CA3AF' }}>
        © {new Date().getFullYear()} CyCo.Tech · PyCore ERP &nbsp;·&nbsp;
        <Link to="/privacidad" style={{ color: '#6B7280', textDecoration: 'none' }}>Aviso de Privacidad</Link>
      </footer>
    </div>
  )
}
