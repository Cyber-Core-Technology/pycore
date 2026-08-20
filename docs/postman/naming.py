# -*- coding: utf-8 -*-
# Diccionarios de nomenclatura en espanol para la coleccion Postman.

# Sustantivo legible por segmento de ruta (singular/plural segun corresponda)
NOUN = {
 '2fa':'2FA','admin':'administración','agentes':'agentes','ajuste':'ajuste de inventario',
 'alertas':'alertas','aplicar':'aplicación','arbol':'árbol','asignar':'asignación',
 'asistencias':'asistencias','audit':'auditoría','authenticate':'autenticación biométrica',
 'badge':'contador','baja':'baja de marketing','banner':'banner','billing':'facturación SaaS',
 'biometric':'biometría','broadcast':'difusión','buscar':'búsqueda',
 'buscar-barcode':'búsqueda por código de barras','buscar-imagenes':'búsqueda de imágenes',
 'cambiar-estado':'estado','cancelar':'cancelación','catalogo':'catálogo','catalogos':'catálogos',
 'catalogs':'catálogos','categorias':'categorías','cerrar':'cierre','cfdis':'CFDI','challenge':'reto biométrico',
 'check-slug':'disponibilidad de slug','checkout':'checkout','clientes':'clientes','colaboradores':'colaboradores',
 'compras':'compras','comprobantes':'comprobantes','config':'configuración','configuracion':'configuración',
 'configuraciones':'configuraciones','confirm':'confirmación','confirmar':'confirmación','consultar':'consulta',
 'consumos':'consumos','conversaciones':'conversaciones','core':'núcleo','crear':'creación',
 'crear-con-inventario':'producto con inventario','cuentas-bancarias':'cuentas bancarias','cupon':'cupón',
 'cupones':'cupones','cxc':'cuentas por cobrar','cxp':'cuentas por pagar','dashboard':'dashboard',
 'desactivar':'desactivación','descargar':'descarga','desde-compra':'desde compra','desde-venta':'desde venta',
 'devoluciones':'devoluciones','devolver':'devolución','disable':'desactivación','eliminar-variante':'variante',
 'empresas':'empresas','enable':'activación','entrada':'entrada de inventario','enviar-codigo':'código de verificación',
 'enviar-ticket':'ticket por correo','estado':'estado','evaluar':'evaluación','expediente':'expediente',
 'extender':'extensión','factura':'factura','facturacion':'facturación','faqs':'preguntas frecuentes',
 'fcm-token':'token FCM','finalize':'registro','finance':'finanzas','forma-pago':'formas de pago','foto':'foto',
 'galeria':'galería','gastos':'gastos','generar-imagenes':'generación de imágenes','google':'Google',
 'hr':'recursos humanos','imagen':'imagen','imagen-desde-url':'imagen desde URL','importar':'importación',
 'impuestos':'impuestos','insights':'insights','insignias':'insignias','inventario':'inventario',
 'inventory':'inventario','leer':'lectura','logs':'bitácora','login':'sesión','logout':'sesión',
 'marcar-todas-leidas':'todas como leídas','me':'mi perfil','metrics':'métricas','mis-modulos':'mis módulos',
 'mis-planes':'mis planes','movimientos':'movimientos','mp':'Mercado Pago','no-leidas':'no leídas',
 'notificaciones':'notificaciones','oferta':'oferta','pagos':'pagos','pagos-clientes':'pagos de clientes',
 'pagos-proveedores':'pagos a proveedores','password':'contraseña','password-reset':'restablecer contraseña',
 'pausar':'pausa','pedidos':'pedidos','planes':'planes','plantilla-importacion':'plantilla de importación',
 'poll':'sondeo','portal':'portal de cliente','presets':'presets','preview':'vista previa',
 'preview-branch':'vista previa de sucursal','preview-cobro':'previsualización de cobro',
 'previsualizar-importacion':'previsualización de importación','produccion':'órdenes de producción',
 'productos':'productos','progreso-imagenes':'progreso de imágenes','promociones':'promociones',
 'proveedores':'proveedores','provision':'aprovisionamiento','pull':'descarga de cambios','purchases':'compras',
 'push':'push','reanudar':'reanudación','receta':'receta','recibir':'recepción','recomendaciones':'recomendaciones',
 'recomendar':'recomendaciones','recursos':'recursos','refresh':'token','regimen-fiscal':'regímenes fiscales',
 'register':'registro','registro':'registro','reportes':'reportes','resend':'reenvío','responder':'respuesta',
 'resultado':'resultado','resumen-dia':'resumen del día','revoke':'revocación','roles':'roles','sales':'ventas',
 'scan-session':'sesión de escaneo','servicios':'servicios','sesiones':'sesiones','setup':'configuración',
 'status':'estado','store':'tienda','storefront':'tienda en línea','subir-csd':'CSD','subscribe':'suscripción push',
 'suscripcion':'suscripción','sucursales':'sucursales','support':'soporte','sync':'sincronización','tablero':'tablero',
 'tarifarios':'tarifarios','tema':'tema visual','terceros':'terceros','tezca':'TEZCA','ticket':'ticket',
 'tickets':'tickets','token':'token','unidades-medida':'unidades de medida','url-descarga':'URL de descarga',
 'uso-cfdi':'usos de CFDI','usuarios':'usuarios','vapid-key':'llave VAPID','variantes':'variantes',
 'ventas':'ventas','verificar':'verificación','verify':'verificación','verify-session':'sesión',
 'webhook':'webhook','empresa':'empresa',
}

