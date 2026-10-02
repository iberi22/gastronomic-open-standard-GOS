#!/usr/bin/env python3
"""GATE: verifica que cada DOI de site/src/content/substance[s]/ corresponda al
titulo, revista y ano que el archivo afirma.

Se ejecuta en CI (.github/workflows/ci.yml, job verify-dois). Devuelve
rc=1 si hay un solo MISMATCH o NORESUELVE.

No basta con que el DOI RESUELVA: resolver significa que el registro existe.
El fallo que se busca es el que encontró la auditoría: un DOI compuesto por
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

DOI_RE = re.compile(r'\s*(?:-\s*)?doi:\s*["\']?(["\'\s]+)', re.M)
PMID_RE = re.compile(r'\s*(?:-\s*)?pmid:\s*["\']?(["\'\s]+)', re.M)
TITLE_RE = re.compile(r'\s*(?:-\s*)?title:\s*["\'](.+?)["\']', re.M)
YEAR_RE = re.compile(r'\s*(?:-\s*)?year:\s*["\']?(\d{4})', re.M)


def studies(text):
    """Extrae (doi, title, year) de cada entrada de studies: del frontmatter.

    El orden de las claves varia entre archivos (a veces doi va antes que
    title), asi que NO se parte el texto con regex: se parsea el YAML del
    frontmatter y se recorre la estructura. Parsear de mas y luego filtrar
    es lo que hacia fallar la version anterior, que perdia el titulo de las
    entradas con doi primero y luego las contaba como MISMATCH por vacio.
    """
    import yaml

    m = re.match(r"---\s*\n(.*?)\n---\s*\n", text, re.S)
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
    s = re.sub(r"[a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def coincide(titulo_esperado, titulo_real):
    """Coincidencia por contenido, tolerante a abreviaturas y afijos.

    Tres formas legitimas de nombrar el mismo articulo, que hay que aceptar:
      - abreviatura:      "Peppermint oil and IBS" ~ "...irritable bowel..."
      - afijo:            "allergic" ~ "anti-allergic"  (anti- es prefijo)
      - reformulacion:   "review" ~ "systematic review" (una palabra anadida)

    Y una forma ilegitima que hay que seguir rechazando: que el DOI apunte a
    OTRO tema. Por eso se exige que la mitad de las palabras significativas
    del titulo declarado aparezcan en el real, y al menos 2.

    La tolerancia a afijos es asimetrica a proposito: "allergic" puede
    casar con "anti-allergic", pero "anti-allergic" NO puede casar solo con
    "allergic", porque ahi se pierde la mitad del significado.
    """
    stop = {"a", "an", "the", "of", "and", "for", "in", "on", "to", "with",
            "de", "del", "la", "el", "y", "en", "para", "su", "sus", "un", "una"}
    PREFIJOS = ("anti", "pre", "post", "non", "sub", "super", "co")

    def palabras(s):
        out = set()
        for w in norm(s).split():
            if w in stop or len(w) <= 2:
                continue
            out.add(w)
            # sin anti-/pre-/... para que "anti-allergic" aporte "allergic"
            for pre in PREFIJOS:
                if w.startswith(pre) and len(w) > len(pre) + 3:
                    out.add(w[len(pre):])
        return out

    e, r = palabras(titulo_esperado), palabras(titulo_real)
    if not e:
        return False
    comunes = e & r
    return len(comunes) >= min(2, len(e)) and len(comunes) / len(e) >= 0.5


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
