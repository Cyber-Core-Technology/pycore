# -*- coding: utf-8 -*-
import json, re, collections, sys
sys.path.insert(0, '/tmp/claude-1000/-home-scorpion-Desktop-Raul-pycore-erp/bde5edc9-bbc0-4a20-a93b-e0532f13a471/scratchpad')
from naming import NOUN, EXACT, REST_VERB, DETAIL_VERB, ACTION_SEGS, SUBFOLDER, PLURAL, SINGULAR, REQUIRED_QS, PARAM_ALIAS

SP = '/tmp/claude-1000/-home-scorpion-Desktop-Raul-pycore-erp/bde5edc9-bbc0-4a20-a93b-e0532f13a471/scratchpad'
routes = json.load(open(f'{SP}/api2.json'))

APP_META = {
 'core':          ('01 · Core', 'Empresas, sucursales, onboarding, tema visual y configuración del tenant.'),
 'auth':          ('02 · Autenticación', 'Login, JWT, 2FA, biometría, recuperación de contraseña y perfil propio.'),
 'usuarios':      ('03 · Usuarios y Roles', 'Alta de usuarios de la empresa, roles y asignación de permisos.'),
 'catalogs':      ('04 · Catálogos', 'Catálogos compartidos: categorías, unidades, monedas, impuestos.'),
 'terceros':      ('05 · Terceros', 'Clientes y proveedores.'),
 'inventory':     ('06 · Inventario', 'Productos, variantes, recetas, stock, movimientos, almacenes y producción.'),
 'purchases':     ('07 · Compras', 'Órdenes de compra, recepción y proveedores.'),
 'sales':         ('08 · Ventas', 'Ventas de mostrador/POS, devoluciones, promociones, cortes de caja y tickets.'),
 'servicios':     ('09 · Servicios', 'Servicios por sesión: mesas, rentas y sesiones cronometradas.'),
 'finance':       ('10 · Finanzas', 'Cuentas por cobrar/pagar, pagos, gastos y reportes financieros.'),
 'hr':            ('11 · Recursos Humanos', 'Empleados, asistencias y nómina.'),
 'tezca':         ('12 · TEZCA (IA)', 'Motor de inteligencia: insights, predicciones y recomendaciones de promociones.'),
 'facturacion':   ('13 · Facturación CFDI', 'Timbrado CFDI 4.0, configuración del PAC y cancelaciones ante el SAT.'),
 'notificaciones':('14 · Notificaciones', 'Bandeja de notificaciones del usuario y preferencias de envío.'),
 'storefront':    ('15 · Storefront (ERP)', 'Administración de la tienda en línea desde el ERP: config, pedidos y visibilidad.'),
 'store':         ('16 · Storefront (Público)', 'API pública de la tienda: catálogo, registro/login de clientes y pedidos. Usa el token de cliente, NO el JWT del ERP.'),
 'billing':       ('17 · Billing / Stripe', 'Planes, suscripciones, cupones, portal de cliente y webhooks de Stripe.'),
 'support':       ('18 · Soporte', 'Tickets de ayuda y centro de soporte.'),
 'audit':         ('19 · Auditoría', 'Bitácora de acciones del sistema.'),
 'sync':          ('20 · Sincronización', 'Sincronización offline/online de dispositivos POS.'),
}

# Rutas de accion sin cuerpo (verificado leyendo el codigo)
NO_BODY_OK = {
 'inventory/produccion/:pk/cancelar', 'inventory/produccion/:pk/confirmar',
 'purchases/compras/:pk/confirmar', 'sales/promociones/:pk/desactivar',
 'servicios/sesiones/:pk/reanudar', 'finance/cxc/:pk/cancelar', 'finance/cxp/:pk/cancelar',
 'tezca/insights/:pk/leer', 'tezca/promociones/recomendar',
 'notificaciones/marcar-todas-leidas', 'notificaciones/:pk/leer', 'billing/portal',
}
WEBHOOKS = {'billing/webhook', 'store/mp/webhook'}

ACCENTS = str.maketrans('áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN')

