import json, re, sys, inspect, importlib
from django.urls import get_resolver
from django.urls.resolvers import URLPattern, URLResolver
from rest_framework import serializers as S

FE = {
 'CharField':'texto','EmailField':'correo@ejemplo.com','URLField':'https://ejemplo.com',
 'SlugField':'slug-ejemplo','UUIDField':'00000000-0000-0000-0000-000000000000',
 'IntegerField':1,'FloatField':1.0,'DecimalField':'0.00','BooleanField':True,
 'DateField':'2026-01-01','DateTimeField':'2026-01-01T12:00:00-06:00','TimeField':'12:00:00',
 'DurationField':'01:00:00','JSONField':{},'DictField':{},'ListField':[],
 'FileField':'<archivo>','ImageField':'<imagen>','PrimaryKeyRelatedField':1,
 'SlugRelatedField':'slug-ejemplo','IPAddressField':'127.0.0.1','RegexField':'texto',
}
def cp(v): return dict(v) if isinstance(v,dict) else (list(v) if isinstance(v,list) else v)

def ex_field(f, d=0):
    n = type(f).__name__
    if isinstance(f, S.MultipleChoiceField):
        c=list(f.choices.keys()); return [c[0]] if c else []
    if isinstance(f, S.ChoiceField):
        c=list(f.choices.keys()); return c[0] if c else 'opcion'
    if isinstance(f, S.ListSerializer):
        return [] if d>2 else [ex_ser(f.child, d+1)]
    if isinstance(f, S.BaseSerializer):
        return {} if d>2 else ex_ser(f, d+1)
    if isinstance(f, S.ManyRelatedField):
        return [ex_field(f.child_relation, d+1)]
    if isinstance(f, S.ListField):
        try: return [ex_field(f.child, d+1)]
        except Exception: return []
    if n in FE: return cp(FE[n])
    for b,v in FE.items():
        if b[:-5] in n: return cp(v)
    return None

def ex_ser(ser, d=0):
    out={}
    try: fields=ser.fields
    except Exception: return {}
    for k,f in fields.items():
        if f.read_only: continue
        out[k]=ex_field(f,d)
    return out

_cache={}
def ex_cls(cls):
    key=f'{cls.__module__}.{cls.__name__}'
    if key in _cache: return _cache[key]
    try: r=ex_ser(cls())
    except Exception: r=None
    _cache[key]=r
    return r

BODY_RE=re.compile(r"""request\.data(?:\.get\(\s*['"]([A-Za-z_]\w*)['"]|\[\s*['"]([A-Za-z_]\w*)['"]\s*\])""")
QS_RE=re.compile(r"""request\.(?:query_params|GET)(?:\.get(?:list)?\(\s*['"]([A-Za-z_]\w*)['"]|\[\s*['"]([A-Za-z_]\w*)['"]\s*\])""")
SER_RE=re.compile(r"""\b([A-Z]\w*Serializer)\s*\((?:[^()]|\([^()]*\))*?data\s*=\s*request\.data""", re.S)
FILES_RE=re.compile(r"""request\.FILES(?:\.get\(\s*['"]([A-Za-z_]\w*)['"]|\[\s*['"]([A-Za-z_]\w*)['"]\s*\])""")

_REG = None
def _registry():
    global _REG
    if _REG is not None: return _REG
    import pkgutil, apps
    for m in pkgutil.walk_packages(apps.__path__, 'apps.'):
        if m.name.endswith('serializers') or '.serializers.' in m.name:
            try: importlib.import_module(m.name)
            except Exception: pass
    reg = {}
    def rec(c):
        for sub in c.__subclasses__():
            reg.setdefault(sub.__name__, sub)
            rec(sub)
    rec(S.BaseSerializer)
    _REG = reg
    return reg

def resolve_ser(name, module):
    try: mod=importlib.import_module(module)
    except Exception: return None
    c=getattr(mod,name,None)
    if c is None:
        for extra in [module.rsplit('.',1)[0]+'.serializers', module.split('.views')[0]+'.serializers']:
            try:
                m2=importlib.import_module(extra); c=getattr(m2,name,None)
                if c: break
            except Exception: pass
    if c is None:
        c = _registry().get(name)
    return c

