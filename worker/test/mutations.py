#!/usr/bin/env python3
"""Reintroduce una rama vulnerable del auth del gateway GOS, de una en una.

Cada mutacion devuelve (nombre, codigo_parcheado_o_None). `None` significa que
el ancla no se encontro y por tanto la mutacion NO se aplico: eso es un fallo
del propio gate, no un OK.

Se usa desde test/mutation-check.sh, que aplica, corre la suite y revierte.
"""
import re
import sys

# --- Anclas exactas del codigo fijado --------------------------------------
CATCH_ANCLA = "          console.error('D1 key check error:', dbErr)\n"
CATCH_503_ANCLA = """          return validationUnavailable(
            'The key store could not be queried. This is a server-side failure.',
          )
"""
NO_DB_BLOCK_ANCLA = """        console.error('DB binding missing: refusing to authenticate any key')
        return validationUnavailable(
          'No key store is bound to this Worker, so no key can be validated.',
        )
"""
SQL_ANCLA = (
    '              "AND (expires_at IS NULL OR datetime(expires_at) > datetime(\'now\'))",\n'
)
BIND_ANCLA = "          const result = await stmt.bind(apiKey, 'active').first<{\n"

SENT = "MUTATION_SENTINEL"


def mut_1_catch_substring(s: str):
    """BUG ORIGINAL: en el catch de D1, 'socio'/'paid' => paid y SE SIGUE
    hacia el proxy (no se devuelve ninguna respuesta de error)."""
    if CATCH_ANCLA not in s or CATCH_503_ANCLA not in s:
        return None
    inject = (
        CATCH_ANCLA
        + f"          // {SENT}\n"
        + "          if (apiKey.includes('socio') || apiKey.includes('paid')) {\n"
        + "            isPaidKey = true\n"
        + "            keyTier = 'tiersocio'\n"
        + f"            // {SENT}: continue, como hacia el codigo original\n"
        + "          }\n"
    )
    # El 503 se conserva: solo se antepone el grant, como en el bug original
    # (donde el grant ocurria y la respuesta de error solo salia si NO
    # matcheaba). El flag `isPaidKey` es lo que hace equivalentes ambos codigos.
    out = s.replace(CATCH_ANCLA, inject, 1)
    out = out.replace(
        CATCH_503_ANCLA,
        f"""          if (!isPaidKey) {{
            // {SENT}: solo si no hubo grant por subcadena
            return validationUnavailable(
              'The key store could not be queried. This is a server-side failure.',
            )
          }}
""",
        1,
    )
    return out


def mut_2_no_db_substring(s: str):
    """BUG ORIGINAL: sin binding DB, 'socio'/'paid' => paid y sigue al proxy.

    Se reemplaza el bloque entero (no se anida) para reproducir el codigo
    original, en el que no existia ninguna respuesta 503 en esta rama.
    """
    block_ancla = NO_DB_BLOCK_ANCLA
    if block_ancla not in s:
        return None
    return s.replace(
        block_ancla,
        f"""        // {SENT}: fallback original por subcadena
        if (apiKey.includes('socio') || apiKey.includes('paid')) {{
          isPaidKey = true
          keyTier = 'tiersocio'
        }} else {{
          return jsonResponse({{ error: 'Unauthorized: Invalid API key' }}, 401)
        }}
""",
        1,
    )


def mut_3_d1_error_401(s: str):
    """El fallo de D1 degrada a 401 en vez de 503 (rompe el fail-closed)."""
    if CATCH_503_ANCLA not in s:
        return None
    return s.replace(
        CATCH_503_ANCLA,
        f"""          // {SENT}: degradado a 401
          return jsonResponse({{ error: 'Unauthorized: Key validation failed' }}, 401)
""",
        1,
    )


def mut_4_ignore_expires(s: str):
    """La consulta ignora expires_at: una key expirada vuelve a pasar.

    Se sustituye el literal por la cadena vacia (no por un comentario) porque
    forma parte de una concatenacion: dejar un ahi rompe la sintaxis y el test
    suite quedaria verde por un error de parseo, no por una deteccion real.
    """
    if SQL_ANCLA not in s:
        return None
    return s.replace(
        SQL_ANCLA,
        f"              '' /* {SENT}: expires_at ignorado */,\n",
        1,
    )


def mut_5_ignore_status(s: str):
    """El status deja de filtrarse: una key suspendida/revocada pasa."""
    if BIND_ANCLA not in s:
        return None
    return s.replace(
        BIND_ANCLA,
        "          // MUTATION_SENTINEL: status ignorado\n"
        "          const result = await stmt.bind(apiKey, '%s' % apiKey).first<{\n",
        1,
    )


MUTATIONS = [
    ("catch de D1 acepta 'socio'/'paid' (CVE original)", mut_1_catch_substring),
    ("fallback sin binding DB acepta 'socio'/'paid'", mut_2_no_db_substring),
    ("fallo de D1 degrada a 401 en vez de 503", mut_3_d1_error_401),
    ("la consulta ignora expires_at (key expirada pasa)", mut_4_ignore_expires),
    ("la consulta ignora el status (key revocada pasa)", mut_5_ignore_status),
]


def main() -> int:
    args = sys.argv[1:]
    if len(args) == 1 and args[0] == "list":
        for i, (name, _) in enumerate(MUTATIONS, 1):
            print(f"{i}\t{name}")
        return 0
    if len(args) != 2:
        print("uso: mutations.py <list | 1..N> <src/index.ts>", file=sys.stderr)
        return 2
    which, path = args

    if which == "list":
        for i, (name, _) in enumerate(MUTATIONS, 1):
            print(f"{i}\t{name}")
        return 0

    src = open(path).read()
    idx = int(which) - 1
    if idx < 0 or idx >= len(MUTATIONS):
        print(f"mutacion {which} fuera de rango", file=sys.stderr)
        return 2
    name, fn = MUTATIONS[idx]

    out = fn(src)
    if out is None:
        print(f"ANCHAL_NO_ENCONTRADO: {name}", file=sys.stderr)
        return 3
    if SENT not in out:
        print(f"SENTINEL_AUSENTE: {name}", file=sys.stderr)
        return 3
    # sanity: el parche debe haber cambiado algo de verdad
    if out == src:
        print(f"MUTACION_SIN_EFECTO: {name}", file=sys.stderr)
        return 3
    open(path, "w").write(out)
    print(f"mutacion aplicada: {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
