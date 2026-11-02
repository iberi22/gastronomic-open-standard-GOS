# Skills de GOS

Índice de las skills de este repositorio. Viven en `skills/` en la raíz. Cárgalas antes de editar corpus, licencias o la cola de revisión. El README de la raíz enlaza aquí.

No había `SKILL.md` en el árbol. `AGENTS.md` mencionaba `.skills/` y ese directorio no existe. Esta carpeta es la ubicación vigente.

## Orden

1. Corre la compuerta antes de afirmar que un hallazgo quedó cerrado.
2. Si el trabajo es nutrición, publicación de un plato, licencia o la cola de GitHub, abre una sola skill de la tabla.
3. Vuelve a correr la compuerta. `CORRECTIONS_HOLD` y salida 0 son la prueba. El bloque `BLOCKED` se informa, no se tapa.

```bash
python3 skills/gos-audit-gate/scripts/audit_gate.py
```

## Índice

| Skill | Cuándo | Bloqueo que atiende |
|---|---|---|
| [gos-audit-gate](gos-audit-gate/SKILL.md) | Después de cualquier edición de corpus, de `TASK.md` o de REQ-001, o antes de dar un hallazgo por cerrado. | Impide revertir lo ya corregido. No cierra F1, F2, F3 ni F13. |
| [gos-nutrition-source](gos-nutrition-source/SKILL.md) | Al escribir `nutrition_per_100g` o al promover un stub. | F3. Hace falta `org`, `id` y `url` copiados del publicador. Una cadena con el nombre de USDA no cuenta. |
| [gos-publish-reviewed-dish](gos-publish-reviewed-dish/SKILL.md) | Al pasar un plato de `dishes/` al sitio, China incluido. | F2 y el espejo raíz. Un plato revisado. Prohibido copiar `dishes/china/` entero. |
| [gos-license-corpus](gos-license-corpus/SKILL.md) | Al tocar `license:` o los avisos de terceros. | Front matter AGPL-3.0-or-later. El arte de `bryllim/workout-guide` no está en el repo. |
| [gos-review-queue](gos-review-queue/SKILL.md) | Al informar ramas, pull requests e issues. | F13. Se releen y no se mezclan. `open_issues_count` incluye los pull requests. |

## Lo que ninguna skill hace

- Inventar cifras nutricionales o identificadores USDA, ICBF o FAO.
- Copiar el árbol de China al sitio.
- Mezclar #414, #381, #380, Dependabot, ni cualquier otro pull request sin un pedido explícito del dueño en el turno.