def scan(cls, meth):
    fn=getattr(cls,meth,None)
    if fn is None: return {}
    try: src=inspect.getsource(fn)
    except Exception: return {}
    body=set(a or b for a,b in BODY_RE.findall(src))
    # aliases: `data = request.data` -> tambien contar data.get('x')
    for alias in re.findall(r"^\s*(\w+)\s*=\s*request\.data\s*$", src, re.M):
        ar = re.compile(r"\b" + re.escape(alias) + r"(?:\.get\(\s*['\"]([A-Za-z_]\w*)['\"]|\[\s*['\"]([A-Za-z_]\w*)['\"]\s*\])")
        body |= {a or b for a, b in ar.findall(src)}
        body |= {m for m in re.findall(r"['\"]([A-Za-z_]\w*)['\"]\s+in\s+" + re.escape(alias) + r"\b", src)}
    body=sorted(body)
    qs=sorted({a or b for a,b in QS_RE.findall(src)})
    files=sorted({a or b for a,b in FILES_RE.findall(src)})
    sers=SER_RE.findall(src)
    sexample=None; sname=None
    if sers:
        sname=sers[0]
        c=resolve_ser(sname, cls.__module__)
        if c is not None: sexample=ex_cls(c)
    for lit in re.findall(r"(?:allowed_fields|ALLOWED_FIELDS|CAMPOS\w*|campos\w*)\s*=\s*[\[\{]([^\]\}]*)[\]\}]", src):
        body = sorted(set(body) | set(re.findall(r"['\"]([a-z_]\w*)['\"]", lit)))
    return {'body_keys':body,'query_keys':qs,'files':files,
            'req_serializer':sname,'req_example':sexample,
            'doc':(inspect.getdoc(fn) or '').strip().split('\n')[0][:200]}

def try_get_ser(cls, action):
    try:
        v=cls(); v.action=action; v.request=None; v.format_kwarg=None
        c=v.get_serializer_class()
        return c.__name__, ex_cls(c)
    except Exception:
        return None,None

def walk(res, prefix='', out=None):
    if out is None: out=[]
    for p in res.url_patterns:
        if isinstance(p,URLResolver): walk(p, prefix+str(p.pattern), out)
        elif isinstance(p,URLPattern):
            route=prefix+str(p.pattern)
            if not route.startswith('api/') or 'format' in route: continue
            cb=p.callback
            cls=getattr(cb,'cls',None) or getattr(cb,'view_class',None)
            actions=getattr(cb,'actions',None) or {}
            i={'route':route,'name':p.name,
               'view':cls.__name__ if cls else getattr(cb,'__name__',str(cb)),
               'module':cls.__module__ if cls else '',
               'doc':(inspect.getdoc(cls) or '').strip() if cls else ''}
            if cls is None:
                i['methods']=['GET']; out.append(i); continue
            perms=getattr(cls,'permission_classes',None) or []
            i['permissions']=[getattr(c,'__name__',str(c)) for c in perms]
            i['public']=any('AllowAny' in getattr(c,'__name__',str(c)) for c in perms)
            i['filterset_fields']=list(getattr(cls,'filterset_fields',None) or getattr(cls,'filter_fields',None) or [])
            i['search_fields']=list(getattr(cls,'search_fields',None) or [])
            of=getattr(cls,'ordering_fields',None)
            i['ordering_fields']=list(of) if isinstance(of,(list,tuple)) else []
            i['parsers']=[getattr(x,'__name__',str(x)) for x in (getattr(cls,'parser_classes',None) or [])]
            # parser_classes declarado en la propia clase (no el default de DRF)
            own=None
            for k in cls.__mro__:
                if 'parser_classes' in k.__dict__ and k.__module__.startswith('apps.'):
                    own=[getattr(x,'__name__',str(x)) for x in k.__dict__['parser_classes']]; break
            i['parsers_own']=own
            sc=getattr(cls,'serializer_class',None)
            i['serializer']=sc.__name__ if sc else None
            i['serializer_example']=ex_cls(sc) if sc else None
            pm={}; methods=[]
            pairs = list(actions.items()) if actions else [(m,m) for m in ['get','post','put','patch','delete'] if hasattr(cls,m)]
            for http,act in pairs:
                methods.append(http.upper())
                d=scan(cls,act); d['action']=act
                if not d.get('req_example') and http.lower() in ('post','put','patch'):
                    n,e=try_get_ser(cls,act)
                    if e: d['req_serializer']=n; d['req_example']=e
                    elif i['serializer_example']: d['req_serializer']=i['serializer']; d['req_example']=i['serializer_example']
                pm[http.upper()]=d
            i['methods']=methods or ['GET']; i['per_method']=pm
            out.append(i)
    return out

print("---JSONSTART---")
print(json.dumps(walk(get_resolver()), indent=1, default=str))