def param_types(raw):
    """Tipo esperado de cada parametro, leido del patron original de Django."""
    t = {}
    for name, pat in re.findall(r'\(\?P<(\w+)>([^)]*)\)', raw):
        if pat in ('[0-9]+', r'\d+'): t[name] = 'int'
        elif 'a-f' in pat: t[name] = 'uuid'
        else: t[name] = 'any'
    for conv, name in re.findall(r'<([^:>]+):(\w+)>', raw):
        t[name] = {'int': 'int', 'uuid': 'uuid', 'slug': 'slug', 'str': 'str'}.get(conv, 'any')
    for name in re.findall(r'<(\w+)>', raw):
        t.setdefault(name, 'any')
    return t

def var_name(param, tail, idx):
    """Nombre de variable para un parametro, basado en el recurso al que pertenece."""
    if param not in ('pk', 'id'):
        return PARAM_ALIAS.get(param, param)
    parent = None
    for seg in reversed(tail[:idx]):
        if not seg.startswith(':'):
            parent = seg; break
    if not parent:
        return 'id'
    noun = NOUN.get(parent, parent)
    base = SINGULAR.get(parent) or SINGULAR.get(noun) or noun
    base = base.translate(ACCENTS).lower()
    base = re.sub(r'[^a-z0-9]+', '_', base).strip('_')
    name = f'{base}_id' if base else 'id'
    return PARAM_ALIAS.get(name, name)

def clean_route(r):
    r = r.replace('^', '').replace('$', '')
    r = re.sub(r'\(\?P<(\w+)>[^)]*\)', r':\1', r)
    r = re.sub(r'<[^:>]+:(\w+)>', r':\1', r)
    r = re.sub(r'<(\w+)>', r':\1', r)
    return r

VAR_FOR = {
 'slug': '{{store_slug}}', 'pk': '{{id}}', 'id': '{{id}}',
 'empresa_id': '{{empresa_id}}', 'sucursal_id': '{{sucursal_id}}',
 'producto_pk': '{{producto_id}}', 'producto_id': '{{producto_id}}',
 'variante_id': '{{variante_id}}', 'pedido_id': '{{pedido_id}}',
 'id_venta': '{{id_venta}}', 'cliente_id': '{{cliente_id}}',
 'token': '{{token}}', 'producto_slug': '{{producto_slug}}', 'uidb64': '{{uidb64}}',
}

def titleize(seg):
    s = seg.replace('-', ' ').replace('_', ' ').strip()
    return s[:1].upper() + s[1:] if s else s

def noun_of(seg):
    return NOUN.get(seg, seg.replace('-', ' ').replace('_', ' '))

def cap(s):
    return s[:1].upper() + s[1:] if s else s

def singular(noun_txt, seg=None):
    if seg and seg in SINGULAR: return SINGULAR[seg]
    if noun_txt in SINGULAR:    return SINGULAR[noun_txt]
    return noun_txt

def req_name(app, tail, http, meta):
    # el slug de tienda no aporta al nombre
    rel = [t for t in tail if t != ':slug']
    key = '/'.join([app] + rel)
    if (key, http) in EXACT: return EXACT[(key, http)]
    if (('auth/' + '/'.join(rel[1:]), http)) in EXACT and app == 'store' and rel and rel[0] == 'auth':
        base = EXACT[('auth/' + '/'.join(rel[1:]), http)]
        return base.replace('mi perfil', 'perfil del cliente').replace('empresa', 'cliente')

    statics = [t for t in rel if not t.startswith(':')]
    has_id  = bool(rel) and rel[-1].startswith(':')
    if not statics:
        base = noun_of(app)
        v = DETAIL_VERB[http] if has_id else (REST_VERB[http] if http != 'GET' else 'Listar')
        return cap(f"{v} {base}")

    last = statics[-1]
    # accion terminal: POST /ventas/{id}/cancelar/
    if last in ACTION_SEGS and rel[-1] == last:
        verb = ACTION_SEGS[last]
        target_seg = next((t for t in reversed(rel[:-1]) if not t.startswith(':')), None)
        if target_seg:
            tgt = singular(noun_of(target_seg), target_seg)
            if tgt.lower() in verb.lower(): return cap(verb)
            return cap(f"{verb} {tgt}")
        return cap(verb)

    base_noun = noun_of(last)
    parent_seg = next((t for t in reversed(rel[:-1]) if not t.startswith(':')), None)

    if has_id:
        verb = DETAIL_VERB[http]
        base_noun = singular(base_noun, last)
    elif http == 'GET':
        verb = 'Listar' if last in PLURAL else 'Ver'
        if verb == 'Ver': base_noun = singular(base_noun, last)
    else:
        verb = REST_VERB[http]
        if http in ('POST',) and last in PLURAL:
            base_noun = singular(base_noun, last)
        elif http in ('PATCH','PUT','DELETE'):
            base_noun = singular(base_noun, last)

    name = f"{verb} {base_noun}"
    if parent_seg:
        p = singular(noun_of(parent_seg), parent_seg)
        if p.lower() not in name.lower():
            name += f" de {p}"
    return cap(re.sub(r'\s+', ' ', name).strip())

