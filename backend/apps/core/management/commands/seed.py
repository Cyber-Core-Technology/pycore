"""
python manage.py seed

Crea datos ficticios completos para una empresa de demostración.
Cubre todos los módulos: core, auth, catalogs, terceros, inventory,
purchases, sales, finance, hr, audit.
"""
import random
import uuid
from datetime import date, timedelta, datetime
from decimal import Decimal

from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def rand_date(days_back=180, days_forward=0):
    start = date.today() - timedelta(days=days_back)
    return start + timedelta(days=random.randint(0, days_back + days_forward))

def rand_decimal(lo, hi, decimals=2):
    v = random.uniform(lo, hi)
    return round(Decimal(str(v)), decimals)

def folio(prefix, n):
    return f"{prefix}-{str(n).zfill(5)}"

ESTADOS_MX = ["Jalisco", "CDMX", "Nuevo León", "Puebla", "Guanajuato",
               "Veracruz", "Oaxaca", "Chihuahua", "Sonora", "Baja California"]
CIUDADES_MX = ["Guadalajara", "Ciudad de México", "Monterrey", "Puebla",
               "León", "Veracruz", "Oaxaca", "Chihuahua", "Hermosillo", "Tijuana"]
BANCOS = ["BBVA Bancomer", "Citibanamex", "Santander", "HSBC", "Banorte",
          "Scotiabank", "Inbursa"]


