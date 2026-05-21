// frontend/src/pages/PrivacidadPage.tsx
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, ArrowLeft } from 'lucide-react'

const FECHA_ACTUALIZACION = '21 de marzo de 2026'
const RESPONSABLE = 'Cyber Core Technology S.A.S de C.V.'
const EMAIL_PRIVACIDAD = 'scorpion@cyco.tech'
const DOMICILIO = 'México'

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

export function PrivacidadPage() {
  useEffect(() => { document.title = 'Aviso de Privacidad — PyCore ERP' }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ background: 'var(--color-primary-text)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9CA3AF', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={15} /> Volver
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <Shield size={18} color="#10B981" />
          <span style={{ color: '#E6F2EE', fontWeight: 700, fontSize: 15 }}>PyCore ERP</span>
        </div>
      </header>

      <main style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(16,185,129,0.1)', padding: '8px 20px', borderRadius: 100, marginBottom: 20 }}>
            <Shield size={16} color="#10B981" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>Aviso de Privacidad Integral</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#111827', margin: '0 0 12px', lineHeight: 1.2 }}>
            Aviso de Privacidad
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280' }}>
            Última actualización: <strong>{FECHA_ACTUALIZACION}</strong>
          </p>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>
            Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '40px 48px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

          <Section title="I. Identidad y domicilio del Responsable">
            <p>
              <strong>{RESPONSABLE}</strong> ("PyCore ERP", "nosotros" o "la Plataforma"), con domicilio en <strong>{DOMICILIO}</strong>, es el Responsable del tratamiento de sus datos personales en los términos de la LFPDPPP y su Reglamento.
            </p>
            <p style={{ marginTop: 12 }}>
              Para cualquier consulta o ejercicio de derechos relacionados con sus datos personales, puede contactarnos en: <strong>{EMAIL_PRIVACIDAD}</strong>
            </p>
          </Section>

          <Section title="II. Datos personales que recabamos">
            <p style={{ marginBottom: 12 }}>Dependiendo de su rol en la plataforma, recabamos las siguientes categorías de datos personales:</p>

            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>A. Usuarios del sistema ERP (empleados y administradores)</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <Li>Identificación: nombre completo, correo electrónico, nombre de usuario</Li>
              <Li>Contacto: número de teléfono</Li>
              <Li>Acceso: contraseña cifrada, historial de inicio de sesión, intentos fallidos</Li>
              <Li>Laborales: rol dentro del sistema, jefe directo, empresa y sucursal asignada</Li>
              <Li>Preferencias técnicas: idioma, zona horaria, tema de interfaz</Li>
            </ul>

            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>B. Empresas que contratan PyCore ERP</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <Li>Identidad fiscal: razón social, nombre comercial, RFC, régimen fiscal</Li>
              <Li>Contacto: correo electrónico, teléfono, dirección fiscal y de sucursales</Li>
              <Li>Operativos: plan contratado, logotipo, tipo de negocio</Li>
            </ul>

            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>C. Colaboradores / empleados registrados en RRHH</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <Li><strong>Datos sensibles:</strong> CURP, RFC, Número de Seguridad Social (NSS), fecha de nacimiento</Li>
              <Li>Identificación: nombre completo, correo de trabajo, teléfono</Li>
              <Li>Laborales: puesto, departamento, tipo de contrato, salario diario, fechas de ingreso y baja, estado laboral</Li>
              <Li>Asistencia: registros de entrada y salida, estado de puntualidad</Li>
            </ul>

            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>D. Clientes y proveedores registrados en el ERP</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <Li>Identidad: nombre o razón social, RFC, tipo de persona (física o moral)</Li>
              <Li>Contacto: correo electrónico, teléfono, celular, domicilio completo</Li>
              <Li>Comerciales: crédito disponible, límite de crédito, historial de transacciones</Li>
            </ul>

            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>E. Clientes de tiendas en línea (Storefront)</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <Li>Identificación: nombre, correo electrónico, número de teléfono (opcional)</Li>
              <Li>Autenticación: contraseña cifrada, tokens de sesión</Li>
              <Li>Pedidos: historial de compras, notas del cliente, método de pago seleccionado</Li>
              <Li>Consentimiento: fecha y hora de aceptación del aviso de privacidad</Li>
            </ul>

            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>F. Datos financieros</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Cuentas bancarias: nombre del banco, número de cuenta, CLABE interbancaria</Li>
              <Li>Transacciones: ventas, compras, gastos, pagos (montos, métodos, fechas)</Li>
              <Li>Procesamiento de pagos: identificadores de Mercado Pago asociados a pedidos</Li>
            </ul>
          </Section>

          <Section title="III. Finalidades del tratamiento">
            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>Finalidades primarias (necesarias para la prestación del servicio):</p>
            <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
              <Li>Crear y gestionar su cuenta de acceso al sistema ERP o a la tienda en línea</Li>
              <Li>Procesar ventas, compras, inventario, gastos y demás operaciones comerciales</Li>
              <Li>Gestión de nómina, asistencias y recursos humanos</Li>
              <Li>Facturación electrónica y cumplimiento de obligaciones fiscales</Li>
              <Li>Procesamiento de pagos a través de Mercado Pago</Li>
              <Li>Envío de notificaciones transaccionales (confirmaciones de pedido, tickets)</Li>
              <Li>Verificación de identidad mediante código OTP enviado al correo electrónico</Li>
              <Li>Soporte técnico y atención al cliente</Li>
            </ul>

            <p style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>Finalidades secundarias (puede oponerse a ellas):</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Envío de comunicaciones sobre actualizaciones, nuevas funciones y mejoras de la plataforma</Li>
              <Li>Análisis estadístico agregado para mejora del servicio</Li>
              <Li>Contacto para encuestas de satisfacción</Li>
            </ul>
            <p style={{ marginTop: 10, fontSize: 13, color: '#6B7280' }}>
              Para oponerse a las finalidades secundarias, envíe un correo a <strong>{EMAIL_PRIVACIDAD}</strong> con el asunto "Oposición a finalidades secundarias".
            </p>
          </Section>

          <Section title="IV. Transferencias de datos personales">
            <p style={{ marginBottom: 12 }}>Sus datos personales pueden ser compartidos con las siguientes categorías de terceros:</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li><strong>Mercado Pago S.R.L.:</strong> para el procesamiento de pagos en línea a través de las tiendas habilitadas. Aplica su propia política de privacidad.</Li>
              <Li><strong>Proveedores de infraestructura:</strong> servicios de alojamiento en la nube y bases de datos, bajo acuerdos de confidencialidad, únicamente para la prestación del servicio.</Li>
              <Li><strong>Autoridades fiscales y regulatorias:</strong> cuando sea requerido por ley (SAT, IMSS, INFONAVIT).</Li>
            </ul>
            <p style={{ marginTop: 12, fontSize: 13, color: '#6B7280' }}>
              No vendemos, rentamos ni comercializamos sus datos personales con terceros para fines publicitarios o de mercadotecnia.
            </p>
          </Section>

          <Section title="V. Derechos ARCO">
            <p style={{ marginBottom: 12 }}>
              Usted tiene derecho a <strong>Acceder</strong>, <strong>Rectificar</strong>, <strong>Cancelar</strong> u <strong>Oponerse</strong> al tratamiento de sus datos personales (derechos ARCO), así como a revocar el consentimiento otorgado.
            </p>
            <p style={{ marginBottom: 12 }}>Para ejercer sus derechos, envíe una solicitud a <strong>{EMAIL_PRIVACIDAD}</strong> indicando:</p>
            <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
              <Li>Nombre completo y correo electrónico registrado</Li>
              <Li>Descripción clara del derecho que desea ejercer</Li>
              <Li>Copia de identificación oficial</Li>
            </ul>
            <p>
              Daremos respuesta dentro de los <strong>20 días hábiles</strong> siguientes a la recepción de su solicitud, conforme a lo dispuesto en el Artículo 32 de la LFPDPPP.
            </p>
          </Section>

          <Section title="VI. Uso de cookies y tecnologías de seguimiento">
            <p style={{ marginBottom: 12 }}>La plataforma utiliza las siguientes tecnologías de almacenamiento local en su dispositivo:</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li><strong>Tokens de autenticación JWT</strong> (<code>pycore_access</code>, <code>pycore_refresh</code>): necesarios para mantener su sesión activa. Se almacenan en <code>localStorage</code> del navegador.</Li>
              <Li><strong>Estado de sesión</strong> (<code>pycore_auth</code>): guarda localmente su información de perfil y sucursal activa para mostrar la interfaz sin necesidad de consultas adicionales al servidor.</Li>
              <Li><strong>Preferencias</strong> (<code>pycore_theme</code>): guarda su preferencia de tema visual (claro/oscuro).</Li>
              <Li><strong>Sesión de tienda</strong> (<code>sf_access_[tienda]</code>, <code>sf_refresh_[tienda]</code>): tokens de autenticación específicos para cada tienda en línea en la que usted se registre.</Li>
            </ul>
            <p style={{ marginTop: 12, fontSize: 13, color: '#6B7280' }}>
              Estos datos se eliminan automáticamente al cerrar sesión o al limpiar el almacenamiento local de su navegador.
              La plataforma <strong>no utiliza cookies de rastreo publicitario</strong> ni comparte datos de navegación con redes publicitarias.
            </p>
          </Section>

          <Section title="VII. Medidas de seguridad">
            <p style={{ marginBottom: 12 }}>Implementamos medidas técnicas y organizativas para proteger sus datos personales, entre las que se incluyen:</p>
            <ul style={{ paddingLeft: 20 }}>
              <Li>Cifrado de contraseñas mediante algoritmos de hashing seguros (PBKDF2)</Li>
              <Li>Comunicaciones cifradas mediante HTTPS/TLS</Li>
              <Li>Autenticación mediante tokens JWT con tiempo de expiración</Li>
              <Li>Aislamiento de datos por empresa (arquitectura multi-tenant)</Li>
              <Li>Bloqueo temporal de cuentas ante intentos de acceso fallidos reiterados</Li>
              <Li>Cierre automático de sesión por inactividad (30 minutos)</Li>
              <Li>Verificación de correo electrónico mediante código OTP para nuevos registros</Li>
              <Li>Protección contra bots mediante honeypot y límite de intentos por hora</Li>
            </ul>
          </Section>

          <Section title="VIII. Datos sensibles">
            <p>
              En el módulo de Recursos Humanos, se recaban datos considerados sensibles bajo la LFPDPPP: <strong>CURP, RFC y Número de Seguridad Social</strong> de los colaboradores. Estos datos son tratados exclusivamente para el cumplimiento de obligaciones laborales y fiscales (IMSS, INFONAVIT, SAT) y requieren su consentimiento expreso al momento del registro.
            </p>
          </Section>

          <Section title="IX. Plazo de conservación">
            <p>
              Sus datos personales serán conservados durante el tiempo que dure la relación comercial o de prestación de servicios y, posteriormente, durante los plazos que exijan las disposiciones fiscales y legales aplicables en México (generalmente 5 años para documentos fiscales y hasta 10 años para documentos laborales).
            </p>
          </Section>

          <Section title="X. Cambios al aviso de privacidad">
            <p>
              Nos reservamos el derecho de modificar el presente aviso de privacidad en cualquier momento. Cualquier cambio será notificado a través de la plataforma y/o por correo electrónico a la dirección registrada. La versión actualizada estará siempre disponible en <strong>/privacidad</strong>.
            </p>
          </Section>

          <Section title="XI. Autoridad de protección de datos">
            <p>
              Si considera que su derecho de protección de datos personales ha sido vulnerado, puede acudir ante el <strong>Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI)</strong> para presentar su denuncia en <a href="https://home.inai.org.mx" target="_blank" rel="noreferrer" style={{ color: '#059669' }}>www.inai.org.mx</a>.
            </p>
          </Section>

          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '16px 20px', marginTop: 24, fontSize: 13, color: '#14532D' }}>
            <strong>Contacto:</strong> {EMAIL_PRIVACIDAD} &nbsp;|&nbsp; <strong>Versión:</strong> {FECHA_ACTUALIZACION}
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '24px 16px', borderTop: '1px solid #E5E7EB', fontSize: 12, color: '#9CA3AF' }}>
        © {new Date().getFullYear()} CyCo.Tech · PyCore ERP &nbsp;·&nbsp;
        <Link to="/terminos" style={{ color: '#6B7280', textDecoration: 'none' }}>Términos de uso</Link>
      </footer>
    </div>
  )
}