def build_body(meta, route_key, http, parsers):
    ex = meta.get('req_example')
    keys = meta.get('body_keys') or []
    files = meta.get('files') or []
    if http == 'GET':
        return None
    # DELETE solo lleva cuerpo si la vista realmente lo lee
    if http == 'DELETE' and not keys and not (isinstance(ex, dict) and ex):
        return None
    if route_key in WEBHOOKS:
        return {'mode':'raw','raw':json.dumps(
            {'id':'evt_00000000000000','type':'checkout.session.completed','data':{'object':{}}},
            indent=2, ensure_ascii=False),
            'options':{'raw':{'language':'json'}}}
    # OJO: los parsers por defecto de DRF ya incluyen MultiPartParser; solo cuenta
    # como multipart si la vista lo declara explicitamente sin JSON, o si lee request.FILES.
    own = parsers or []
    multipart = bool(files) or (
        bool(own) and any('MultiPart' in p or 'FileUpload' in p for p in own)
        and not any('JSON' in p for p in own))
    if multipart:
        fd = [{'key':f,'type':'file','src':[]} for f in (files or ['archivo'])]
        for k in keys:
            if k not in files:
                fd.append({'key':k,'value':'','type':'text'})
        return {'mode':'formdata','formdata':fd}
    payload = None
    if isinstance(ex, dict) and ex and '__error__' not in ex:
        payload = ex
        for k in keys:
            if k not in payload:
                payload[k] = None
    elif keys:
        payload = {k: None for k in keys}
    if payload is None:
        if route_key in NO_BODY_OK or http == 'DELETE':
            return None
        return {'mode':'raw','raw':'{}','options':{'raw':{'language':'json'}}}
    return {'mode':'raw','raw':json.dumps(payload, indent=2, ensure_ascii=False),
            'options':{'raw':{'language':'json'}}}

def build_query(r, meta, http, route_key=None, is_list=False):
    if http != 'GET':
        return []
    seen, out = set(), []
    for k, (v, d) in (REQUIRED_QS.get((route_key, http)) or {}).items():
        seen.add(k)
        out.append({'key': k, 'value': v, 'description': d, 'disabled': False})
    def add(k, val='', desc=''):
        if k in seen or k == 'format': return
        seen.add(k)
        out.append({'key':k,'value':val,'description':desc,'disabled':True})
    for k in meta.get('query_keys') or []: add(k, '', 'Filtro soportado por la vista')
    for k in r.get('filterset_fields') or []: add(k, '', 'Filtro (django-filter)')
    if r.get('search_fields'): add('search','', 'Búsqueda en: ' + ', '.join(r['search_fields']))
    if r.get('ordering_fields'): add('ordering','', 'Orden por: ' + ', '.join(r['ordering_fields']))
    if is_list:
        add('page', '1', 'Número de página (paginación DRF)')
        add('page_size', '20', 'Elementos por página (por defecto 20)')
    return out