# Nombre completo fijo para rutas concretas: (clave_de_ruta, METODO) -> nombre
# clave_de_ruta = app + segmentos, con :param
EXACT = {
 ('auth/login','POST'):'Iniciar sesión',
 ('auth/logout','POST'):'Cerrar sesión',
 ('auth/token/refresh','POST'):'Refrescar access token',
 ('auth/register','POST'):'Registrar empresa (paso 1)',
 ('auth/register/finalize','POST'):'Finalizar registro (paso 2)',
 ('auth/me','GET'):'Ver mi perfil',
 ('auth/me','PATCH'):'Editar mi perfil',
 ('auth/me/password','POST'):'Cambiar mi contraseña',
 ('auth/me/foto','POST'):'Subir mi foto de perfil',
 ('auth/me/foto','DELETE'):'Quitar mi foto de perfil',
 ('auth/me/sucursales','GET'):'Ver mis sucursales asignadas',
 ('auth/me/2fa/setup','POST'):'Iniciar configuración de 2FA',
 ('auth/me/2fa/enable','POST'):'Activar 2FA',
 ('auth/me/2fa/disable','POST'):'Desactivar 2FA',
 ('auth/2fa/verify','POST'):'Verificar código 2FA (completa el login)',
 ('auth/2fa/resend','POST'):'Reenviar código 2FA por correo',
 ('auth/biometric/challenge','GET'):'Pedir reto biométrico',
 ('auth/biometric/register','POST'):'Registrar dispositivo biométrico',
 ('auth/biometric/authenticate','POST'):'Login biométrico',
 ('auth/biometric/revoke','DELETE'):'Revocar dispositivo biométrico',
 ('auth/password-reset','POST'):'Solicitar restablecer contraseña',
 ('auth/password-reset/confirm','POST'):'Confirmar nueva contraseña',
 ('core/empresas/provision','POST'):'Aprovisionar empresa (superadmin)',
 ('core/empresas/:pk/configuracion','PATCH'):'Editar configuración de la empresa',
 ('core/tema','GET'):'Ver tema visual',
 ('core/tema','PUT'):'Guardar tema visual',
 ('billing/webhook','POST'):'Webhook de Stripe',
 ('store/mp/webhook','POST'):'Webhook de Mercado Pago',
 ('billing/portal','POST'):'Abrir portal de cliente de Stripe',
 ('billing/checkout','POST'):'Crear sesión de checkout',
 ('notificaciones/marcar-todas-leidas','POST'):'Marcar todas como leídas',
 ('sync/pull','GET'):'Descargar cambios (pull)',
 ('sync/push','POST'):'Subir cambios (push)',
}

