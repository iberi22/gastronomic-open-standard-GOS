#!/usr/bin/env python3
"""Fail when a corrected GOS audit invariant regresses.

Blocked gaps (China unpublished, fewer than five real sources, the review
queue) are printed and do not fail this command. Inventing nutrition numbers
or copying dishes/china is not a way to turn those lines green.
"""
import json
import pathlib
import re
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parents[3]
SITE = REPO / "site" / "src" / "content"
ING = SITE / "ingredients"


def has_positive(value):
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return value > 0
    if isinstance(value, dict):
        return any(has_positive(item) for item in value.values())
    if isinstance(value, list):
        return any(has_positive(item) for item in value)
    return False


def source_count(record):
    sources = record.get("sources")
    if isinstance(sources, list):
        return sum(1 for item in sources if str(item).strip())
    if isinstance(sources, str) and sources.strip():
        return 1
    return 0


def lang_count(record):
    codes = set()
    for key in ("i18n", "aliases"):
        block = record.get(key)
        if isinstance(block, dict):
            codes.update(str(name) for name in block)
    return len(codes)


REQUIRED_IDS = (
    "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9",
    "F1", "F2", "F3", "F13", "F14",
    "P1", "P2", "P3", "P4", "P5", "P6",
)
TERMINAL = ("done", "blocked", "confirmed", "needs-owner", "deferred")
FIXED_STATUS = {
    "C1": "done", "C2": "done", "C3": "done", "C4": "done", "C5": "done",
    "C6": "done", "C7": "done", "C8": "done", "C9": "done", "P1": "done",
    "F1": "confirmed", "F14": "confirmed",
    "F2": "blocked", "F3": "blocked", "F13": "blocked", "P3": "blocked", "P6": "blocked",
    "P4": "needs-owner",
    "P5": "deferred",
}
READING_TARGETS = (
    "skills/README.md",
    ".gitcore/planning/PLANNING.md",
    ".gitcore/planning/TASK.md",
    "docs/SRS/REQUIREMENTS.md",
    "skills/gos-audit-gate/SKILL.md",
)
STATUS_ROW = re.compile(
    r"^\| (" + "|".join(REQUIRED_IDS) + r") \| (" + "|".join(TERMINAL) + r") \|",
    re.M,
)


def read_text(path):
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        return f"__UNREADABLE__:{exc}"


def task_status_errors(text):
    if text.startswith("__UNREADABLE__"):
        return [f"TASK.md unreadable: {text}"]
    found = {}
    errors = []
    for task_id, status in STATUS_ROW.findall(text):
        if task_id in found:
            errors.append(f"{task_id} has more than one terminal status")
        found[task_id] = status
    for task_id in REQUIRED_IDS:
        status = found.get(task_id)
        if status is None:
            errors.append(f"{task_id} has no terminal status")
            continue
        expected = FIXED_STATUS.get(task_id)
        if expected is not None and status != expected:
            errors.append(f"{task_id} status is {status}, expected {expected}")
    return errors


def planning_errors(text):
    if text.startswith("__UNREADABLE__"):
        return [f"PLANNING.md unreadable: {text}"]
    errors = []
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if lines == ["# PLANNING", "**Protocol:** 3.8.0"]:
        errors.append("PLANNING.md is still only the protocol line")
    if "3.8.0" not in text:
        errors.append("PLANNING.md lost protocol 3.8.0")
    if ".gitcore/planning/TASK.md" not in text:
        errors.append("PLANNING.md does not point at the task list")
    lowered = text.lower()
    if "honestidad" not in lowered and "honesty" not in lowered:
        errors.append("PLANNING.md does not name the honesty pass")
    if "bloquead" not in lowered and "blocked" not in lowered:
        errors.append("PLANNING.md does not name the blocked corpus gaps")
    return errors


def markdown_numeric_rows(text):
    rows = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("|") and re.search(r"\d", stripped):
            rows.append(stripped)
    return rows


