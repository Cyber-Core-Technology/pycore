import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ProtectedRoute }  from './ProtectedRoute'
import { SuperAdminRoute } from './SuperAdminRoute'
import { MainLayout }      from '@/components/layout/MainLayout'
import { SuperAdminLayout } from '@/features/superadmin/SuperAdminLayout/SuperAdminLayout'
import { Login }           from '@/features/auth/Login/Login'
import { Dashboard }       from '@/features/dashboard/Dashboard'
import { SalesList }       from '@/features/sales/SalesList/SalesList'
import { PurchasesList }   from '@/features/purchases/PurchasesList/PurchasesList'
import { InventoryList }   from '@/features/inventory/InventoryList/InventoryList'
import { ClientesList }    from '@/features/clientes/ClientesList/ClientesList'
import { ProveedoresList } from '@/features/proveedores/ProveedoresList/ProveedoresList'
import { TesoreriaList }   from '@/features/tesoreria/TesoreriaList/TesoreriaList'
import { CxCList }         from '@/features/cxc/CxCList/CxCList'
import { CxPList }         from '@/features/cxp/CxPList/CxPList'
import { GastosList }      from '@/features/gastos/GastosList/GastosList'
import { ColaboradoresList } from '@/features/rrhh/ColaboradoresList/ColaboradoresList'
import { AsistenciasList }   from '@/features/rrhh/AsistenciasList/AsistenciasList'
import { ReportesPage }      from '@/features/reportes/ReportesPage/ReportesPage'
import { EmpresasList as AdminEmpresasList }    from '@/features/superadmin/EmpresasList/EmpresasList'
import { AuditoriaGlobalPage }                  from '@/features/superadmin/AuditoriaGlobalPage/AuditoriaGlobalPage'
import { AuditoriaPage }                        from '@/features/auditoria/AuditoriaPage/AuditoriaPage'
import { UsuariosPage }            from '@/features/configuracion/UsuariosPage/UsuariosPage'
import { NotificacionesAdminPage } from '@/features/configuracion/NotificacionesAdminPage/NotificacionesAdminPage'
import { ConfiguracionHub }        from '@/features/configuracion/ConfiguracionHub/ConfiguracionHub'
import { CatalogosPage }           from '@/features/configuracion/CatalogosPage/CatalogosPage'
import { EmpresaConfigPage }       from '@/features/configuracion/EmpresaConfigPage/EmpresaConfigPage'
import { SucursalesPage }          from '@/features/configuracion/SucursalesPage/SucursalesPage'
import { CfdiListPage }           from '@/features/facturacion/CfdiListPage/CfdiListPage'
import { MiTiendaPage }       from '@/features/storefront/MiTiendaPage/MiTiendaPage'
import { PersonalizacionPage }    from '@/features/configuracion/PersonalizacionPage/PersonalizacionPage'
import { RolesPermisosPage }      from '@/features/configuracion/RolesPermisosPage/RolesPermisosPage'
import { StorefrontPage }        from '@/features/storefront/public/StorefrontPage'
import { StorefrontAccountPage } from '@/features/storefront/public/StorefrontAccountPage'
import { ProductoDetailPage }    from '@/features/storefront/public/ProductoDetailPage'
import { ModuleGuard }     from '@/components/common/ModuleGuard'
import { OfflineGuard }    from '@/components/common/OfflineGuard'
import { AdminRoute }      from './AdminRoute'
import { ROUTES }          from './routes'
import { ScanPage }        from '@/pages/ScanPage'
import { Tezca }           from '@/features/tezca/Tezca'
import { PrivacidadPage }   from '@/pages/PrivacidadPage'
import { TerminosPage }     from '@/pages/TerminosPage'
import { SinSucursalPage }  from '@/pages/SinSucursalPage'
import { RegistroPage }     from '@/features/auth/Registro/RegistroPage'

