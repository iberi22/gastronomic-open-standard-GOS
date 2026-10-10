#!/usr/bin/env python3
"""GATE: verifica que cada DOI de site/src/content/substance[s]/ corresponda al
titulo, revista y ano que el archivo afirma.

Se ejecuta en CI (.github/workflows/ci.yml, job verify-dois). Devuelve
rc=1 si hay un solo MISMATCH o NORESUELVE.

No basta con que el DOI RESUELVA: resolver significa que el registro existe.
El fallo que se busca es el que encontró la auditoría: un DOI compuesto por
coincidencia de revista+anio que resuelve a OTRO articulo del mismo numero.

Salida: TSV  doi<TAB>estado<TAB>titulo_esperado<TAB>titulo_real
Estado: OK | MISMATCH | NORESUELVE | SIN_TITULO

Modos:
  python3 verify-dois.py            gate real contra Crossref (rc 0 = todo OK)
  python3 verify-dois.py --json     misma salida en JSON
  python3 verify-dois.py --self-test  control negativo OFFLINE: no toca la red

El --self-test existe por la regresion N-01 (CC-VALIDATION-2026-10-02): el gate
llego a commitarse con norm() roto (regex [a-z0-9 ] sin el `^`), que borraba
las letras de todo titulo y los daba todos por MISMATCH. El gate quedaba rojo
permanente y dejaba de distinguir un DOI bueno de uno falso. --self-test fija
norm(), coincide() y el contrato de exit codes con datos propios, asi que esa
regresion se detecta sin gastar Crossref y sin depender de la red.
"""
import json
import re
import tempfile
import unicodedata
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
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
    try:
        import yaml
    except ModuleNotFoundError as exc:  # pragma: no cover - solo en entornos pelados
        # Antes el import estaba fuera del try: sin PyYAML el gate moria con
        # traceback crudo en lugar de decir que le falta una dependencia.
        raise SystemExit(
            "verify-dois: falta PyYAML (pip install pyyaml); sin el no se "
            "puede leer el frontmatter y el gate no verifica nada"
        ) from exc

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
    """Normaliza para comparar: minusculas, sin puntuacion, sin acentos.

    Se SUSTITUYE lo que no es alfanumerico por espacio (para no pegar
    "anti-allergic" en una sola palabra), y se elimina lo sobrante.

    El fallo anterior era usar re.sub(r"[a-z0-9 ]", " ", s), que reemplaza
    cada caracter por un espacio: "peppermint" se convertia en 10 espacios y
    todo titulo terminaba en cadena vacia. Con eso palabras() no encontraba
    nada, la cobertura era 0 y los 44 DOI salian MISMATCH.
    """
    s = str(s).lower()
    # quitar diacriticos antes de decidir que es alfanumerico
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    # todo lo que no sea [a-z0-9] pasa a espacio
    s = re.sub(r"[^a-z0-9]+", " ", s)
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


# Estados que rompen el gate. SIN_TITULO cuenta: un DOI sin titulo
# declarado no se puede COMPARAR con nada, y el contrato del endpoint de
# evidencia («cada doi resuelve en Crossref») quedaria sin respaldo.
ESTADOS_DE_FALLO = ("MISMATCH", "NORESUELVE", "SIN_TITULO")


def verificar(base: Path, crossref_fn=crossref, pausa: float = 0.15) -> list:
    """Recorre base/ (dir con .md de sustancias) y devuelve una fila por DOI."""
    filas = []
    for md in sorted(base.glob("*.md")):
        texto = md.read_text(encoding="utf-8", errors="replace")
        try:
            nombre = str(md.relative_to(SITE))
        except ValueError:
            # fixture temporal del --self-test: fuera de site/ no hay ruta
            # relativa que tenga sentido
            nombre = md.name
        for doi, tit, year in studies(texto):
            if not doi.startswith("10."):
                continue
            m = crossref_fn(doi)
            if m is None:
                filas.append({"archivo": nombre,
                              "doi": doi, "estado": "NORESUELVE",
                              "esperado": tit, "real": ""})
                continue
            real = (m.get("title") or [""])[0]
            if not tit:
                # sin titulo declarado no hay nada que comparar
                estado = "SIN_TITULO"
            else:
                ok = coincide(tit, real)
                estado = "OK" if ok else "MISMATCH"
            filas.append({"archivo": nombre,
                          "doi": doi,
                          "estado": estado,
                          "esperado": tit, "real": real,
                          "anio_real": (m.get("issued", {}).get("date-parts") or [[""]])[0][0],
                          "anio_declarado": year})
            if pausa:
                time.sleep(pausa)  # Crossref pide no martillear
    return filas


def estado_de(filas: list) -> Counter:
    return Counter(f["estado"] for f in filas)


def rc_de(filas: list) -> int:
    """rc=1 si queda un solo estado de fallo, 0 si todo es OK."""
    c = estado_de(filas)
    return 1 if any(c[e] for e in ESTADOS_DE_FALLO) else 0