def nutrition_table_errors(nutri):
    base = subprocess.run(
        ["git", "show", "e956abf2:docs/nutritional_database.md"],
        cwd=REPO,
        text=True,
        capture_output=True,
    )
    if base.returncode != 0:
        return ["cannot read e956abf2 nutrition table: " + base.stderr.strip()]
    current_rows = markdown_numeric_rows(nutri)
    base_rows = markdown_numeric_rows(base.stdout)
    if current_rows != base_rows:
        return [
            f"hand nutrition numeric rows changed ({len(base_rows)} baseline, {len(current_rows)} now)"
        ]
    return []


def source_object_hits(record):
    sources = record.get("sources")
    if isinstance(sources, dict):
        sources = [sources]
    if not isinstance(sources, list):
        return 0
    hits = 0
    for item in sources:
        if not isinstance(item, dict):
            continue
        keys = {str(key).lower() for key in item}
        if keys & {"id", "url", "org"}:
            hits += 1
    return hits


def req001_errors():
    text = read_text(REPO / "docs" / "SRS" / "REQUIREMENTS.md")
    if text.startswith("__UNREADABLE__"):
        return [f"REQUIREMENTS.md unreadable: {text}"]
    errors = []
    section_match = re.search(r"(?ms)^## REQ-001:.*?(?=^## REQ-|\Z)", text)
    section = section_match.group(0) if section_match else ""
    if not section:
        return ["REQ-001 section is missing"]
    if not re.search(r"\*\*SRS Estado:\*\* `draft`", section):
        errors.append("REQ-001 SRS Estado is not draft")
    boxes = re.findall(r"(?m)^- \[([ xX])\] (.+)$", section)
    rules = (
        (".git-core-protocol-version", "protocol"),
        ("define orden de lectura", "reading"),
        ("PLANNING.md", "planning"),
        ("SRC.md", "src"),
        ("docs/SRS/{index,REQUIREMENTS,ARCHITECTURE}.md", "trio"),
    )
    for mark, label in boxes:
        kind = next((name for needle, name in rules if needle in label), None)
        checked = mark.lower() == "x"
        if kind is None and checked:
            errors.append(f"REQ-001 checked an unknown box: {label}")
            continue
        if not checked:
            continue
        if kind == "src":
            errors.append("SRC.md marked complete")
        elif kind == "protocol":
            version = read_text(REPO / ".git-core-protocol-version").strip()
            if version != "3.8.0":
                errors.append(f"protocol box checked but version file is {version!r}")
        elif kind == "reading":
            agents = read_text(REPO / "AGENTS.md")
            order = re.search(r"(?ims)^##\s+Orden de lectura\s*$.*?(?=^##\s|\Z)", agents)
            if "orden de lectura" not in agents.lower() or not order:
                errors.append("reading-order box checked but AGENTS.md has no orden de lectura")
            else:
                body = order.group(0)
                for target in READING_TARGETS:
                    if target not in body or not (REPO / target).is_file():
                        errors.append(f"reading-order target missing: {target}")
                for target in re.findall(r"`([^`\n]+)`", body):
                    if "/" not in target:
                        continue
                    if not (REPO / target).exists():
                        errors.append(f"reading-order path does not exist: {target}")
        elif kind == "planning":
            planning = REPO / ".gitcore" / "planning" / "PLANNING.md"
            task = REPO / ".gitcore" / "planning" / "TASK.md"
            if not planning.is_file() or not task.is_file():
                errors.append("planning box checked but PLANNING.md or TASK.md is missing")
            else:
                phase_errors = planning_errors(read_text(planning))
                if phase_errors:
                    errors.append("planning box checked but PLANNING.md is not the honesty phase")
        elif kind == "trio":
            for name in ("index.md", "REQUIREMENTS.md", "ARCHITECTURE.md"):
                if not (REPO / "docs" / "SRS" / name).is_file():
                    errors.append(f"SRS trio box checked but docs/SRS/{name} is missing")
    tail = re.split(r"(?m)^## REQ-002:", text, maxsplit=1)
    if len(tail) == 2 and re.search(r"(?m)^- \[[xX]\]", tail[1]):
        errors.append("REQ-002 or later has a checked acceptance box")
    return errors