# Verbo por metodo HTTP cuando la ruta es un recurso REST
REST_VERB = {'GET':'Listar','POST':'Crear','PUT':'Reemplazar','PATCH':'Editar','DELETE':'Eliminar'}
DETAIL_VERB = {'GET':'Obtener','PUT':'Reemplazar','PATCH':'Editar','DELETE':'Eliminar','POST':'Crear en'}

# Segmentos que son acciones (verbos), no recursos
ACTION_SEGS = {
 'cancelar':'Cancelar','confirmar':'Confirmar','confirm':'Confirmar','aplicar':'Aplicar','asignar':'Asignar',
 'cerrar':'Cerrar','pausar':'Pausar','reanudar':'Reanudar','extender':'Extender','devolver':'Devolver',
 'desactivar':'Desactivar','leer':'Marcar como leída','enable':'Activar','disable':'Desactivar',
 'setup':'Configurar','verify':'Verificar','verificar':'Verificar','resend':'Reenviar','revoke':'Revocar',
 'authenticate':'Autenticar','importar':'Importar','descargar':'Descargar','recibir':'Recibir',
 'evaluar':'Evaluar','consultar':'Consultar','recomendar':'Generar','responder':'Responder',
 'subscribe':'Suscribir','crear':'Crear','buscar':'Buscar','enviar-ticket':'Enviar por correo',
 'enviar-codigo':'Enviar código a','subir-csd':'Subir CSD de','cambiar-estado':'Cambiar estado de',
 'marcar-todas-leidas':'Marcar todas como leídas','provision':'Aprovisionar','finalize':'Finalizar',
 'previsualizar-importacion':'Previsualizar importación de','generar-imagenes':'Generar imágenes de',
 'buscar-imagenes':'Buscar imágenes de','buscar-barcode':'Buscar por código de barras',
 'imagen-desde-url':'Cargar imagen desde URL de','eliminar-variante':'Eliminar variante de',
 'crear-con-inventario':'Crear con inventario inicial','check-slug':'Verificar disponibilidad de slug',
}

# Subcarpetas por app: primer segmento estatico -> nombre de subcarpeta
SUBFOLDER = {
 'auth': {
  'login':'Sesión','logout':'Sesión','token':'Sesión','register':'Registro','registro':'Registro',
  'me':'Mi perfil','2fa':'2FA','biometric':'Biometría','password-reset':'Contraseña',
 },
 'store': {
  'auth':'Clientes · Autenticación','pedidos':'Pedidos','compras':'Compras de mostrador',
  'catalogo':'Catálogo por sucursal','productos':'Catálogo (legacy)','sucursales':'Sucursales',
  'baja':'Marketing','mp':'Webhooks',
 },
 'billing': {'webhook':'Webhooks','planes':'Planes','cupones':'Cupones'},
}

# Segmentos que representan colecciones (GET sin id => "Listar")
PLURAL = {
 'empresas','sucursales','usuarios','roles','categorias','clientes','proveedores','productos',
 'variantes','movimientos','alertas','compras','ventas','devoluciones','promociones','sesiones',
 'tarifarios','recursos','consumos','cxc','cxp','pagos','gastos','cuentas-bancarias','comprobantes',
 'colaboradores','asistencias','insignias','insights','recomendaciones','cfdis','notificaciones',
 'pedidos','planes','cupones','tickets','faqs','conversaciones','agentes','logs','catalogos',
 'impuestos','unidades-medida','configuraciones','presets','tarifas','produccion','pagos-clientes',
 'pagos-proveedores','regimen-fiscal','uso-cfdi','forma-pago','mis-planes','mis-modulos','no-leidas',
 'reportes','galeria','recetas','almacenes','ordenes','sesiones','servicios','asistencia',
}

