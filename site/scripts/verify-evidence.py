#!/usr/bin/env python3
"""GATE: todo evidence_level debe ser High, Medium o Low.

Por que existe: la columna nunca se normalizo. Medido antes de este gate:
175 evidence_level, 43 fuera de rango. 34 con el texto libre "bien
establecida", 2 con "Moderate", 1 con "parcialmente establecida", y 5 con un
bloque multilinea que ninguna pagina podia leer como valor.

Un consumer como `<span class="badge">{evidence_level}</span>` no falla de
forma visible: simplemente no muestra nada, o muestra el texto entero en
lugar de un nivel. Por eso el inconsistency Passaba desapercibido.

Este gate corre en CI (.github/workflows/ci.yml, job verify-evidence).
Devuelve rc=1 si hay un solo valor no canonico.

Tambien comprueba que los archivos modificados siguen siendo YAML valido:
escribir un nivel a mano sobre un frontmatter puede romperlo en silencio.
"""
import os
import re
import sys

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CANONICOS = {"High", "Medium", "Low"}
CAMPO = re.compile(r"^evidence_level:(.*)$", re.M)


def evidencia_de(texto):
    """(linea, valor) de cada evidence_level. Bloques multilinea -> '<BLOQUE>'."""
    out = []
    for m in CAMPO.finditer(texto):
        resto = m.group(1).strip()
        if resto == "|":
            out.append((m.start(), "<BLOQUE MULTILINEA>"))
            continue
        if not resto:
            out.append((m.start(), "<VACIO>"))
            continue
        v = resto.strip().strip('"').strip("'")
        out.append((m.start(), v))
    return out


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

            for _pos, valor in evidencia_de(texto):
                total += 1
                if valor == "<BLOQUE MULTILINEA>":
                    bloques += 1
                    malos.append((rel, "evidence_level es un bloque multilinea, no un nivel"))
                elif valor not in CANONICOS:
                    malos.append((rel, f"evidence_level={valor!r} fuera de High/Medium/Low"))

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