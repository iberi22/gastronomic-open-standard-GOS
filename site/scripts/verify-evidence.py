#!/usr/bin/env python3
"""GATE: todo evidence_level debe ser High, Medium o Low.

Por que: la columna nunca se normalizo. Antes de este gate, 43 de 175
estaban fuera de rango (34 con el texto libre "bien establecida", 2
"Moderate", 1 "parcialmente establecida") y 5 eran bloques multilinea.
Un `<span class="badge">{evidence_level}</span>` no falla con esos: no
muestra nada, y por eso nadie lo notaba.

Tambien valida que el frontmatter siga siendo YAML parseable, porque
reescribir el nivel a mano puede romperlo en silencio.

Corre en CI (.github/workflows/ci.yml, job verify-evidence); rc=1 con un
solo valor fuera de rango.
"""
import os
import re
import sys

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CANONICOS = {"High", "Medium", "Low"}
CAMPO = re.compile(r"^evidence_level:(.*)$", re.M)


def evidencia_de(texto):
    """(offset, valor) de cada evidence_level. Bloques multilinea -> None."""
    def valor(m):
        resto = m.group(1).strip()
        if resto == "|":
            return None  # es prosa, no un nivel
        return resto.strip("\"'") or None
    return [(m.start(), valor(m)) for m in CAMPO.finditer(texto)]


def main():
    try:
        import yaml
    except ImportError:
        print("AVISO: pyyaml no disponible, solo se comprueba el campo")
        yaml = None

    raiz = os.path.join(SITE, "src", "content")
    malos, total, bloques = [], 0, 0

    for dirpath, _dirs, files in os.walk(raiz):
        for nombre in files:
            if not nombre.endswith(".md"):
                continue
            ruta = os.path.join(dirpath, nombre)
            rel = os.path.relpath(ruta, SITE)
            with open(ruta, encoding="utf-8", errors="replace") as fh:
                texto = fh.read()

            m = re.match(r"^---\s*\n(.*?)\n---", texto, re.S)
            if yaml and m:
                try:
                    yaml.safe_load(m.group(1))
                except Exception as e:  # noqa: BLE001
                    malos.append((rel, f"YAML INVALIDO: {str(e)[:60]}"))
                    continue

            for _pos, v in evidencia_de(texto):
                total += 1
                if v is None:
                    bloques += 1
                    malos.append((rel, "evidence_level no es un valor: bloque o vacio"))
                elif v not in CANONICOS:
                    malos.append((rel, f"evidence_level={v!r} fuera de High/Medium/Low"))

    print(f"evidence_level revisados: {total}")
    print(f"  canonicos (High/Medium/Low): {total - len(malos)}")
    print(f"  fuera de rango: {len(malos)}   bloques multilinea: {bloques}")
    if malos:
        print("\nno canonicos:")
        for rel, motivo in malos[:40]:
            print(f"  {rel}: {motivo}")
        if len(malos) > 40:
            print(f"  ... y {len(malos) - 40} mas")
    return 1 if malos else 0


if __name__ == "__main__":
    sys.exit(main())