# Singular explícito (el español no se singulariza con regex)
SINGULAR = {
 'empresas':'empresa','sucursales':'sucursal','usuarios':'usuario','roles':'rol','categorias':'categoría',
 'clientes':'cliente','proveedores':'proveedor','productos':'producto','variantes':'variante',
 'movimientos':'movimiento','alertas':'alerta','compras':'compra','ventas':'venta',
 'devoluciones':'devolución','promociones':'promoción','sesiones':'sesión','tarifarios':'tarifario',
 'recursos':'recurso','consumos':'consumo','pagos':'pago','gastos':'gasto',
 'comprobantes':'comprobante','colaboradores':'colaborador','asistencias':'asistencia',
 'insignias':'insignia','insights':'insight','recomendaciones':'recomendación','cfdis':'CFDI',
 'notificaciones':'notificación','pedidos':'pedido','planes':'plan','cupones':'cupón',
 'tickets':'ticket','faqs':'FAQ','conversaciones':'conversación','agentes':'agente',
 'catalogos':'catálogo','impuestos':'impuesto','configuraciones':'configuración',
 'órdenes de producción':'orden de producción','cuentas por cobrar':'cuenta por cobrar',
 'cuentas por pagar':'cuenta por pagar','cuentas bancarias':'cuenta bancaria',
 'productos':'producto','recetas':'receta','sesión de escaneo':'sesión de escaneo',
 'preguntas frecuentes':'pregunta frecuente','catálogo':'catálogo','tienda':'tienda',
}

EXACT.update({
 ('inventory/productos/buscar-barcode','GET'):'Buscar producto por código de barras',
 ('inventory/productos/crear-con-inventario','POST'):'Crear producto con inventario inicial',
 ('inventory/productos/importar','POST'):'Importar productos (CSV)',
 ('inventory/productos/previsualizar-importacion','POST'):'Previsualizar importación de productos',
 ('inventory/productos/plantilla-importacion','GET'):'Descargar plantilla de importación',
 ('inventory/productos/:pk/buscar-imagenes','GET'):'Buscar imágenes para el producto',
 ('inventory/productos/:pk/generar-imagenes','POST'):'Generar imágenes con IA',
 ('inventory/productos/:pk/progreso-imagenes','GET'):'Ver progreso de generación de imágenes',
 ('inventory/productos/:pk/imagen-desde-url','POST'):'Cargar imagen desde URL',
 ('inventory/inventario/ajuste','POST'):'Registrar ajuste de inventario',
 ('inventory/inventario/entrada','POST'):'Registrar entrada de inventario',
 ('inventory/inventario/alertas','GET'):'Listar alertas de stock',
 ('sales/ventas/:pk/enviar-ticket','POST'):'Enviar ticket de venta por correo',
 ('sales/ventas/:pk/factura','POST'):'Facturar venta (emitir CFDI)',
 ('sales/ventas/:pk/devolver','POST'):'Registrar devolución de la venta',
 ('sales/ventas/dashboard','GET'):'Ver dashboard de ventas',
 ('sales/ventas/reportes','GET'):'Ver reportes de ventas',
 ('sales/promociones/buscar','GET'):'Buscar promociones aplicables',
 ('sales/promociones/evaluar','POST'):'Evaluar promociones para un carrito',
 ('servicios/presets/aplicar','POST'):'Aplicar preset de servicio',
 ('servicios/recursos/tablero','GET'):'Ver tablero de recursos',
 ('servicios/sesiones/:pk/preview-cobro','GET'):'Previsualizar cobro de la sesión',
 ('store/baja/:token','GET'):'Ver estado de baja de marketing',
 ('store/baja/:token','POST'):'Confirmar baja de marketing',
 ('store','GET'):'Ver home de la tienda',
 ('store/auth/enviar-codigo','POST'):'Enviar código de verificación al cliente',
 ('store/auth/google','POST'):'Login del cliente con Google',
 ('store/auth/refresh','POST'):'Refrescar token del cliente',
 ('store/auth/registro','POST'):'Registrar cliente',
 ('store/auth/login','POST'):'Login del cliente',
 ('store/catalogo','GET'):'Listar catálogo de la sucursal',
 ('store/catalogo/verificar','GET'):'Verificar disponibilidad del carrito',
 ('store/catalogo/:producto_slug','GET'):'Ver producto del catálogo',
 ('store/compras/:id_venta/ticket','GET'):'Ver ticket de compra',
 ('inventory/scan-session/poll','GET'):'Sondear sesión de escaneo',
 ('inventory/scan-session/resultado','POST'):'Enviar resultado del escaneo',
 ('inventory/scan-session','POST'):'Abrir sesión de escaneo',
})

