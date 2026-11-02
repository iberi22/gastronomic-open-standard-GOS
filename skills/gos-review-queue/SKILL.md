---
name: gos-review-queue
description: Re-read pull requests and issues without merging.
version: 0.1.0
author: Brahyan Belalcazar (iberi22)
license: AGPL-3.0-or-later
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [GOS, github, review]
    related_skills: [gos-audit-gate]
---

# Cola de revisión

Esta skill vuelve a leer la cola y la deja sin mezclar. El campo `open_issues_count` de GitHub incluye los pull requests. F13 sigue bloqueado hasta que el dueño pida mezclar o cerrar una entrada concreta.

## When to Use

- Alguien pregunta por ramas, pull requests o issues abiertos.
- No la uses para `gh pr merge`, cerrar issues, borrar ramas locales ni limpiar Dependabot «de paso».

## Procedure

1. `git fetch origin --prune` y `git rev-list --left-right --count origin/main...HEAD`. Anota izquierda (solo origen) y derecha (solo HEAD).
2. `gh pr list --repo iberi22/gastronomic-open-standard-GOS --state open --limit 50 --json number,title,isDraft,headRefName`.
3. Lista los issues que no son pull requests:

```bash
gh api --paginate "repos/iberi22/gastronomic-open-standard-GOS/issues?state=open&per_page=100" --jq '.[] | select(.pull_request == null) | "#\(.number) \(.title)"'
```

4. Entrega tres números: pull requests abiertos, issues que no son pull requests, y `open_issues_count`. El tercero es la suma de los dos primeros.
5. No mezcles. Si el dueño nombra un número en este turno, ese número es el único candidato, y hace falta otra confirmación antes de mezclar.

## Measured on 2026-11-02

Estos valores envejecen. El procedimiento de arriba manda.

- `develop` local estaba 5 commits detrás de `origin/main` y 0 delante, en `e956abf2`.
- 14 pull requests abiertos. Humanos: #414 `pi/gos-d2/g08`, #381 draft, #380 draft. El resto era Dependabot.
- 5 issues que no son pull requests: #402, #298, #297, #263, #257.
- `open_issues_count` era 19 porque suma los 14 pull requests.

## Pitfalls

- `gh issue list` puede mezclar pull requests con issues. Usa el filtro `pull_request == null`.
- Una rama local con upstream borrado no se elimina desde esta skill.
- Auto-merge del workflow de GitHub no es una orden de esta skill.

## Verification

El informe separa pull requests e issues, cita el comando, y `git status` no muestra un merge ni un commit hecho por la skill.