def description(r, http, meta, route_key):
    L = []
    doc = (meta.get('doc') or '').strip() or (r.get('doc') or '').strip()
    if doc: L.append(doc.split('\n\n')[0].strip()); L.append('')
    L.append(f"**Vista:** `{r['view']}`" + (f".`{meta.get('action')}`" if meta.get('action') else ''))
    L.append(f"**Módulo:** `{r.get('module','')}`")
    if r.get('name'): L.append(f"**URL name:** `{r['name']}`")
    perms = r.get('permissions') or []
    if perms: L.append(f"**Permisos:** {', '.join(f'`{p}`' for p in perms)}")
    if r.get('public'): L.append('**Público:** no requiere token.')
    if meta.get('req_serializer'): L.append(f"**Serializer de entrada:** `{meta['req_serializer']}`")
    if r.get('filterset_fields'): L.append(f"**Filtros:** {', '.join(r['filterset_fields'])}")
    if r.get('search_fields'): L.append(f"**Búsqueda:** {', '.join(r['search_fields'])}")
    if route_key in NO_BODY_OK: L.append('_Esta acción no recibe cuerpo._')
    if route_key in WEBHOOKS:
        L.append('')
        L.append('> Webhook firmado. El cuerpo real lo envía el proveedor y la firma se valida contra el secreto; este ejemplo sólo ilustra la forma y devolverá `400 Firma inválida`.')
    return '\n\n'.join(L)

# ── agrupar ──────────────────────────────────────────────────────────────
tree = collections.OrderedDict()
VAR_TYPES = {}
VAR_USES = {}
for r in routes:
    route = clean_route(r['route'])
    segs = [s for s in route.split('/') if s]          # api, v1, app, ...
    app = segs[2] if len(segs) > 2 else 'core'
    tail = segs[3:]
    # subcarpeta = primer segmento estatico del tail
    is_root = r['view'] == 'APIRootView'
    rel = tail[1:] if (app == 'store' and tail and tail[0] == ':slug') else tail
    first = next((s for s in rel if not s.startswith(':')), None)
    smap = SUBFOLDER.get(app, {})
    if is_root:
        sub = 'Índice'
    elif first is None:
        sub = 'General'
    elif first in smap:
        sub = smap[first]
    else:
        sub = cap(noun_of(first))
    for http in r.get('methods', ['GET']):
        meta = (r.get('per_method') or {}).get(http, {})
        route_key = '/'.join([app] + tail)
        ptypes = param_types(r['route'])
        raw_path = []
        for i, seg in enumerate(segs):
            if not seg.startswith(':'):
                raw_path.append(seg); continue
            pname = seg[1:]
            if pname == 'slug':
                vn = 'store_slug' if app == 'store' else 'slug'
            else:
                vn = var_name(pname, segs, i)
            # si un mismo parametro aparece con varios patrones, gana el mas especifico
            _t = ptypes.get(pname, 'any')
            _rank = {'int': 3, 'uuid': 3, 'slug': 2, 'str': 1, 'any': 0}
            if _rank.get(_t, 0) > _rank.get(VAR_TYPES.get(vn, 'any'), 0) or vn not in VAR_TYPES:
                VAR_TYPES[vn] = _t
            VAR_USES.setdefault(vn, set()).add(app)
            raw_path.append('{{' + vn + '}}')
        url_str = '{{base_url}}/' + '/'.join(raw_path) + '/'
        _name = 'Índice del router (endpoints disponibles)' if is_root else req_name(app, tail, http, meta)
        item = {
            'name': _name,
            'request': {
                'method': http,
                'header': [],
                'url': {
                    'raw': url_str,
                    'host': ['{{base_url}}'],
                    'path': raw_path + [''],
                },
                'description': description(r, http, meta, route_key),
            },
            'response': [],
            '_sort': route + ' ' + http,
        }
        qs_key = '/'.join([app] + [t for t in tail if t != ':slug'])
        _is_list = (http == 'GET' and _name.startswith('Listar'))
        q = build_query(r, meta, http, qs_key, _is_list)
        if q:
            item['request']['url']['query'] = q
            enabled = [p for p in q if not p.get('disabled')]
            if enabled:
                item['request']['url']['raw'] = url_str + '?' + '&'.join(
                    f"{p['key']}={p['value']}" for p in enabled)
        body = build_body(meta, route_key, http, r.get('parsers_own'))
        if body:
            item['request']['body'] = body
            if body['mode'] == 'raw':
                item['request']['header'].append({'key':'Content-Type','value':'application/json'})
        # auth
        if r.get('public') or route_key in WEBHOOKS:
            item['request']['auth'] = {'type':'noauth'}
        elif app == 'store':
            item['request']['auth'] = {'type':'bearer','bearer':[{'key':'token','value':'{{store_access}}','type':'string'}]}
        tree.setdefault(app, collections.OrderedDict()).setdefault(sub, []).append(item)