# Query params obligatorios: (clave_de_ruta, METODO) -> {param: (valor, descripcion)}
REQUIRED_QS = {
 ('auth/biometric/challenge','GET'): {'device_id': ('{{device_id}}', 'Obligatorio. Identificador del dispositivo registrado.')},
 ('inventory/productos/buscar-barcode','GET'): {'codigo': ('', 'Obligatorio. Código de barras a buscar.')},
 ('sales/promociones/buscar','GET'): {'codigo': ('', 'Obligatorio. Código de la promoción/cupón.')},
 ('sync/pull','GET'): {'sucursal_id': ('{{sucursal_id}}', 'Obligatorio. Sucursal de la que se descargan cambios.')},
 ('store/catalogo/verificar','GET'): {'sucursal': ('{{sucursal_id}}', 'Obligatorio. Sucursal del catálogo.')},
 ('store/catalogo','GET'): {'sucursal': ('{{sucursal_id}}', 'Sucursal del catálogo.')},
}

EXACT.update({
 ('facturacion/cfdis/catalogos/forma-pago','GET'):'Listar formas de pago (SAT)',
 ('facturacion/cfdis/catalogos/regimen-fiscal','GET'):'Listar regímenes fiscales (SAT)',
 ('facturacion/cfdis/catalogos/uso-cfdi','GET'):'Listar usos de CFDI (SAT)',
 ('facturacion/cfdis/configuracion','GET'):'Ver configuración de facturación',
 ('facturacion/cfdis/configuracion','PATCH'):'Editar configuración de facturación',
 ('billing/cupones/config','GET'):'Ver configuración de cupones',
 ('billing/planes/admin','GET'):'Listar planes (superadmin)',
 ('billing/planes/admin/:pk','PATCH'):'Editar plan (superadmin)',
 ('billing/tarifarios/planes','GET'):'Listar planes del tarifario',
 ('storefront/config/check-slug','GET'):'Verificar disponibilidad del slug',
 ('storefront/config/preview','GET'):'Vista previa de la tienda',
 ('storefront/config','GET'):'Ver configuración de la tienda',
 ('storefront/config','PATCH'):'Editar configuración de la tienda',
 ('support/metrics','GET'):'Ver métricas de soporte',
 ('support/agentes','GET'):'Listar agentes de soporte',
})

# Normaliza nombres de variable de ruta que quedan feos o duplicados
PARAM_ALIAS = {
 'producto_pk':'producto_id', 'venta_pk':'venta_id',
 'cuentas_bancarias_id':'cuenta_bancaria_id',
 'cuentas_por_cobrar_id':'cxc_id', 'cuentas_por_pagar_id':'cxp_id',
 'ordenes_de_produccion_id':'orden_produccion_id',
 'orden_de_produccion_id':'orden_produccion_id',
 'id_venta':'venta_id',
 'unidades_de_medida_id':'unidad_medida_id',
 'sesion_de_escaneo_id':'scan_session_id',
 'administracion_id':'plan_id',
 'codigo':'cupon_codigo',
 'preguntas_frecuentes_id':'faq_id',
}
