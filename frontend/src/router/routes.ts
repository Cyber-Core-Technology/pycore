export const ROUTES = {
  LOGIN:      '/login',
  DASHBOARD:  '/dashboard',

  // Operaciones
  VENTAS:     '/ventas',
  VENTA:      '/ventas/:id',
  COMPRAS:    '/compras',
  COMPRA:     '/compras/:id',

  // Inventario
  PRODUCTOS:       '/inventario',
  STOCK:           '/inventario/stock',
  MOVIMIENTOS:     '/inventario/movimientos',
  ALERTAS_STOCK:   '/inventario/alertas',

  // Terceros
  CLIENTES:    '/clientes',
  PROVEEDORES: '/proveedores',

  // Finanzas
  CXC:                '/finanzas/cxc',
  CXP:                '/finanzas/cxp',
  PAGOS_CLIENTES:     '/finanzas/pagos-clientes',
  PAGOS_PROVEEDORES:  '/finanzas/pagos-proveedores',
  GASTOS:             '/finanzas/gastos',
  TESORERIA:          '/finanzas/tesoreria',

  // RRHH
  COLABORADORES: '/rrhh/colaboradores',
  ASISTENCIAS:   '/rrhh/asistencias',

  // POS
  POS: '/pos',

  // Otros
  REPORTES:      '/reportes',
  CONFIGURACION: '/configuracion',
  PERFIL:        '/perfil',
  TEZCA:         '/tezca',

  // Configuración
  CONFIGURACION_USUARIOS:       '/configuracion/usuarios',
  CONFIGURACION_NOTIFICACIONES: '/configuracion/notificaciones',
  CONFIGURACION_CATALOGOS:      '/configuracion/catalogos',
  CONFIGURACION_EMPRESA:        '/configuracion/empresa',
  CONFIGURACION_SUCURSALES:     '/configuracion/sucursales',
  CONFIGURACION_SUSCRIPCION:    '/configuracion/suscripcion',
  CONFIGURACION_FACTURACION:    '/configuracion/facturacion',
  CONFIGURACION_PERSONALIZACION: '/configuracion/personalizacion',
  CONFIGURACION_ROLES:           '/configuracion/roles',
  MI_TIENDA:                    '/mi-tienda',

  // Storefront público (sin auth)
  STORE: '/p/:slug',

  // Auditoría (admin del negocio)
  AUDITORIA: '/auditoria',

  // Superadmin
  SUPERADMIN:        '/superadmin',
  SUPERADMIN_AUDIT:  '/superadmin/audit',

  // Legales (públicas)
  PRIVACIDAD:    '/privacidad',
  TERMINOS:      '/terminos',
  SIN_SUCURSAL:  '/sin-sucursal',
  REGISTRO:      '/registro',
} as const