# ── dedupe: rutas duplicadas (p.ej. viewset en '' + router root) ─────────
_dups = []
for app, subs in tree.items():
    seen = {}
    for sub, items in subs.items():
        for it in list(items):
            k = (it['request']['method'], '/'.join(it['request']['url']['path']))
            if k in seen:
                prev_sub, prev = seen[k]
                loser = it if 'Índice del router' in it['name'] else prev
                keep  = prev if loser is it else it
                _dups.append((k, keep['name'], loser['name']))
                (subs[prev_sub] if loser is prev else items).remove(loser)
                seen[k] = (sub, keep)
            else:
                seen[k] = (sub, it)
for sub in [s for s, v in list(tree.get('notificaciones', {}).items()) if not v]:
    del tree['notificaciones'][sub]
for app in list(tree):
    for sub in [s for s, v in list(tree[app].items()) if not v]:
        del tree[app][sub]
if _dups:
    print('deduplicadas:', len(_dups))
    for k, keep, loser in _dups: print('   ', k[0], k[1], '| se queda:', keep)

# ── scripts de captura de token ──────────────────────────────────────────
CAPTURE_ERP = """const j = pm.response.json();
if (j.access)  pm.collectionVariables.set('access_token',  j.access);
if (j.refresh) pm.collectionVariables.set('refresh_token', j.refresh);
if (j.temp_token) pm.collectionVariables.set('temp_token', j.temp_token);
if (j.usuario) {
  if (j.usuario.empresa && j.usuario.empresa.id_empresa)
    pm.collectionVariables.set('empresa_id', j.usuario.empresa.id_empresa);
  if (j.usuario.sucursal_activa)
    pm.collectionVariables.set('sucursal_id', j.usuario.sucursal_activa);
}
pm.test('Login OK', () => pm.expect(pm.response.code).to.be.oneOf([200, 202]));
if (j.requires_2fa) console.log('2FA requerido — usa /auth/2fa/verify/ con el temp_token guardado.');
"""
CAPTURE_STORE = """const j = pm.response.json();
if (j.access)  pm.collectionVariables.set('store_access',  j.access);
if (j.refresh) pm.collectionVariables.set('store_refresh', j.refresh);
if (j.temp_token) pm.collectionVariables.set('store_temp_token', j.temp_token);
pm.test('Login de cliente OK', () => pm.expect(pm.response.code).to.be.oneOf([200, 201, 202]));
"""
REFRESH_ERP = """const j = pm.response.json();
if (j.access) pm.collectionVariables.set('access_token', j.access);
"""

def attach(app, name_match, script):
    for sub, items in tree.get(app, {}).items():
        for it in items:
            path = '/'.join(it['request']['url']['path'])
            if name_match(path, it['request']['method']):
                it['event'] = [{'listen':'test','script':{'type':'text/javascript','exec':script.strip().split('\n')}}]

attach('auth', lambda p,m: p.endswith('auth/login/') and m=='POST', CAPTURE_ERP)
attach('auth', lambda p,m: '2fa/verify' in p and m=='POST', CAPTURE_ERP)
attach('auth', lambda p,m: p.endswith('refresh/') and m=='POST', REFRESH_ERP)
attach('store', lambda p,m: p.endswith('auth/login/') and m=='POST', CAPTURE_STORE)
attach('store', lambda p,m: p.endswith('auth/registro/') and m=='POST', CAPTURE_STORE)
attach('store', lambda p,m: p.endswith('auth/refresh/') and m=='POST', CAPTURE_STORE)
attach('store', lambda p,m: p.endswith('2fa/verify/') and m=='POST', CAPTURE_STORE)