def imprimir(filas: list) -> None:
    for f in filas:
        print(f"{f['estado']}\t{f['doi']}\t{f['archivo']}")
        if f["estado"] in ESTADOS_DE_FALLO:
            print(f"    esperado: {f['esperado'][:70]}")
            print(f"    real    : {f['real'][:70]}")
    print(f"\nresumen: {dict(estado_de(filas))}  total={len(filas)}")


# ---------------------------------------------------------------------------
# Control negativo offline (--self-test)
# ---------------------------------------------------------------------------

# DOI reales (ya presentes en el corpus) con el titulo que devuelve Crossref.
# Se reutilizan a proposito: el control negativo NO inventa DOI, y asi tampoco
# puede dejar un DOI falso escrito en el repo.
CROSSREF_STUB = {
    "10.3390/molecules21050623": {
        "title": ["Quercetin and allergic diseases"],
        "issued": {"date-parts": [[2016]]},
    },
    "10.1161/JAHA.115.002713": {
        "title": ["Quercetin and blood pressure: meta-analysis"],
        "issued": {"date-parts": [[2016]]},
    },
}

FIXTURAS = {
    "ok.md": (
        "Quercetina", "10.3390/molecules21050623", "Quercetin and allergic diseases"
    ),
    "mismatch.md": (
        "Quercetina",
        "10.3390/molecules21050623",
        "Effects of bread baking on crumb structure",
    ),
    "sin-titulo.md": ("Quercetina", "10.1161/JAHA.115.002713", None),
    "sin-doi.md": ("Quercetina", None, None),
}


def escribir_fixture(ruta: Path, nombre: str, doi: str | None, titulo: str | None) -> None:
    bloque = ["---", f"name: {nombre}", "health_registry:", "- studies:"]
    if doi:
        bloque.append(f"  - doi: {doi}")
        bloque.append("    source: Molecules")
        if titulo:
            bloque.append(f"    title: '{titulo}'")
        bloque.append("    year: 2016")
        bloque.append("  evidence_level: Medium")
    else:
        bloque.append("  - source: Molecules")
        bloque.append("    year: 2016")
        bloque.append("  evidence_level: Medium")
    bloque += ["---", "cuerpo de prueba\n"]
    ruta.write_text("\n".join(bloque), encoding="utf-8")


def fallos_norm() -> list:
    """Regresion N-01: la regex que se commiteo era [a-z0-9 ] sin `^`.

    Reemplazaba cada CARACTER por un espacio, asi que 'peppermint' se
    convertia en diez espacios, la cobertura de palabras quedaba a 0 y los
    44 DOI salian MISMATCH. Un gate roto en ese sentido no distingue nada:
    marca todo como fallo, incluido el DOI correcto.
    """
    malos = []
    casos = [
        ("Peppermint oil and IBS", ["peppermint", "oil", "ibs"]),
        ("anti-allergic", ["anti", "allergic"]),
        ("Menopausia y sofocos", ["menopausia", "sofocos"]),
        ("10.3390/molecules21050623", ["10", "3390", "molecules21050623"]),
    ]
    for original, esperadas in casos:
        obtenido = norm(original).split()
        for palabra in esperadas:
            if palabra not in obtenido:
                malos.append(
                    f"norm({original!r}) perdio {palabra!r}: devolvio {obtenido!r}"
                )
    return malos


def fallos_coincide() -> list:
    malos = []
    casos = [
        # (esperado, real, debe_coincidir, etiqueta)
        ("Peppermint oil and IBS",
         "Peppermint oil in irritable bowel syndrome", True, "abreviatura"),
        ("allergic", "anti-allergic properties of mint", True, "afijo"),
        ("anti-allergic", "allergic reactions in mice", False, "afijo asimetrico"),
        ("Quercetin and blood pressure: meta-analysis",
         "Quercetin and blood pressure", True, "reformulacion"),
        ("Quercetin and blood pressure",
         "Effects of bread baking on crumb structure", False, "otro tema"),
    ]
    for esperado, real, debe, etiqueta in casos:
        if coincide(esperado, real) is not debe:
            malos.append(
                f"coincide() fallo en el caso {etiqueta}: "
                f"{esperado!r} vs {real!r} deberia ser {debe}"
            )
    return malos


def fallos_exit_codes() -> list:
    """El contrato del gate: con un DOI falseado rc!=0; con el corpus limpio rc=0."""
    malos = []
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        for nombre, (display, doi, titulo) in FIXTURAS.items():
            escribir_fixture(base / nombre, display, doi, titulo)

        sucio = verificar(base, crossref_fn=CROSSREF_STUB.get, pausa=0)
        estados = estado_de(sucio)
        if estados.get("MISMATCH", 0) < 1:
            malos.append("un titulo que no corresponde al DOI no se detecto (MISMATCH)")
        if estados.get("SIN_TITULO", 0) < 1:
            malos.append("un DOI sin titulo declarado no se detecto (SIN_TITULO)")
        if estados.get("OK", 0) < 1:
            malos.append("el DOI correcto no salio OK: el gate ni siquiera acierta los buenos")
        if estados.get("OK", 0) != 1 or len(sucio) != 3:
            malos.append(f"se midieron {len(sucio)} filas, se esperaban 3: {dict(estados)}")
        if rc_de(sucio) == 0:
            malos.append("con un DOI falseado el gate devolvio rc=0: no muerde")

        (base / "mismatch.md").unlink()
        (base / "sin-titulo.md").unlink()
        limpio = verificar(base, crossref_fn=CROSSREF_STUB.get, pausa=0)
        if rc_de(limpio) != 0:
            malos.append(f"corpus limpio dio rc!=0: {dict(estado_de(limpio))}")
    return malos


