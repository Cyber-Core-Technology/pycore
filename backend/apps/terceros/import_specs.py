"""
Especificaciones de columnas de importación para Cliente y Proveedor.
Se consumen desde los viewsets mediante TercerosImporter.
"""
from apps.terceros.import_utils import TercerosImporter, col
from apps.terceros.models import Cliente, Proveedor

TIPO_PERSONA = {'fisica', 'moral'}

# ── Proveedores ──────────────────────────────────────────────────────────────
_COLUMNAS_PROVEEDOR = [
    col('nombre_comercial', 'Nombre comercial *', 'Distribuidora del Norte', required=True),
    col('razon_social',     'Razón social',       'Distribuidora del Norte S.A. de C.V.'),
    col('rfc',              'RFC',                'DNO950101AB1'),
    col('tipo_persona',     'Tipo persona (fisica/moral)', 'moral',
        tipo='choice', choices=TIPO_PERSONA, default='moral'),
    col('tipo_proveedor',   'Tipo (materia_prima/servicios/equipos/consumibles/otro)', 'materia_prima',
        tipo='choice', choices={'materia_prima', 'servicios', 'equipos', 'consumibles', 'otro'}),
    col('codigo',           'Código interno',     'PROV-001'),
    col('email',            'Correo',             'ventas@delnorte.mx', tipo='email'),
    col('telefono',         'Teléfono',           '5551234567'),
    col('celular',          'Celular',            '5559876543'),
    col('contacto_principal', 'Contacto principal', 'Juan Pérez'),
    col('sitio_web',        'Sitio web',          'https://delnorte.mx'),
    col('calle',            'Calle',              'Av. Reforma'),
    col('numero_exterior',  'Número exterior',    '123'),
    col('numero_interior',  'Número interior',    'A'),
    col('colonia',          'Colonia',            'Centro'),
    col('codigo_postal',    'Código postal',      '06000'),
    col('ciudad',           'Ciudad',             'CDMX'),
    col('estado',           'Estado',             'Ciudad de México'),
    col('pais',             'País',               'México', default='México'),
    col('dias_credito',     'Días de crédito',    '30', tipo='int'),
    col('descuento_pronto_pago', 'Descuento pronto pago (%)', '5', tipo='decimal'),
    col('dias_pronto_pago', 'Días pronto pago',   '10', tipo='int'),
    col('notas',            'Notas internas',     'Proveedor preferente'),
]

# ── Clientes ─────────────────────────────────────────────────────────────────
_COLUMNAS_CLIENTE = [
    col('nombre_comercial', 'Nombre comercial *', 'Abarrotes La Esquina', required=True),
    col('razon_social',     'Razón social',       'Abarrotes La Esquina S.A. de C.V.'),
    col('rfc',              'RFC',                'AES950101AB1'),
    col('regimen_fiscal',   'Régimen fiscal (clave SAT)', '601'),
    col('tipo_persona',     'Tipo persona (fisica/moral)', 'fisica',
        tipo='choice', choices=TIPO_PERSONA, default='fisica'),
    col('tipo_cliente',     'Tipo (minorista/mayorista/distribuidor)', 'minorista',
        tipo='choice', choices={'minorista', 'mayorista', 'distribuidor'}),
    col('codigo',           'Código interno',     'CLI-001'),
    col('email',            'Correo',             'contacto@laesquina.mx', tipo='email'),
    col('telefono',         'Teléfono',           '5551234567'),
    col('celular',          'Celular',            '5559876543'),
    col('sitio_web',        'Sitio web',          'https://laesquina.mx'),
    col('calle',            'Calle',              'Av. Juárez'),
    col('numero_exterior',  'Número exterior',    '45'),
    col('numero_interior',  'Número interior',    'B'),
    col('colonia',          'Colonia',            'Centro'),
    col('codigo_postal',    'Código postal',      '06010'),
    col('ciudad',           'Ciudad',             'CDMX'),
    col('estado',           'Estado',             'Ciudad de México'),
    col('pais',             'País',               'México', default='México'),
    col('limite_credito',   'Límite de crédito',  '10000', tipo='decimal'),
    col('dias_credito',     'Días de crédito',    '15', tipo='int'),
    col('descuento_predeterminado', 'Descuento predeterminado (%)', '0', tipo='decimal'),
    col('codigo_postal_fiscal', 'CP fiscal (CFDI 4.0)', '06010'),
    col('uso_cfdi_default', 'Uso CFDI (clave SAT)', 'G03'),
    col('notas',            'Notas internas',     'Cliente frecuente'),
]


def _cliente_post_init(fields):
    # Al crear, el crédito disponible parte del límite de crédito
    fields['credito_disponible'] = fields.get('limite_credito') or 0


def proveedor_importer():
    return TercerosImporter(
        model=Proveedor,
        columnas=_COLUMNAS_PROVEEDOR,
        filename='plantilla_proveedores.xlsx',
        sheet_title='Proveedores',
        defaults={'pais': 'México', 'activo': True},
    )


def cliente_importer():
    return TercerosImporter(
        model=Cliente,
        columnas=_COLUMNAS_CLIENTE,
        filename='plantilla_clientes.xlsx',
        sheet_title='Clientes',
        defaults={'pais': 'México', 'activo': True},
        post_init=_cliente_post_init,
    )