# ── inyectar variables en los cuerpos de autenticacion ───────────────────
BODY_VARS = {
 'api/v1/auth/login/':            {'email':'{{email}}','password':'{{password}}','trust_token':''},
 'api/v1/auth/logout/':           {'refresh':'{{refresh_token}}'},
 'api/v1/auth/token/refresh/':    {'refresh':'{{refresh_token}}'},
 'api/v1/auth/2fa/verify/':       {'temp_token':'{{temp_token}}'},
 'api/v1/auth/2fa/resend/':       {'temp_token':'{{temp_token}}'},
}
STORE_BODY_VARS = {
 'auth/refresh/':    {'refresh':'{{store_refresh}}'},
 'auth/2fa/verify/': {'temp_token':'{{store_temp_token}}'},
 'auth/2fa/resend/': {'temp_token':'{{store_temp_token}}'},
}
_injected = 0
for app, subs in tree.items():
    for sub, items in subs.items():
        for it in items:
            b = it['request'].get('body')
            if not b or b['mode'] != 'raw':
                continue
            path = '/'.join(it['request']['url']['path'])
            mapping = BODY_VARS.get(path)
            if mapping is None and app == 'store':
                mapping = next((m for suf, m in STORE_BODY_VARS.items() if path.endswith(suf)), None)
            if not mapping:
                continue
            try:
                payload = json.loads(b['raw'])
            except Exception:
                continue
            for k, v in mapping.items():
                if k in payload:
                    payload[k] = v
                    _injected += 1
            b['raw'] = json.dumps(payload, indent=2, ensure_ascii=False)
print('variables inyectadas en cuerpos de auth:', _injected)

# ── ensamblar carpetas ───────────────────────────────────────────────────
METHOD_ORDER = {'GET':0,'POST':1,'PUT':2,'PATCH':3,'DELETE':4}
def sort_items(items):
    def key(it):
        p = '/'.join(it['request']['url']['path'])
        depth = p.count('/')
        return (depth, p, METHOD_ORDER.get(it['request']['method'], 9))
    return sorted(items, key=key)

folders = []
for app in sorted(tree, key=lambda a: APP_META.get(a, ('99 · ' + a, ''))[0]):
    fname, fdesc = APP_META.get(app, ('99 · ' + titleize(app), ''))
    subs = tree[app]
    children = []
    if len(subs) == 1:
        children = sort_items(next(iter(subs.values())))
    else:
        for sub in sorted(subs):
            items = sort_items(subs[sub])
            children.append({'name': sub, 'item': items,
                             'description': f'{len(items)} endpoint(s).'})
    total = sum(len(v) for v in subs.values())
    folders.append({'name': fname, 'description': f'{fdesc}\n\n**{total} endpoints.**', 'item': children})

def strip_sort(node):
    if isinstance(node, dict):
        node.pop('_sort', None)
        for v in node.values(): strip_sort(v)
    elif isinstance(node, list):
        for v in node: strip_sort(v)
strip_sort(folders)

total = sum(len(v) for a in tree.values() for v in a.values())

BASE_VARS = [
 ('base_url','http://localhost:8082','URL base de la API. Producción: https://api.plataforma.pycore.app'),
 ('email','','Correo del usuario ERP para /auth/login/ (usa Current value)'),
 ('password','','Contraseña del usuario ERP (usa Current value, no el inicial)'),
 ('access_token','','JWT de acceso — lo escribe el script de Iniciar sesión'),
 ('refresh_token','','JWT de refresco — lo escribe el script de Iniciar sesión'),
 ('temp_token','','Token temporal de 2FA — se escribe cuando el login pide 2FA'),
 ('empresa_id','','UUID de la empresa activa — lo escribe el login'),
 ('store_slug','','Slug de la tienda pública, p. ej. mi-tienda'),
 ('store_access','','Token del cliente storefront — lo escribe el login de cliente'),
 ('store_refresh','','Refresh del cliente storefront'),
 ('store_temp_token','','Token temporal de 2FA del cliente storefront'),
 ('device_id','','Identificador del dispositivo para login biométrico'),
]
TYPE_HINT = {
 'int':'entero','uuid':'UUID','slug':'slug','str':'texto','any':'ID',
}
_base_keys = {k for k, _, _ in BASE_VARS}
path_vars = []
for vn in sorted(VAR_TYPES):
    if vn in _base_keys: continue
    apps_using = ', '.join(sorted(VAR_USES.get(vn, [])))
    path_vars.append((vn, '', f"{TYPE_HINT.get(VAR_TYPES[vn],'ID')} — parámetro de ruta (usado en: {apps_using})"))