def self_test() -> int:
    malos = fallos_norm() + fallos_coincide() + fallos_exit_codes()
    if malos:
        print("SELF-TEST FAIL: el gate de DOI esta roto")
        for m in malos:
            print(f"  - {m}")
        return 1
    print("SELF-TEST OK: norm(), coincide() y los exit codes muerden")
    print("  (control negativo offline: DOI falseado -> rc 1, DOI correcto -> rc 0)")
    return 0


# ---------------------------------------------------------------------------
# Control negativo real (--negative-control)
# ---------------------------------------------------------------------------

# DOI que no resuelve (404 en Crossref y en doi.org). Solo existe como
# fixture temporal de este control: nunca se escribe en site/src/content.
DOI_INEXISTENTE = "10.9999/gos-control-negativo-no-resuelve-0001"
TITULO_AJENO = "Effects of bread baking on crumb structure"


def primer_doi_real() -> tuple[str | None, str]:
    """Devuelve (doi, titulo) de un DOI ya publicado, con su titulo declarado.

    Se reutiliza a proposito: el control negativo no inventa referencias, asi
    que tampoco puede dejar una en el repo.
    """
    base = CONTENT / "substances"
    candidatos = [base / "quercetina.md"] + sorted(base.glob("*.md"))
    for md in candidatos:
        if not md.exists():
            continue
        for doi, titulo, _ in studies(md.read_text(encoding="utf-8", errors="replace")):
            if doi.startswith("10.") and titulo:
                return doi, titulo
    return None, ""


def negative_control() -> int:
    """Control negativo con Crossref de verdad: gate corriendo sobre copias
    temporales, no sobre el repo. Nada se escribe dentro de site/src/content.

    Comprueba las tres cosas que un gate asi debe cumplir:
      1. un DOI publicado con SU titulo  -> OK       y rc 0
      2. el mismo DOI con titulo ajeno   -> MISMATCH y rc 1
      3. un DOI que no resuelve          -> NORESUELVE y rc 1
    """
    doi, titulo_real = primer_doi_real()
    if not doi:
        print("NEGATIVE-CONTROL FAIL: no se encontro ningun DOI publicado")
        return 1

    malos = []
    with tempfile.TemporaryDirectory() as tmp:
        raiz = Path(tmp)

        def caso(nombre: str, doi_caso: str, titulo: str | None) -> tuple[int, Counter]:
            carpeta = raiz / nombre
            carpeta.mkdir()
            escribir_fixture(carpeta / "fixture.md", "Control", doi_caso, titulo)
            filas = verificar(carpeta, pausa=0)
            return rc_de(filas), estado_de(filas)

        rc_bueno, estados_bueno = caso("positivo", doi, titulo_real)
        print(f"control positivo: {doi} con su titulo -> {dict(estados_bueno)}")
        if rc_bueno != 0 or estados_bueno.get("OK", 0) < 1:
            malos.append(f"el DOI {doi} con su titulo real no salio OK")

        rc_mal, estados_mal = caso("mismatch", doi, TITULO_AJENO)
        print(f"titulo ajeno     : {doi} -> {dict(estados_mal)}")
        if rc_mal == 0 or estados_mal.get("MISMATCH", 0) < 1:
            malos.append("un titulo que no corresponde al DOI no rompio el gate (MISMATCH)")

        rc_nores, estados_nores = caso("noresuelve", DOI_INEXISTENTE, titulo_real)
        print(f"DOI inexistente  : {DOI_INEXISTENTE} -> {dict(estados_nores)}")
        if rc_nores == 0 or estados_nores.get("NORESUELVE", 0) < 1:
            malos.append("un DOI que no resuelve no rompio el gate (NORESUELVE)")

    if malos:
        print("NEGATIVE-CONTROL FAIL: el gate de DOI no muerde")
        for m in malos:
            print(f"  - {m}")
        return 1
    print("NEGATIVE-CONTROL OK: el gate distingue un DOI bueno de uno falseado")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    if "--negative-control" in sys.argv:
        return negative_control()

    filas = verificar(CONTENT / "substances")

    if "--json" in sys.argv:
        print(json.dumps(filas, ensure_ascii=False, indent=2))
        return 0

    imprimir(filas)
    return rc_de(filas)


if __name__ == "__main__":
    sys.exit(main())
