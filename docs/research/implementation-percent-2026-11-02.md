# Porcentaje de implementación

Medido el 2026-11-02, con las 22 fichas nuevas de México, las 22 de Estados Unidos, las 22 de Brasil y tres platos chinos revisados ya en el sitio.

**55.2%**

El cálculo es el de `compute_progress` en `goal-report`: un ítem `done` vale 1, `in_progress` vale 0.5, `owner` y `todo` valen 0. El peso de un ítem es su `count` o 1. El porcentaje del componente es el promedio ponderado de sus ítems. El total es el promedio ponderado de los componentes. La cola de GitHub (F13) no entra: mezclarla sigue prohibido.

| Componente | Peso | Hecho | % del componente | Aporte |
| --- | --- | --- | --- | --- |
| Scorecard asentado (C1–C9, F1, F14, P1, P2, P4, P6) | 40 | 15/15 | 100 | 40 |
| China en el sitio (F2) | 15 | 3 de 69 tallos | 4.3 | 0.7 |
| Cinco fuentes en un registro (F3) | 10 | 1 de 5, tomate FDC 170457 | 20 | 2 |
| Promover `pending_review` (P3) | 10 | 0 de 510 | 0 | 0 |
| Oleada 1, platos nuevos | 20 | 66 de 105 | 62.9 | 12.6 |
| Oleada 1, mezclas | 5 | 0 de 35 | 0 | 0 |

105 platos = 7 lenguas × 15. 35 mezclas = 7 lenguas × 5. Los 66 platos son 22 de México, 22 de Estados Unidos y 22 de Brasil. Ese conteo mete dentro de los 105 las fichas que pasan de 15 en esas tres lenguas. Con el mínimo de 15, México, Estados Unidos y Brasil ya cumplen. China, India, Bangladesh y Japón siguen en cero platos nuevos de esa oleada. China publicada es mapo doufu, gongbao jiding y huiguo rou. El resto de `dishes/china/` sigue sin publicar. No hay mezclas nuevas.

En `0e733bad`, antes de huiguo rou, el mismo cálculo daba 55.0%. En `6c44ae9a`, antes de Brasil, daba 50.8%. En `0e8838a7`, antes de Estados Unidos, daba 46.6%.

P5 sigue `blocked`. F2, F3, F13 y P3 siguen `blocked`. F1 y F14 siguen `confirmed`.

La ficha viva del mismo cálculo está en `~/proyectosSWAL/docs/private/goals/goal-2026-11-02-gos-roadmap.json`.