VARS = BASE_VARS + path_vars

DESC = f"""# PyCore ERP — API v1

Colección completa generada por introspección del `URLconf` de Django: **{total} peticiones** sobre **{len(routes)} rutas** en **{len(tree)} dominios**.

## Cómo empezar

1. Ajusta la variable `base_url` (por defecto `http://localhost:8082`; producción: `https://api.plataforma.pycore.app`).
2. Pon tu `email` y `password` en las variables de la colección — usa la columna **Current value** para no versionar la contraseña.
3. Ejecuta **02 · Autenticación → Iniciar sesión**. El script de test guarda solos `access_token`, `refresh_token` y `empresa_id`.
4. Todo lo demás hereda `Authorization: Bearer {{{{access_token}}}}` desde la colección.

Si la cuenta tiene 2FA, el login responde `requires_2fa: true` y guarda `temp_token`; completa con **Verificar código 2FA**.

## Dos dominios de token

| Dominio | Endpoints | Variable |
|---|---|---|
| ERP (SimpleJWT, 60 min) | todo salvo `/api/v1/store/` | `access_token` |
| Cliente storefront (JWT propio) | `/api/v1/store/...` | `store_access` |

Las peticiones bajo **16 · Storefront (Público)** ya apuntan a `store_access`; obtén ese token con **Login de cliente**. El backend también acepta el header `X-Storefront-Token`.

## Convenciones

- Todos los endpoints cuelgan de `/api/v1/`.
- Los parámetros de ruta son variables (`{{{{id}}}}`, `{{{{producto_id}}}}`, `{{{{store_slug}}}}`…), no valores fijos.
- Los **query params vienen deshabilitados**: actívalos en Postman según necesites. Salen de `filterset_fields`, `search_fields`, `ordering_fields` y de las lecturas de `request.query_params` en cada vista.
- Los cuerpos JSON son ejemplos derivados del serializer real de cada vista; los valores son placeholders por tipo, no datos válidos.
- Paginación DRF estándar: 20 elementos por página.
- Zona horaria `America/Mexico_City` — manda fechas con offset (`-06:00`).
- Multi-tenant: la empresa sale del JWT, no se manda en el cuerpo.

## Webhooks

`billing/webhook` y `store/mp/webhook` validan firma criptográfica. Dispararlos desde Postman devuelve `400`; están aquí como documentación de forma. Usa `stripe listen --forward-to` para probarlos de verdad.
"""

collection = {
 'info': {
   'name': 'PyCore ERP — API v1',
   'description': DESC,
   'schema': 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
   '_postman_id': 'pycore-erp-api-v1-full',
 },
 'auth': {'type':'bearer','bearer':[{'key':'token','value':'{{access_token}}','type':'string'}]},
 'event': [
   {'listen':'prerequest','script':{'type':'text/javascript','exec':[
     "// Aviso temprano si falta base_url",
     "if (!pm.collectionVariables.get('base_url')) {",
     "  console.warn('Falta la variable base_url — apúntala a tu backend.');",
     "}",
   ]}},
   {'listen':'test','script':{'type':'text/javascript','exec':[
     "// Chequeos globales aplicables a toda la coleccion",
     "pm.test('No es 5xx', () => pm.expect(pm.response.code).to.be.below(500));",
     "if (pm.response.code === 401) {",
     "  console.warn('401 — el access_token expiro (60 min). Corre Auth > Refrescar token.');",
     "}",
     "if (pm.response.code === 402) {",
     "  console.warn('402 — la suscripcion de la empresa esta bloqueada por billing.');",
     "}",
   ]}},
 ],
 'variable': [{'key':k,'value':v,'type':'string','description':d} for k,v,d in VARS],
 'item': folders,
}

out = f'{SP}/PyCore-ERP-API-v1.postman_collection.json'
with open(out, 'w') as f:
    json.dump(collection, f, indent=2, ensure_ascii=False)
print('requests:', total)
print('folders:', len(folders))
for fo in folders:
    n = sum(len(s['item']) if 'item' in s else 1 for s in fo['item'])
    print(f"  {fo['name']}: {n}")
print('->', out)
