# Colección Postman — PyCore ERP API v1

`PyCore-ERP-API-v1.postman_collection.json` cubre **332 peticiones** sobre **253 rutas** en **20 dominios**,
generada por introspección del `URLconf` de Django (no escrita a mano).

## Importar

1. Postman → **Import** → arrastra `PyCore-ERP-API-v1.postman_collection.json`.
2. Importa también el entorno que corresponda:
   - `PyCore-Local.postman_environment.json` → `http://localhost:8082`
   - `PyCore-Produccion.postman_environment.json` → `https://api.plataforma.pycore.app`
3. Llena `email` y `password` en el entorno (usa **Current value** para no versionar la contraseña).
4. Corre **02 · Autenticación → Iniciar sesión**. El script de test guarda solo
   `access_token`, `refresh_token` y `empresa_id`; el resto de la colección los hereda.

## Qué trae cada petición

- **Auth** heredada de la colección (`Bearer {{access_token}}`); los endpoints `AllowAny` van como `noauth`
  y los de `/api/v1/store/` usan `{{store_access}}` (token de cliente storefront, dominio distinto).
- **Cuerpos JSON** derivados del serializer real de cada vista; los valores son placeholders por tipo.
- **Query params** deshabilitados por defecto, salvo los obligatorios. Salen de `filterset_fields`,
  `search_fields`, `ordering_fields` y de las lecturas de `request.query_params` en la vista.
- **Descripción** con la clase de la vista, su módulo, el URL name, los permisos y el serializer de entrada.
- **Parámetros de ruta** como variables por recurso (`{{venta_id}}`, `{{producto_id}}`, `{{store_slug}}`…),
  cada una con el tipo esperado (entero / UUID / slug) en su descripción.

## Regenerar

Con los contenedores arriba:

```bash
docker compose exec -T backend python manage.py shell < docs/postman/dump2.py \
  | sed -n '/---JSONSTART---/,$p' | tail -n +2 > /tmp/api2.json
python3 docs/postman/gen.py
```

`dump2.py` introspecciona el `URLconf`, los serializers y el código de cada vista.
`gen.py` arma la colección; `naming.py` tiene los diccionarios de nomenclatura en español.
Las rutas de entrada/salida están fijas al principio de `gen.py` — ajústalas si las mueves.

## Notas

- Los webhooks (`billing/webhook`, `store/mp/webhook`) validan firma; desde Postman devuelven `400`.
  Están como documentación de forma. Usa `stripe listen --forward-to` para probarlos de verdad.
- `403` en billing admin, soporte o facturación es esperado: son gates de superadmin o de plan.
- `api/v1/notificaciones/` tiene el `NotificacionViewSet` registrado en `''` del router, que choca con el
  índice del `DefaultRouter`. En la colección se conservó el listado real del viewset.
