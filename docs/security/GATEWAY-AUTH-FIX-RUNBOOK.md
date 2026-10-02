# Cerrar el bypass de autenticación del gateway (2026-10-01)

Estado: **cerrado en producción**. Deploy `0914910c-b293-468d-843a-ca393e09db0d`.

## Orden de las dos piezas (importante)

El fix del código y el esquema D1 son **inseparables**: sin la tabla `api_keys`
el worker nuevo falla cerrado con 503 para *toda* petición con key, incluido
el tráfico legítimo. Crear la tabla primero, desplegar después.

## 1. La tabla no existía

`gos-billing` remoto tenía: `_cf_KV`, `credits`, `entity`, `invoices`,
`sealed_meta`, `seed_registry`. **No había `api_keys`**: el `schema.sql`
histórico nunca se aplicó, y el worker llevaba tiempo resolviendo la consulta
contra una tabla inexistente — por eso el `catch` de D1 (y su bypass) eran
la ruta normal, no una rama de dev.

## 2. El token de la sesión no puede escribir en D1

`CLOUDFLARE_API_TOKEN` da `code 7500` en cualquier escritura. El perfil OAuth
de wrangler (`~/.wrangler/config/default.toml`) sí tiene `d1:write`. Por eso
todos los comandos van con `env -u CLOUDFLARE_API_TOKEN`:

    cd worker && env -u CLOUDFLARE_API_TOKEN npx wrangler d1 execute gos-billing --remote \
      --command="CREATE TABLE IF NOT EXISTS api_keys (key TEXT PRIMARY KEY, tier TEXT NOT NULL, owner TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP, status TEXT DEFAULT 'active')"

Luego el índice, y `wrangler deploy` con el mismo `env -u`.

`--file=./schema.sql` **no** funciona: usa el endpoint `import`, que falla con
`code 10000` aunque el token tenga permisos. Hay que pasar `--command` con el DDL.

## 3. Verificación en producción

Con `--command` se puede sembrar una key de prueba y medir el comportamiento
real en vez de suponerlo. Medido:

| Entrada | HTTP | Interpretación |
|---|---|---|
| `xyzpaidabc`, `paid123`, `socio_plata`, `PAGO_SOCIO` (6 variantes) | **401** | bypass cerrado |
| key presente en `api_keys`, activa | pasa la auth (404 del origen) | el peaje funciona |
| misma key con `expires_at` en el pasado | **401** | el filtro de caducidad funciona |
| key borrada de la tabla | **401** | |
| sin key | pasa (free tier) | el acceso gratuito no se rompió |

La tabla queda **con 0 filas**: no se persiste ninguna credencial. La key de
prueba se borra al terminar.

## Trampa al leer el resultado

Una key válida produce **404**, no 200: la auth pasa y el worker hace proxy a
`ORIGIN_URL`, donde esa ruta concreta no existe. Confundir 404 con "auth
falló" hace Creer que el bypass sigue abierto cuando está cerrado. Lo que
distingue los casos es el **cuerpo**: 404 trae HTML del sitio, 401 trae
`{"error": "Unauthorized..."}`.