const router = createBrowserRouter([
  {
    path: ROUTES.SUPERADMIN,
    element: <SuperAdminRoute />,
    children: [
      {
        element: <SuperAdminLayout />,
        children: [
          { index: true, element: <AdminEmpresasList /> },
          { path: ROUTES.SUPERADMIN_AUDIT, element: <AuditoriaGlobalPage /> },
        ],
      },
    ],
  },
  {
    path: ROUTES.LOGIN,
    element: <Login />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, path: '/', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
          { path: ROUTES.DASHBOARD,  element: <Dashboard /> },

          // Operaciones (siempre en plan básico)
          { path: ROUTES.VENTAS,  element: <OfflineGuard label="ventas"><ModuleGuard module="ventas"><SalesList /></ModuleGuard></OfflineGuard> },
          { path: ROUTES.COMPRAS, element: <OfflineGuard label="compras"><ModuleGuard module="compras"><PurchasesList /></ModuleGuard></OfflineGuard> },

          // Inventario — subrutas apuntan al mismo componente con tabs
          { path: ROUTES.PRODUCTOS,      element: <ModuleGuard module="inventario"><InventoryList /></ModuleGuard> },
          { path: ROUTES.STOCK,          element: <ModuleGuard module="inventario"><InventoryList /></ModuleGuard> },
          { path: ROUTES.MOVIMIENTOS,    element: <ModuleGuard module="inventario"><InventoryList /></ModuleGuard> },
          { path: ROUTES.ALERTAS_STOCK,  element: <ModuleGuard module="inventario"><InventoryList /></ModuleGuard> },

          { path: ROUTES.CLIENTES,    element: <ModuleGuard module="clientes"><ClientesList /></ModuleGuard> },
          { path: ROUTES.PROVEEDORES, element: <ModuleGuard module="proveedores"><ProveedoresList /></ModuleGuard> },

          // Finanzas (plan profesional+) — NetworkOnly: bloqueados offline
          { path: ROUTES.TESORERIA, element: <OfflineGuard label="tesorería"><ModuleGuard module="tesoreria"><TesoreriaList /></ModuleGuard></OfflineGuard> },
          { path: ROUTES.CXC,       element: <OfflineGuard label="cuentas por cobrar"><ModuleGuard module="cxc"><CxCList /></ModuleGuard></OfflineGuard> },
          { path: ROUTES.CXP,       element: <OfflineGuard label="cuentas por pagar"><ModuleGuard module="cxp"><CxPList /></ModuleGuard></OfflineGuard> },
          { path: ROUTES.GASTOS,    element: <OfflineGuard label="gastos"><ModuleGuard module="gastos"><GastosList /></ModuleGuard></OfflineGuard> },

          // Gestión (plan empresarial+ / profesional+) — NetworkOnly: bloqueados offline
          { path: ROUTES.COLABORADORES, element: <OfflineGuard label="recursos humanos"><ModuleGuard module="rrhh"><ColaboradoresList /></ModuleGuard></OfflineGuard> },
          { path: ROUTES.ASISTENCIAS,   element: <OfflineGuard label="recursos humanos"><ModuleGuard module="rrhh"><AsistenciasList /></ModuleGuard></OfflineGuard> },
          { path: ROUTES.REPORTES,      element: <OfflineGuard label="reportes"><ModuleGuard module="reportes"><ReportesPage /></ModuleGuard></OfflineGuard> },
          { path: ROUTES.TEZCA,         element: <OfflineGuard label="Tezca"><ModuleGuard module="tezca"><Tezca /></ModuleGuard></OfflineGuard> },

          // Auditoría + Configuración — solo admin del negocio
          {
            element: <AdminRoute />,
            children: [
              { path: ROUTES.AUDITORIA, element: <AuditoriaPage /> },
              { path: ROUTES.CONFIGURACION,            element: <ModuleGuard module="configuracion"><ConfiguracionHub /></ModuleGuard> },
              { path: ROUTES.CONFIGURACION_EMPRESA,    element: <ModuleGuard module="configuracion"><EmpresaConfigPage /></ModuleGuard> },
              { path: ROUTES.CONFIGURACION_SUCURSALES, element: <ModuleGuard module="configuracion"><SucursalesPage /></ModuleGuard> },
              { path: ROUTES.CONFIGURACION_CATALOGOS,  element: <ModuleGuard module="configuracion"><CatalogosPage /></ModuleGuard> },
              { path: ROUTES.CONFIGURACION_USUARIOS,       element: <ModuleGuard module="configuracion"><UsuariosPage /></ModuleGuard> },
              { path: ROUTES.CONFIGURACION_NOTIFICACIONES, element: <ModuleGuard module="configuracion"><NotificacionesAdminPage /></ModuleGuard> },
              { path: ROUTES.CONFIGURACION_FACTURACION,    element: <ModuleGuard module="configuracion"><CfdiListPage /></ModuleGuard> },
              { path: ROUTES.CONFIGURACION_PERSONALIZACION, element: <ModuleGuard module="configuracion"><PersonalizacionPage /></ModuleGuard> },
              { path: ROUTES.CONFIGURACION_ROLES,          element: <ModuleGuard module="configuracion"><RolesPermisosPage /></ModuleGuard> },
            ],
          },
          { path: ROUTES.MI_TIENDA, element: <ModuleGuard module="storefront"><MiTiendaPage /></ModuleGuard> },
        ],
      },
    ],
  },
  { path: ROUTES.REGISTRO,       element: <RegistroPage /> },
  { path: '/scan/:token',        element: <ScanPage /> },
  { path: '/p/:slug',                             element: <StorefrontPage /> },
  { path: '/p/:slug/cuenta',                      element: <StorefrontAccountPage /> },
  { path: '/p/:slug/producto/:productoSlug',       element: <ProductoDetailPage /> },
  { path: ROUTES.SIN_SUCURSAL, element: <SinSucursalPage /> },
  { path: ROUTES.PRIVACIDAD,   element: <PrivacidadPage /> },
  { path: ROUTES.TERMINOS,     element: <TerminosPage /> },
  { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