# ──────────────────────────────────────────────────────────────────────────────
# Command
# ──────────────────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed: crea datos ficticios de demostración en todos los módulos"

    def add_arguments(self, parser):
        parser.add_argument(
            "--empresa", default="Demo Abarrotes SA de CV",
            help="Nombre de la empresa a crear"
        )
        parser.add_argument(
            "--flush", action="store_true",
            help="Elimina TODOS los datos existentes antes de sembrar (PELIGROSO)"
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["flush"]:
            self._flush()

        self.stdout.write(self.style.WARNING("🌱 Iniciando seed..."))

        empresa, sucursales, admin = self._seed_core(options["empresa"])
        usuario = self._seed_auth(empresa, sucursales, admin)
        categorias, impuesto, unidad = self._seed_catalogs(empresa)
        clientes, proveedores = self._seed_terceros(empresa)
        productos = self._seed_inventory(empresa, sucursales, categorias, impuesto, unidad)
        compras = self._seed_purchases(empresa, sucursales[0], proveedores, productos, usuario)
        ventas = self._seed_sales(empresa, sucursales[0], clientes, productos, usuario)
        cuenta_bancaria = self._seed_finance(empresa, clientes, proveedores, ventas, compras, usuario)
        self._seed_gastos(empresa, sucursales[0], cuenta_bancaria, usuario)
        self._seed_hr(empresa, sucursales)
        self._seed_audit(empresa, usuario)

        self.stdout.write(self.style.SUCCESS("✅ Seed completado exitosamente."))
        self.stdout.write("")
        self.stdout.write(f"  Empresa : {empresa.nombre}")
        self.stdout.write(f"  Admin   : admin@demo.com  /  Demo@1234")
        self.stdout.write(f"  Vendedor: vendedor@demo.com  /  Demo@1234")

    # ──────────────────────────────────────────────────────────────────────────
    # FLUSH
    # ──────────────────────────────────────────────────────────────────────────

    def _flush(self):
        from apps.audit.models import LogAuditoria
        from apps.hr.models import Asistencia, Colaborador
        from apps.finance.models import (PagoCliente, PagoProveedor, Gasto,
                                         CuentaPorCobrar, CuentaPorPagar, CuentaBancaria)
        from apps.sales.models import DetalleDevolucion, Devolucion, DetalleVenta, Venta, Promocion
        from apps.purchases.models import DetalleCompra, Compra
        from apps.inventory.models import MovimientoInventario, Inventario, VarianteProducto, Producto
        from apps.terceros.models import Cliente, Proveedor
        from apps.catalogs.models import Categoria, Impuesto, UnidadMedida
        from apps.auth_module.models import Usuario
        from apps.core.models import Configuracion, Sucursal, Empresa

        for m in [LogAuditoria, Asistencia, Colaborador,
                  PagoCliente, PagoProveedor, Gasto, CuentaPorCobrar, CuentaPorPagar, CuentaBancaria,
                  DetalleDevolucion, Devolucion, DetalleVenta, Venta, Promocion,
                  DetalleCompra, Compra, MovimientoInventario, Inventario,
                  VarianteProducto, Producto, Cliente, Proveedor,
                  Categoria, Impuesto, UnidadMedida, Usuario, Configuracion, Sucursal, Empresa]:
            count = m.objects.all().delete()[0]
            if count:
                self.stdout.write(f"  Eliminados {count} registros de {m.__name__}")

    # ──────────────────────────────────────────────────────────────────────────
    # CORE
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_core(self, nombre_empresa):
        from apps.core.models import Empresa, Sucursal, Configuracion

        empresa, _ = Empresa.objects.get_or_create(
            slug="demo-abarrotes",
            defaults=dict(
                nombre=nombre_empresa,
                nombre_comercial="Abarrotes La Estrella",
                rfc="DAS850101AAA",
                razon_social=nombre_empresa,
                regimen_fiscal="General de Ley Personas Morales",
                tipo_negocio="formal_completo",
                plan="profesional",
                email="empresa@demo.com",
                telefono="33-1234-5678",
                direccion="Calle Hidalgo 100, Col. Centro, Guadalajara, Jalisco",
                activo=True,
            )
        )

        Configuracion.objects.get_or_create(
            empresa=empresa,
            defaults=dict(
                moneda="MXN",
                decimales=2,
                genera_cfdi=False,
                serie_factura="A",
                folio_actual=1,
                maneja_inventario=True,
                alerta_stock_minimo=True,
                email_notificaciones="ops@demo.com",
            )
        )

        sucursales_data = [
            dict(nombre="Sucursal Centro",       codigo="SUC-01", ciudad="Guadalajara",
                 estado="Jalisco", es_principal=True),
            dict(nombre="Sucursal Zapopan",      codigo="SUC-02", ciudad="Zapopan",
                 estado="Jalisco", es_principal=False),
            dict(nombre="Sucursal Tlaquepaque",  codigo="SUC-03", ciudad="Tlaquepaque",
                 estado="Jalisco", es_principal=False),
        ]
        sucursales = []
        for d in sucursales_data:
            s, _ = Sucursal.objects.get_or_create(
                empresa=empresa, codigo=d["codigo"],
                defaults=dict(
                    nombre=d["nombre"],
                    direccion=f"Av. Principal 100, {d['ciudad']}",
                    ciudad=d["ciudad"],
                    estado=d["estado"],
                    cp=f"{random.randint(44000, 44999)}",
                    telefono=f"33-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
                    email=f"{d['codigo'].lower()}@demo.com",
                    es_principal=d["es_principal"],
                    activo=True,
                )
            )
            sucursales.append(s)

        self.stdout.write(f"  ✓ Core: 1 empresa, {len(sucursales)} sucursales")
        return empresa, sucursales, None

    # ──────────────────────────────────────────────────────────────────────────
    # AUTH
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_auth(self, empresa, sucursales, _admin):
        from apps.auth_module.models import Usuario, Rol, Permiso, RolPermiso, UsuarioRol

        pwd = make_password("Demo@1234")

        admin, _ = Usuario.objects.get_or_create(
            email="admin@demo.com",
            defaults=dict(
                empresa=empresa, username="admin_demo",
                nombre="Administrador", apellido_paterno="Demo",
                password=pwd, is_staff=True, activo=True, verificado=True,
            )
        )

        vendedor, _ = Usuario.objects.get_or_create(
            email="vendedor@demo.com",
            defaults=dict(
                empresa=empresa, username="vendedor_demo",
                nombre="Carlos", apellido_paterno="García", apellido_materno="López",
                password=pwd, activo=True, verificado=True,
            )
        )

        cajera, _ = Usuario.objects.get_or_create(
            email="cajera@demo.com",
            defaults=dict(
                empresa=empresa, username="cajera_demo",
                nombre="María", apellido_paterno="Rodríguez",
                password=pwd, activo=True, verificado=True,
            )
        )

        # Roles
        rol_admin, _ = Rol.objects.get_or_create(
            empresa=empresa, nombre="Administrador",
            defaults=dict(descripcion="Acceso total", es_sistema=True, activo=True)
        )
        rol_vendedor, _ = Rol.objects.get_or_create(
            empresa=empresa, nombre="Vendedor",
            defaults=dict(descripcion="Puede crear ventas", es_sistema=False, activo=True)
        )
        rol_cajero, _ = Rol.objects.get_or_create(
            empresa=empresa, nombre="Cajero",
            defaults=dict(descripcion="Operación de caja", es_sistema=False, activo=True)
        )

        # Permisos base
        permisos_def = [
            ("ventas", "ver"), ("ventas", "crear"), ("ventas", "editar"),
            ("inventario", "ver"), ("inventario", "crear"),
            ("compras", "ver"), ("finanzas", "ver"),
            ("core", "admin"), ("auditoria", "ver"),
        ]
        for modulo, accion in permisos_def:
            p, _ = Permiso.objects.get_or_create(modulo=modulo, accion=accion)
            RolPermiso.objects.get_or_create(rol=rol_admin, permiso=p)

        for modulo, accion in [("ventas", "ver"), ("ventas", "crear"), ("inventario", "ver"), ("finanzas", "crear")]:
            p, _ = Permiso.objects.get_or_create(modulo=modulo, accion=accion)
            RolPermiso.objects.get_or_create(rol=rol_vendedor, permiso=p)

        # Asignar roles
        for usr, rol in [(admin, rol_admin), (vendedor, rol_vendedor), (cajera, rol_cajero)]:
            UsuarioRol.objects.get_or_create(usuario=usr, rol=rol, sucursal=None)

        self.stdout.write("  ✓ Auth: 3 usuarios, 3 roles, permisos")
        return admin

    # ──────────────────────────────────────────────────────────────────────────
    # CATALOGS
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_catalogs(self, empresa):
        from apps.catalogs.models import Categoria, Impuesto, UnidadMedida

        cats_data = [
            ("ALIM", "Alimentos"),
            ("BEB",  "Bebidas"),
            ("LIMP", "Limpieza"),
            ("HIGI", "Higiene Personal"),
            ("MISC", "Miscelánea"),
        ]
        categorias = []
        for codigo, nombre in cats_data:
            c, _ = Categoria.objects.get_or_create(
                empresa=empresa, codigo=codigo,
                defaults=dict(nombre=nombre, activo=True)
            )
            categorias.append(c)

        iva, _ = Impuesto.objects.get_or_create(
            empresa=empresa, codigo="IVA16",
            defaults=dict(nombre="IVA 16%", tasa=Decimal("16.00"), tipo="IVA",
                          es_retencion=False, activo=True)
        )

        pza, _ = UnidadMedida.objects.get_or_create(
            empresa=empresa, codigo="PZA",
            defaults=dict(nombre="Pieza", abreviatura="pza", tipo="pieza", activo=True)
        )
        for codigo, nombre, abr, tipo in [
            ("KG", "Kilogramo", "kg", "peso"),
            ("LT", "Litro", "lt", "volumen"),
            ("CJ", "Caja", "cj", "pieza"),
            ("PAQ", "Paquete", "paq", "pieza"),
        ]:
            UnidadMedida.objects.get_or_create(
                empresa=empresa, codigo=codigo,
                defaults=dict(nombre=nombre, abreviatura=abr, tipo=tipo, activo=True)
            )

        self.stdout.write(f"  ✓ Catálogos: {len(cats_data)} categorías, 1 impuesto, 5 unidades")
        return categorias, iva, pza

    # ──────────────────────────────────────────────────────────────────────────
    # TERCEROS
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_terceros(self, empresa):
        from apps.terceros.models import Cliente, Proveedor

        clientes_data = [
            ("Tienda El Sol",         "TESO850101AA1", "mayorista",    50000),
            ("Minisuper La Paloma",   "MILP900215BB2", "distribuidor", 30000),
            ("Abarrotes Pérez",       "ABPE780610CC3", "minorista",    10000),
            ("Comercial Hernández",   "COHE820320DD4", "mayorista",    80000),
            ("Miscelánea Ramírez",    "MIRA951105EE5", "minorista",     5000),
            ("Mercado San Juan",      "MESJ881212FF6", "mayorista",    60000),
            ("Super Económico",       "SUEC760430GG7", "distribuidor", 40000),
            ("Tiendita de la Esquina","TIDE930708HH8", "minorista",    15000),
            ("Distribuidora Norte",   "DINO870919II9", "distribuidor", 90000),
            ("Abarrotes Gutiérrez",   "ABGU800525JJ0", "mayorista",    25000),
        ]

        clientes = []
        for i, (nombre, rfc, tipo, limite) in enumerate(clientes_data, 1):
            estado = random.choice(ESTADOS_MX)
            ciudad = random.choice(CIUDADES_MX)
            c, _ = Cliente.objects.get_or_create(
                empresa=empresa, codigo=f"CLI-{str(i).zfill(4)}",
                defaults=dict(
                    nombre_comercial=nombre, rfc=rfc,
                    tipo_persona="moral", tipo_cliente=tipo,
                    email=f"contacto{i}@cliente.com",
                    telefono=f"33-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
                    ciudad=ciudad, estado=estado, pais="México",
                    limite_credito=Decimal(str(limite)),
                    credito_disponible=Decimal(str(limite)),
                    dias_credito=random.choice([0, 15, 30, 45, 60]),
                    activo=True,
                )
            )
            clientes.append(c)

        proveedores_data = [
            ("BIMBO SA de CV",            "BISA750101AAA", "materia_prima"),
            ("Nestlé México",             "NEME800520BBB", "materia_prima"),
            ("Coca-Cola FEMSA",           "COFE850610CCC", "materia_prima"),
            ("Unilever de México",        "UNME900101DDD", "consumibles"),
            ("Procter & Gamble México",   "PGME880415EEE", "consumibles"),
            ("Lala SA de CV",             "LASA920720FFF", "materia_prima"),
            ("Maseca / Gruma",            "MASY700815GGG", "materia_prima"),
            ("Sabritas Pepsico",          "SAPE830930HHH", "materia_prima"),
            ("Distribuidora Regional",    "DIRE950112III", "otro"),
            ("Comercializadora Noreste",  "CONO870305JJJ", "otro"),
        ]

        proveedores = []
        for i, (nombre, rfc, tipo) in enumerate(proveedores_data, 1):
            p, _ = Proveedor.objects.get_or_create(
                empresa=empresa, codigo=f"PRV-{str(i).zfill(4)}",
                defaults=dict(
                    nombre_comercial=nombre, rfc=rfc,
                    tipo_persona="moral", tipo_proveedor=tipo,
                    contacto_principal=f"Contacto {i}",
                    email=f"ventas{i}@proveedor.com",
                    telefono=f"55-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
                    ciudad="Ciudad de México", estado="CDMX", pais="México",
                    dias_credito=random.choice([0, 15, 30, 60]),
                    activo=True,
                )
            )
            proveedores.append(p)

        self.stdout.write(f"  ✓ Terceros: {len(clientes)} clientes, {len(proveedores)} proveedores")
        return clientes, proveedores

    # ──────────────────────────────────────────────────────────────────────────
    # INVENTORY
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_inventory(self, empresa, sucursales, categorias, impuesto, unidad):
        from apps.inventory.models import Producto, Inventario, MovimientoInventario
        from apps.catalogs.models import UnidadMedida

        cat_map = {c.nombre: c for c in categorias}
        un_lt = UnidadMedida.objects.filter(empresa=empresa, codigo="LT").first() or unidad
        un_kg = UnidadMedida.objects.filter(empresa=empresa, codigo="KG").first() or unidad
        un_cj = UnidadMedida.objects.filter(empresa=empresa, codigo="CJ").first() or unidad

        productos_data = [
            # (codigo, nombre, categoria, precio_venta, precio_compra, unidad, stock_min, stock_max)
            ("P001", "Arroz Extra 1kg",           "Alimentos",  22.50, 15.00, un_kg,   20, 200),
            ("P002", "Frijol Negro 1kg",           "Alimentos",  28.00, 19.00, un_kg,   15, 150),
            ("P003", "Aceite Vegetal 1lt",         "Alimentos",  45.00, 31.00, un_lt,   10, 120),
            ("P004", "Harina de Maíz 1kg",        "Alimentos",  18.00, 12.00, un_kg,   30, 300),
            ("P005", "Azúcar Estándar 1kg",       "Alimentos",  24.00, 16.00, un_kg,   25, 250),
            ("P006", "Sal de Mesa 1kg",            "Alimentos",  12.00,  7.50, un_kg,   20, 200),
            ("P007", "Atún en Agua 140g",         "Alimentos",  18.50, 11.00, unidad,  50, 500),
            ("P008", "Sardinas en Tomate 425g",   "Alimentos",  22.00, 14.00, unidad,  30, 300),
            ("P009", "Pasta Spaghetti 200g",      "Alimentos",  14.00,  8.50, unidad,  40, 400),
            ("P010", "Galletas Marias 200g",      "Alimentos",  19.50, 12.00, unidad,  50, 500),
            ("P011", "Refresco Cola 600ml",       "Bebidas",    18.00, 10.50, unidad,  60, 600),
            ("P012", "Agua Natural 1.5lt",        "Bebidas",    16.00,  9.00, un_lt,   40, 400),
            ("P013", "Jugo de Naranja 1lt",       "Bebidas",    35.00, 22.00, un_lt,   20, 200),
            ("P014", "Leche Entera 1lt",          "Bebidas",    28.00, 18.00, un_lt,   30, 300),
            ("P015", "Café Soluble 200g",         "Bebidas",    85.00, 55.00, unidad,  15, 150),
            ("P016", "Detergente Líquido 1lt",    "Limpieza",   55.00, 35.00, un_lt,   15, 150),
            ("P017", "Jabón en Polvo 1kg",        "Limpieza",   42.00, 27.00, un_kg,   10, 120),
            ("P018", "Suavizante de Ropa 1lt",    "Limpieza",   65.00, 42.00, un_lt,   10, 100),
            ("P019", "Limpiavidrios 500ml",       "Limpieza",   38.00, 24.00, unidad,   8,  80),
            ("P020", "Cloro 1lt",                 "Limpieza",   22.00, 13.00, un_lt,   12, 120),
            ("P021", "Shampoo 400ml",             "Higiene Personal", 75.00, 48.00, unidad, 10, 100),
            ("P022", "Jabón de Tocador 150g",     "Higiene Personal", 28.00, 17.00, unidad, 20, 200),
            ("P023", "Pasta Dental 75ml",         "Higiene Personal", 35.00, 22.00, unidad, 15, 150),
            ("P024", "Desodorante Roll-on 60ml",  "Higiene Personal", 52.00, 33.00, unidad, 10, 100),
            ("P025", "Papel Higiénico 4 rollos",  "Higiene Personal", 48.00, 30.00, un_cj,  20, 200),
            ("P026", "Servilletas 200pzas",       "Miscelánea", 32.00, 20.00, unidad,  15, 150),
            ("P027", "Bolsas para Basura 10pzas", "Miscelánea", 25.00, 15.00, unidad,  20, 200),
            ("P028", "Focos LED 10W",             "Miscelánea", 65.00, 40.00, unidad,  10,  80),
            ("P029", "Pilas AA 4-pack",           "Miscelánea", 55.00, 34.00, unidad,  12, 120),
            ("P030", "Escoba con cepillo",        "Limpieza",   95.00, 60.00, unidad,   5,  50),
        ]

        productos = []
        for data in productos_data:
            codigo, nombre, cat_nombre, precio_v, precio_c, un, stock_min, stock_max = data
            cat = cat_map.get(cat_nombre, categorias[0])
            p, _ = Producto.objects.get_or_create(
                empresa=empresa, codigo=codigo,
                defaults=dict(
                    sku=f"SKU-{codigo}",
                    codigo_barras=f"75000{random.randint(10000,99999)}",
                    nombre=nombre,
                    descripcion=f"{nombre} de alta calidad para distribución.",
                    tipo="producto",
                    categoria=cat,
                    unidad_medida=un,
                    impuesto=impuesto,
                    precio_venta=Decimal(str(precio_v)),
                    precio_compra=Decimal(str(precio_c)),
                    precio_mayoreo=Decimal(str(round(precio_v * 0.85, 2))),
                    maneja_inventario=True,
                    stock_minimo=Decimal(str(stock_min)),
                    stock_maximo=Decimal(str(stock_max)),
                    activo=True,
                )
            )
            productos.append(p)

            # Inventario y movimientos iniciales por sucursal
            for suc in sucursales:
                stock_ini = random.randint(stock_min, min(stock_min * 3, stock_max))
                inv, created = Inventario.objects.get_or_create(
                    empresa=empresa, producto=p, variante=None, sucursal=suc,
                    defaults=dict(
                        stock_actual=Decimal(str(stock_ini)),
                        stock_reservado=Decimal("0"),
                        costo_promedio=Decimal(str(precio_c)),
                    )
                )
                if created:
                    MovimientoInventario.objects.create(
                        empresa=empresa,
                        folio=f"MOV-INI-{p.codigo}-{suc.codigo}",
                        tipo_movimiento="entrada",
                        producto=p,
                        variante=None,
                        sucursal=suc,
                        cantidad=Decimal(str(stock_ini)),
                        costo_unitario=Decimal(str(precio_c)),
                        costo_total=Decimal(str(stock_ini)) * Decimal(str(precio_c)),
                        stock_antes=Decimal("0"),
                        stock_despues=Decimal(str(stock_ini)),
                        tipo_referencia="inicial",
                        motivo="Stock inicial de apertura",
                    )

        self.stdout.write(f"  ✓ Inventario: {len(productos)} productos con stock en {len(sucursales)} sucursales")
        return productos

    # ──────────────────────────────────────────────────────────────────────────
    # PURCHASES
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_purchases(self, empresa, sucursal, proveedores, productos, usuario):
        from apps.purchases.models import Compra, DetalleCompra

        compras = []
        for i in range(1, 26):
            proveedor = random.choice(proveedores)
            items = random.sample(productos, random.randint(3, 8))
            fecha = rand_date(days_back=120)
            estado = random.choice(["recibida", "recibida", "recibida", "activo", "cancelada"])

            subtotal = Decimal("0")
            detalles_data = []
            for prod in items:
                qty = Decimal(str(random.randint(10, 100)))
                pu = prod.precio_compra * Decimal(str(random.uniform(0.90, 1.05)))
                pu = pu.quantize(Decimal("0.01"))
                sub = (qty * pu).quantize(Decimal("0.01"))
                impuesto_monto = (sub * Decimal("0.16")).quantize(Decimal("0.01"))
                total_linea = (sub + impuesto_monto).quantize(Decimal("0.01"))
                subtotal += sub
                detalles_data.append((prod, qty, pu, sub, impuesto_monto, total_linea))

            impuestos = (subtotal * Decimal("0.16")).quantize(Decimal("0.01"))
            total = (subtotal + impuestos).quantize(Decimal("0.01"))

            compra = Compra.objects.create(
                uuid=uuid.uuid4(),
                folio=folio("CMP", i),
                empresa=empresa,
                proveedor=proveedor,
                sucursal=sucursal,
                fecha_entrega=fecha + timedelta(days=7),
                fecha_vencimiento=fecha + timedelta(days=30),
                estado=estado,
                subtotal=subtotal,
                descuento=Decimal("0"),
                impuestos=impuestos,
                total=total,
                metodo_pago=random.choice(["transferencia", "cheque", "efectivo"]),
                saldo_pendiente=total if estado != "recibida" else Decimal("0"),
                numero_factura=f"F-{random.randint(10000, 99999)}",
                notas="Compra de reposición de inventario.",
                created_by=usuario,
            )

            for prod, qty, pu, sub, imp_monto, total_linea in detalles_data:
                qty_rec = qty if estado == "recibida" else (
                    Decimal("0") if estado == "cancelada" else qty * Decimal("0.5")
                )
                DetalleCompra.objects.create(
                    compra=compra,
                    producto=prod,
                    variante=None,
                    cantidad=qty,
                    cantidad_recibida=qty_rec,
                    precio_unitario=pu,
                    descuento=Decimal("0"),
                    subtotal=sub,
                    impuesto_tasa=Decimal("16.00"),
                    impuesto_monto=imp_monto,
                    total=total_linea,
                )
            compras.append(compra)

        self.stdout.write(f"  ✓ Compras: {len(compras)} órdenes de compra")
        return compras

    # ──────────────────────────────────────────────────────────────────────────
    # SALES
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_sales(self, empresa, sucursal, clientes, productos, usuario):
        from apps.sales.models import Venta, DetalleVenta

        ventas = []
        metodos = ["efectivo", "tarjeta_debito", "tarjeta_credito",
                   "transferencia", "credito", "efectivo", "efectivo"]

        for i in range(1, 61):
            cliente = random.choice(clientes) if random.random() > 0.25 else None
            items = random.sample(productos, random.randint(2, 6))
            estado = random.choices(
                ["activo", "pagado", "cancelado"],
                weights=[20, 70, 10]
            )[0]
            metodo = random.choice(metodos)
            if metodo == "credito" and cliente is None:
                metodo = "efectivo"

            subtotal = Decimal("0")
            detalles_data = []
            for prod in items:
                qty = Decimal(str(random.randint(1, 20)))
                pu = prod.precio_venta
                sub = (qty * pu).quantize(Decimal("0.01"))
                imp_monto = (sub * Decimal("0.16")).quantize(Decimal("0.01"))
                total_linea = (sub + imp_monto).quantize(Decimal("0.01"))
                subtotal += sub
                detalles_data.append((prod, qty, pu, sub, imp_monto, total_linea))

            impuestos = (subtotal * Decimal("0.16")).quantize(Decimal("0.01"))
            descuento = Decimal("0")
            total = (subtotal + impuestos - descuento).quantize(Decimal("0.01"))
            saldo = total if estado == "activo" and metodo == "credito" else Decimal("0")

            venta = Venta.objects.create(
                uuid=uuid.uuid4(),
                folio=folio("VTA", i),
                empresa=empresa,
                cliente=cliente,
                sucursal=sucursal,
                vendedor=usuario,
                estado=estado,
                subtotal=subtotal,
                descuento=descuento,
                impuestos=impuestos,
                total=total,
                metodo_pago=metodo,
                saldo_pendiente=saldo,
                notas="" if random.random() > 0.2 else "Venta con descuento especial.",
                origen="online",
                created_by=usuario,
            )

            for prod, qty, pu, sub, imp_monto, total_linea in detalles_data:
                DetalleVenta.objects.create(
                    venta=venta,
                    producto=prod,
                    variante=None,
                    cantidad=qty,
                    precio_unitario=pu,
                    descuento=Decimal("0"),
                    subtotal=sub,
                    impuesto_tasa=Decimal("16.00"),
                    impuesto_monto=imp_monto,
                    total=total_linea,
                    costo_unitario=prod.precio_compra,
                    costo_total=(qty * prod.precio_compra).quantize(Decimal("0.01")),
                )
            ventas.append(venta)

        self.stdout.write(f"  ✓ Ventas: {len(ventas)} transacciones")
        return ventas

    # ──────────────────────────────────────────────────────────────────────────
    # FINANCE
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_finance(self, empresa, clientes, proveedores, ventas, compras, usuario):
        from apps.finance.models import (CuentaBancaria, CuentaPorCobrar,
                                         CuentaPorPagar, PagoCliente, PagoProveedor)

        # Cuentas bancarias
        cuentas_data = [
            ("Cuenta Principal BBVA", "BBVA Bancomer", "123456789012345678", "cheques", True,  350000),
            ("Caja Chica Centro",     "Inbursa",       "",                   "caja",    False,   8500),
            ("Cuenta Nómina Banorte", "Banorte",       "987654321098765432", "cheques", False, 120000),
        ]
        ctas_bancarias = []
        for nombre, banco, clabe, tipo, principal, saldo in cuentas_data:
            cb, _ = CuentaBancaria.objects.get_or_create(
                empresa=empresa, nombre=nombre,
                defaults=dict(
                    banco=banco, clabe=clabe, tipo_cuenta=tipo,
                    moneda="MXN",
                    saldo_actual=Decimal(str(saldo)),
                    saldo_inicial=Decimal(str(saldo)),
                    es_principal=principal, activo=True,
                    created_by=usuario,
                )
            )
            ctas_bancarias.append(cb)
        cuenta_principal = ctas_bancarias[0]

        # CxC — ventas a crédito o con saldo pendiente
        cxc_list = []
        cxc_n = 1
        for venta in ventas:
            if venta.saldo_pendiente > 0 and venta.cliente:
                dias_vcto = random.randint(15, 60)
                estado_cxc = random.choice(["pendiente", "pendiente", "vencida", "pagada_parcial"])
                cxc, created = CuentaPorCobrar.objects.get_or_create(
                    venta=venta,
                    defaults=dict(
                        folio=folio("CXC", cxc_n),
                        empresa=empresa,
                        cliente=venta.cliente,
                        monto_original=venta.total,
                        saldo_pendiente=venta.saldo_pendiente,
                        fecha_vencimiento=date.today() + timedelta(days=dias_vcto),
                        estado=estado_cxc,
                        created_by=usuario,
                    )
                )
                if created:
                    cxc_n += 1
                    cxc_list.append(cxc)

        # CxP — compras con saldo
        cxp_list = []
        cxp_n = 1
        for compra in compras:
            if compra.saldo_pendiente and compra.saldo_pendiente > 0:
                dias_vcto = compra.proveedor.dias_credito or 30
                estado_cxp = random.choice(["pendiente", "pendiente", "vencida"])
                cxp, created = CuentaPorPagar.objects.get_or_create(
                    compra=compra,
                    defaults=dict(
                        folio=folio("CXP", cxp_n),
                        empresa=empresa,
                        proveedor=compra.proveedor,
                        monto_original=compra.total,
                        saldo_pendiente=compra.saldo_pendiente,
                        fecha_vencimiento=date.today() + timedelta(days=dias_vcto),
                        estado=estado_cxp,
                        created_by=usuario,
                    )
                )
                if created:
                    cxp_n += 1
                    cxp_list.append(cxp)

        # Pagos parciales de clientes
        pago_cli_n = 1
        for cxc in cxc_list[:8]:
            if cxc.estado in ["pagada_parcial"]:
                monto_pago = (cxc.monto_original * Decimal("0.5")).quantize(Decimal("0.01"))
                PagoCliente.objects.create(
                    folio=folio("PCLI", pago_cli_n),
                    empresa=empresa,
                    cxc=cxc,
                    cuenta_bancaria=cuenta_principal,
                    monto=monto_pago,
                    metodo_pago="transferencia",
                    fecha_pago=date.today() - timedelta(days=random.randint(1, 30)),
                    referencia=f"TRF-{random.randint(100000, 999999)}",
                    created_by=usuario,
                )
                pago_cli_n += 1

        # Pagos a proveedores
        pago_prv_n = 1
        for cxp in cxp_list[:5]:
            monto_pago = (cxp.monto_original * Decimal("0.6")).quantize(Decimal("0.01"))
            PagoProveedor.objects.create(
                folio=folio("PPRV", pago_prv_n),
                empresa=empresa,
                cxp=cxp,
                cuenta_bancaria=cuenta_principal,
                monto=monto_pago,
                metodo_pago="transferencia",
                fecha_pago=date.today() - timedelta(days=random.randint(5, 45)),
                referencia=f"TRF-{random.randint(100000, 999999)}",
                created_by=usuario,
            )
            pago_prv_n += 1

        self.stdout.write(
            f"  ✓ Finanzas: 3 cuentas bancarias, {len(cxc_list)} CxC, "
            f"{len(cxp_list)} CxP, pagos registrados"
        )
        return cuenta_principal

    # ──────────────────────────────────────────────────────────────────────────
    # GASTOS
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_gastos(self, empresa, sucursal, cuenta_bancaria, usuario):
        from apps.finance.models import Gasto

        gastos_data = [
            ("Renta local sucursal Centro",     "renta",        18500, "transferencia"),
            ("Luz CFE — Enero",                 "servicios",     2800, "transferencia"),
            ("Agua potable",                    "servicios",      450, "efectivo"),
            ("Internet Telmex",                 "servicios",      799, "transferencia"),
            ("Nómina quincenal",                "nomina",       42000, "transferencia"),
            ("Mantenimiento refrigerador",      "mantenimiento", 3200, "efectivo"),
            ("Papelería y consumibles",         "otro",           850, "efectivo"),
            ("Gasolina reparto",                "transporte",    2100, "efectivo"),
            ("Publicidad redes sociales",       "marketing",    3500, "tarjeta_credito"),
            ("Seguro local",                    "servicios",    1800, "transferencia"),
            ("Renta equipo POS",                "servicios",     699, "transferencia"),
            ("Honorarios contador",             "otro",         4500, "transferencia"),
            ("Limpieza y sanitización",         "mantenimiento", 900, "efectivo"),
            ("Cajas y empaques",                "otro",         1200, "efectivo"),
            ("ISR 2T estimado",                 "impuestos",   12000, "transferencia"),
        ]

        for i, (concepto, categoria, monto, metodo) in enumerate(gastos_data, 1):
            monto_d = Decimal(str(monto))
            iva_monto = (monto_d * Decimal("0.16")).quantize(Decimal("0.01"))
            Gasto.objects.get_or_create(
                folio=folio("GST", i),
                defaults=dict(
                    empresa=empresa,
                    sucursal=sucursal,
                    cuenta_bancaria=cuenta_bancaria,
                    concepto=concepto,
                    categoria=categoria,
                    monto=monto_d,
                    impuesto_monto=iva_monto,
                    total=(monto_d + iva_monto).quantize(Decimal("0.01")),
                    metodo_pago=metodo,
                    fecha_gasto=rand_date(60),
                    created_by=usuario,
                )
            )

        self.stdout.write(f"  ✓ Gastos: {len(gastos_data)} registros")

    # ──────────────────────────────────────────────────────────────────────────
    # HR
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_hr(self, empresa, sucursales):
        from apps.hr.models import Colaborador, Asistencia

        colaboradores_data = [
            ("García",    "López",     "Carlos",    "Gerente General",      "Dirección",   800, "planta"),
            ("Rodríguez", "Martínez",  "María",     "Cajera",               "Ventas",      350, "planta"),
            ("Hernández", "Pérez",     "Luis",      "Almacenista",          "Operaciones", 320, "planta"),
            ("Martínez",  "González",  "Ana",       "Vendedora",            "Ventas",      380, "planta"),
            ("López",     "Sánchez",   "Roberto",   "Repartidor",           "Logística",   340, "planta"),
            ("González",  "Ramírez",   "Sofía",     "Auxiliar Contable",    "Finanzas",    420, "planta"),
            ("Pérez",     "Torres",    "Miguel",    "Supervisor Almacén",   "Operaciones", 450, "planta"),
            ("Sánchez",   "Flores",    "Elena",     "Cajera Sucursal",      "Ventas",      350, "planta"),
            ("Torres",    "Rivera",    "Diego",     "Promotor",             "Ventas",      310, "temporal"),
            ("Rivera",    "Morales",   "Patricia",  "Auxiliar Admin",       "Admin",       360, "planta"),
            ("Morales",   "Cruz",      "Fernando",  "Chofer",               "Logística",   380, "planta"),
            ("Cruz",      "Ortiz",     "Gabriela",  "Recepcionista",        "Admin",       330, "planta"),
        ]

        colaboradores = []
        for i, (ap, am, nombre, puesto, depto, salario, contrato) in enumerate(colaboradores_data, 1):
            suc = sucursales[i % len(sucursales)]
            col, _ = Colaborador.objects.get_or_create(
                empresa=empresa, numero_empleado=f"EMP-{str(i).zfill(4)}",
                defaults=dict(
                    sucursal=suc,
                    nombre=nombre,
                    apellido_paterno=ap,
                    apellido_materno=am,
                    email=f"{nombre.lower()}.{ap.lower()}@demo.com",
                    telefono=f"33-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
                    puesto=puesto,
                    departamento=depto,
                    fecha_ingreso=rand_date(days_back=730, days_forward=0),
                    tipo_contrato=contrato,
                    salario_diario=Decimal(str(salario)),
                    estado="activo",
                )
            )
            colaboradores.append(col)

        # Asistencias últimos 14 días
        asistencias = 0
        for col in colaboradores:
            for days_ago in range(14, 0, -1):
                dia = date.today() - timedelta(days=days_ago)
                if dia.weekday() >= 6:  # Domingo libre
                    continue
                estado_asis = random.choices(
                    ["puntual", "retardo", "falta"],
                    weights=[80, 15, 5]
                )[0]
                hora_base = datetime.combine(dia, datetime.min.time()).replace(
                    hour=8, minute=random.randint(0, 30)
                )
                Asistencia.objects.get_or_create(
                    empresa=empresa, colaborador=col, fecha=dia,
                    tipo="entrada",
                    defaults=dict(
                        hora_registro=timezone.make_aware(hora_base),
                        estado=estado_asis,
                        registrado_por="Sistema",
                    )
                )
                asistencias += 1

        self.stdout.write(f"  ✓ RR.HH.: {len(colaboradores)} colaboradores, {asistencias} registros de asistencia")

    # ──────────────────────────────────────────────────────────────────────────
    # AUDIT
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_audit(self, empresa, usuario):
        from apps.audit.models import LogAuditoria

        acciones = [
            "venta.creada", "venta.cancelada", "compra.creada", "compra.recibida",
            "movimiento.creado", "stock.bajo", "usuario.login", "usuario.logout",
            "pago.registrado", "cuenta_cobrar.creada",
        ]

        for i in range(40):
            accion = random.choice(acciones)
            LogAuditoria.objects.create(
                empresa=empresa,
                usuario=usuario,
                usuario_email=usuario.email,
                accion=accion,
                tabla=accion.split(".")[0],
                id_registro=str(uuid.uuid4()),
                payload={"detalle": f"Registro de auditoría #{i+1}", "accion": accion},
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0 (seed)",
            )

        self.stdout.write("  ✓ Auditoría: 40 registros de log")

