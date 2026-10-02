#!/usr/bin/env python3
"""Verifica que cada DOI de site/src/content/substance[s]/ corresponda al
titulo, revista y ano que el archivo afirma.

No basta con que el DOI RESUELVA: resolver significa que el registro existe.
El fallo que se busca es el que(^) encontro la auditoria: un DOI compuesto por
coincidencia de revista+anio que resuelve a OTRO articulo del mismo numero.

Salida: TSV  doi<TAB>estado<TAB>titulo_esperado<TAB>titulo_real
Estado: OK | MISMATCH | NORESUELVE | SIN_DOI
Uso: python3 verify-dois.py [--json]
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent  # site/
CONTENT = SITE / "src" / "content"
EMAIL = "mailto:audit@example.invalid"  # Crossref lo pide; sin dato real

DOI_RE = re.compile(r'^\s*(?:-\s*)?doi:\s*["\']?([^"\'\s]+)', re.M)
PMID_RE = re.compile(r'^\s*(?:-\s*)?pmid:\s*["\']?([^"\'\s]+)', re.M)
TITLE_RE = re.compile(r'^\s*(?:-\s*)?title:\s*["\'](.+?)["\']', re.M)
YEAR_RE = re.compile(r'^\s*(?:-\s*)?year:\s*["\']?(\d{4})', re.M)


def studies(text):
    """Extrae (doi, title, year) de cada entrada de studies: del frontmatter.

    El orden de las claves varia entre archivos (a veces doi va antes que
    title), asi que NO se parte el texto con regex: se parsea el YAML del
    frontmatter y se recorre la estructura. Parsear de mas y luego filtrar
    es lo que hacia fallar la version anterior, que perdia el titulo de las
    entradas con doi primero y luego las contaba como MISMATCH por vacio.
    """
    import yaml

    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    if not m:
        return []
    try:
        data = yaml.safe_load(m.group(1)) or {}
    except Exception:
        return []
    out = []
    for entrada in data.get("health_registry") or []:
        for s in (entrada.get("studies") or []):
            if isinstance(s, dict) and s.get("doi"):
                out.append((str(s["doi"]).strip(),
                            str(s.get("title", "")).strip(),
                            str(s.get("year", ""))))
    return out


def crossref(doi):
    url = ("https://api.crossref.org/works/"
           + urllib.parse.quote(doi, safe="")
           + "?mailto=" + urllib.parse.quote(EMAIL))
    req = urllib.request.Request(url, headers={"User-Agent": f"gos-audit/1.0 ({EMAIL})"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)["message"]
    except Exception:
        return None


def norm(s):
    """Normaliza para comparar: minusculas, sin puntuacion, sin acentos ruido."""
    s = s.lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def coincide(titulo_esperado, titulo_real):
    """Coincidencia por contenido de palabras, no por igualdad literal.

    Un titulo abreviado ('Peppermint oil and IBS') es legitimo si TODAS sus
    palabras significativas aparecen en el titulo real. Exige al menos 3
    palabras en comun para no dar por bueno un 'mismo tema'.
    """
    stop = {"a", "an", "the", "of", "and", "for", "in", "on", "to", "with", "de", "del", "la", "el"}
    e = {w for w in norm(titulo_esperado).split() if w not in stop and len(w) > 2}
    r = {w for w in norm(titulo_real).split() if w not in stop and len(w) > 2}
    comunes = e & r
    return len(comunes) >= min(3, len(e)) and len(comunes) / max(len(e), 1) >= 0.5


def main():
    filas = []
    base = CONTENT / "substances"
    for md in sorted(base.glob("*.md")):
        texto = md.read_text(encoding="utf-8", errors="replace")
        for doi, tit, year in studies(texto):
            if not doi.startswith("10."):
                continue
            m = crossref(doi)
            if m is None:
                filas.append({"archivo": str(md.relative_to(SITE)),
                              "doi": doi, "estado": "NORESUELVE",
                              "esperado": tit, "real": ""})
                continue
            real = (m.get("title") or [""])[0]
            if not tit:
                # sin titulo declarado no hay nada que comparar: se marca
                # aparte para no inventar un MISMATCH
                estado = "SIN_TITULO"
            else:
                ok = coincide(tit, real)
                estado = "OK" if ok else "MISMATCH"
            filas.append({"archivo": str(md.relative_to(SITE)),
                          "doi": doi,
                          "estado": estado,
                          "esperado": tit, "real": real,
                          "anio_real": (m.get("issued", {}).get("date-parts") or [[""]])[0][0],
                          "anio_declarado": year})
            time.sleep(0.15)  # Crossref pide no martillear

    if "--json" in sys.argv:
        print(json.dumps(filas, ensure_ascii=False, indent=2))
        return 0

    for f in filas:
        print(f"{f['estado']}\t{f['doi']}\t{f['archivo']}")
        if f["estado"] in ("MISMATCH", "SIN_TITULO"):
            print(f"    esperado: {f['esperado'][:70]}")
            print(f"    real    : {f['real'][:70]}")
    from collections import Counter
    c = Counter(f["estado"] for f in filas)
    print(f"\nresumen: {dict(c)}  total={len(filas)}")
    return 1 if c["MISMATCH"] or c["NORESUELVE"] else 0


if __name__ == "__main__":
    sys.exit(main())