def license_hits(base):
    apache = agpl = 0
    for path in base.rglob("*.md"):
        match = re.search(r"(?m)^license:\s*[\"']?([^\"'\n]+)", path.read_text(encoding="utf-8", errors="replace"))
        if not match:
            continue
        value = match.group(1).strip()
        if value == "Apache-2.0":
            apache += 1
        elif value == "AGPL-3.0-or-later":
            agpl += 1
    return apache, agpl


def main():
    errors = []
    blocked = []

    config = (REPO / "site" / "src" / "content.config.ts").read_text(encoding="utf-8")
    if "!**/pending_review/**" not in config:
        errors.append("published ingredient loader no longer excludes pending_review")

    check = subprocess.run(
        [sys.executable, "docs/corpus-stats.py", "--check"],
        cwd=REPO,
        text=True,
        capture_output=True,
    )
    if check.returncode != 0:
        errors.append("docs/corpus-stats.py --check failed:\n" + check.stderr)

    files = list(ING.rglob("*.json"))
    published = [path for path in files if "pending_review" not in path.parts]
    pending = [path for path in files if "pending_review" in path.parts]
    nonzero = 0
    ge5_sources = 0
    ge5_langs = 0
    invented_sources = 0
    for path in published:
        record = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(record, dict) and has_positive(record.get("nutrition_per_100g")):
            nonzero += 1
    for path in files:
        record = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(record, dict):
            continue
        if source_count(record) >= 5:
            ge5_sources += 1
        if lang_count(record) >= 5:
            ge5_langs += 1
        invented_sources += source_object_hits(record)
    if invented_sources:
        errors.append(f"ingredient sources include org/id/url objects: {invented_sources}")

    stats = json.loads((REPO / "docs" / "stats.json").read_text(encoding="utf-8"))
    measured = stats.get("ingredients_json") or {}
    if measured.get("published") != len(published):
        errors.append(f"stats published {measured.get('published')} != tree {len(published)}")
    if measured.get("pending_review") != len(pending):
        errors.append(f"stats pending {measured.get('pending_review')} != tree {len(pending)}")
    if measured.get("nonzero_nutrition") != nonzero:
        errors.append(f"stats nonzero {measured.get('nonzero_nutrition')} != tree {nonzero}")

    readme = (REPO / "README.md").read_text(encoding="utf-8")
    readme_es = (REPO / "README.es.md").read_text(encoding="utf-8")
    for label, text, needles in (
        ("README.md", readme, (
            f"{len(published)} published ingredients",
            f"{len(pending)} pending review",
            f"{nonzero} with non-zero nutrition",
        )),
        ("README.es.md", readme_es, (
            f"{len(published)} ingredientes publicados",
            f"{len(pending)} pendientes de revisión",
            f"{nonzero} con nutrición no nula",
        )),
    ):
        for needle in needles:
            if needle not in text:
                errors.append(f"{label} missing '{needle}'")

    for label, base in (("site", SITE / "dishes"), ("root", REPO / "dishes")):
        apache, agpl = license_hits(base)
        if apache:
            errors.append(f"{label} dish front matter still has Apache-2.0: {apache}")
        if agpl == 0:
            errors.append(f"{label} dish front matter has no AGPL-3.0-or-later field")

    b17 = json.loads((SITE / "vitamins" / "b17-b17.json").read_text(encoding="utf-8"))
    blob = json.dumps(b17, ensure_ascii=False).lower()
    if b17.get("type") == "vitamin" or "vitamina b17" == str(b17.get("name", "")).lower():
        errors.append("B17 is presented as an established vitamin")
    if any(word in blob for word in ("cancer", "citotox", "cytotoxic")):
        errors.append("B17 still claims cancer cytotoxicity")
    if "cyanide" not in blob and "cianuro" not in blob:
        errors.append("B17 lost the cyanide warning")
    if b17.get("rda") not in (None,):
        errors.append("B17 rda is no longer null")

    placeholder = json.loads((SITE / "diets" / "placeholder.json").read_text(encoding="utf-8"))
    if "no es una dieta" not in str(placeholder.get("name", "")).lower() + str(placeholder.get("body_md", "")).lower():
        errors.append("placeholder diet reads as a real diet")

    goals = (REPO / "docs" / "PROJECT_GOALS.md").read_text(encoding="utf-8")
    if "Código Abierto (MIT)" in goals or ("más completa" in goals and "del mundo" in goals):
        errors.append("PROJECT_GOALS still claims MIT or a complete world database")

    nutri = (REPO / "docs" / "nutritional_database.md").read_text(encoding="utf-8")
    if "展现了" in nutri or "\n- FAO/INFOODS" in nutri:
        errors.append("hand nutrition table again claims a multi-organization corpus")

    china_site = [
        path.name for path in (SITE / "dishes").iterdir()
        if path.is_dir() and path.name.lower() in {"china", "chinese"}
    ]
    if china_site:
        errors.append("China cuisine directory appeared on the published site without the one-dish review skill")

    images = [
        path for path in (REPO / "exercises").rglob("*")
        if path.suffix.lower() in {".gif", ".png", ".jpg", ".jpeg", ".webp", ".svg"}
    ]
    if images:
        errors.append(f"exercise artwork files are present: {len(images)}")

    notice = (REPO / "NOTICE.md").read_text(encoding="utf-8")
    licensing = (REPO / "docs" / "LICENSING.md").read_text(encoding="utf-8")
    contrato = (REPO / "docs" / "ecosystem" / "CONTRATO-DATOS.md").read_text(encoding="utf-8")
    eco = (REPO / "docs" / "ecosystem" / "README.md").read_text(encoding="utf-8")
    if "None in this repository" not in notice or "not vendored here" not in notice:
        errors.append("NOTICE no longer says exercise artwork is absent")
    if "not" not in licensing.lower() or "vendored" not in licensing.lower():
        errors.append("LICENSING no longer says workout artwork is not vendored")
    if "no vendorizado en este repositorio" not in contrato:
        errors.append("CONTRATO-DATOS still claims workout artwork is vendored here")
    if "no está vendorizado en este repositorio" not in eco:
        errors.append("ecosystem README still claims workout artwork is vendored here")
    if "The illustration files are not in this repository." not in readme:
        errors.append("README.md license section lost the artwork absence sentence")
    if "Esos archivos de ilustración no están en este repositorio." not in readme_es:
        errors.append("README.es.md license section lost the artwork absence sentence")

    errors.extend(nutrition_table_errors(nutri))
    errors.extend(task_status_errors(read_text(REPO / ".gitcore" / "planning" / "TASK.md")))
    errors.extend(planning_errors(read_text(REPO / ".gitcore" / "planning" / "PLANNING.md")))
    errors.extend(req001_errors())

    cuisines = [path.name for path in (SITE / "dishes").iterdir() if path.is_dir()]
    china_md = len(list((REPO / "dishes" / "china").rglob("*.md")))
    blocked.append(f"F1 world coverage is false; published cuisine folders={len(cuisines)}")
    blocked.append(f"F2 China stays off the site; root dishes/china markdown files={china_md}")
    blocked.append(f"F3 sources>=5 is {ge5_sources}; languages>=5 is {ge5_langs}")
    blocked.append("F13 review queue is not merged by this gate")
    blocked.append(f"measured published={len(published)} pending_review={len(pending)} nonzero_nutrition={nonzero}")

    print("BLOCKED")
    for line in blocked:
        print(line)
    if errors:
        print("REGRESSIONS")
        for line in errors:
            print(line)
        return 1
    print("CORRECTIONS_HOLD")
    return 0


if __name__ == "__main__":
    sys.exit(main())
