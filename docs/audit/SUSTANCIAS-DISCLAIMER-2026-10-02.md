# Sustancias — disclaimers y relajación de afirmaciones sin fuente

Fecha: 2026-10-02
Alcance: las 30 cartas de `site/src/content/substances/*.md`.

## Problema

Las 30 cartas afirmaban en su sección «Almacenamiento y uso culinario»:

> **Seguridad:** Dosis culinarias son seguras; extractos concentrados requieren evaluación.

Esa frase es una afirmación de seguridad categórica y **no tenía ninguna cita**: los 30
archivos repetían el mismo texto, pero ninguno lo respaldaba con un estudio en su
`health_registry`. Además, el bloque «Beneficio principal» de varias cartas enunciaba
eficacia (anticancer, cardioprotector, neuroprotector…) sin fuente verificable.

Ninguna afirmación fue respaldada con una fuente inventada. Todas se marcaron o suavizaron.

## 1. Frontmatter: `disclaimer: true`

El esquema de `substances` en `site/src/content.config.ts` **no declaraba** el campo
(existía `.passthrough()`, pero sin tipo ni default, así que no era un campo del contrato).
Se añadió **una sola vez** al esquema zod:

```ts
disclaimer: z.boolean().default(true),
```

Con el default en `true`, las 30 cartas renderizan el aviso aunque se añada contenido nuevo
sin declarar el campo. Se escribió `disclaimer: true` explícito en las 30 cartas para que el
intención sea legible en el propio archivo.

## 2. Bloque de descargo en la ficha

`site/src/pages/substances/[...slug].astro` renderiza un `<aside role="note">` visible,
colocado entre los chips de cabecera y las cajas de sazón/sabor/textura — es decir, **antes**
de que el lector llegue a las afirmaciones de salud. Se muestra cuando `disclaimer !== false`
(por eso el `!== false` explícito y no un truthy: un `undefined` también debe pintar el aviso).

> **Aviso** — Información divulgativa basada en la evidencia citada. No sustituye el consejo
> médico. Las dosis culinarias no equivalen a dosis terapéuticas ni a suplementos.

Estilos con tokens existentes únicamente: `--swal-border`, `--swal-accent`,
`--swal-text-secondary`, `--swal-bg`, con `color-mix` al 5% del acento (el mismo patrón que
usa `.box.accent` en esa misma página). Sin colores ni fuentes nuevas.

## 3. Afirmaciones relajadas o marcadas

### 3.1 Línea de seguridad — los 30 archivos

| | |
|---|---|
| Antes | `Dosis culinarias son seguras;` |
| Después | `Se considera generalmente seguro en dosis culinarias según la evidencia disponible (sin fuente verificada en esta carta); los extractos concentrados requieren evaluación médica.` |

Se pasó de un juicio cerrado a una atribución explícita a «la evidencia disponible», se marcó
el origen de la afirmación y se agravó el umbral de los extractos concentrados a evaluación
**médica** (antes solo «evaluación»).

### 3.2 Bloque «Beneficio principal» — cartas sin ninguna cita

Estas 6 cartas no tienen ni un estudio ni un DOI en su `health_registry`, así que su línea de
beneficio no se puede sostener. Se marcó la afirmación, no se softened con lenguaje vago:

| Archivo | Línea |
|---|---|
| `alil-isotiocianato.md` | Anticancer, despeja senos, lacrimógeno |
| `anetol.md` | Digestivo, expectorante, carminativo |
| `carvacrol.md` | Antibiótico natural, antifúngico, antioxidante |
| `resveratrol.md` | Antioxidante, cardioprotector, mimético restricción calórica |
| `teobromina.md` | Diurético, vasodilatador, antitúsico |
| `vanilina.md` | Aroma, ansiolítico suave, antioxidante |

(Sufijo aplicado a las 6: ` (afirmaciones sin fuente verificada en esta carta)`.)

### 3.3 Afirmaciones de potencia en la descripción

| Archivo | Antes | Después |
|---|---|---|
| `carvacrol.md` | Uno de los antimicrobianos vegetales más potentes. | Descrito en la literatura como uno de los antimicrobianos vegetales más potentes (sin fuente verificada en esta carta). |
| `sulforafano.md` | Isotiocianato del brócoli: inductor Nrf2 más potente de dieta. | …descrito en la literatura como uno de los inductores Nrf2 más potentes de la dieta (sin fuente verificada en esta carta). |
| `zeaxantina.md` | Filtro luz azul retina; estudio AREDS2 demostró protección AMD. | Filtro de luz azul en la retina; se cita el estudio AREDS2 como evidencia de protección frente a AMD (sin fuente verificable en esta carta). |
| `licopeno.md` | Antioxidante que apaga singlete oxígeno. | Descrito en la literatura como antioxidante que apaga singlete oxígeno (sin fuente verificada en esta carta). |
| `cuminaldehido.md` | Potente carminativo que estimula enzimas digestivas. | Tradicionalmente usado como carminativo; se le atribuye estimulación de enzimas digestivas (sin fuente verificada en esta carta). |

`zeaxantina` se reformuló de «demostró protección» a «se cita como evidencia»: la redacción original convertía una cita de AREDS2 en un resultado probado, y AREDS2 no es un estudio
sobre zeaxantina aislada.

## 4. Lo que NO se cambió

La sección «Metabolismo y Termogénesis (Estudios Clínicos)» de `capsaicina.md` se dejó
intacta: sus cifras (~50 kcal/día, UCP1, atenuación termogénica) sí están respaldadas por los
4 DOI de `Obesity / Metabolic syndrome` en su frontmatter.

## 5. Pendiente (no resuelto aquí)

- 24 de 30 cartas tienen entre 1 y 5 DOI, pero solo 11 declaran un campo `title:` de estudio.
  El formato está a medio migrar.
- 6 cartas siguen sin ninguna cita (ver 3.2): marked, pero no respaldadas. Requieren
  verificación bibliográfica aparte.
- `SubstanceCard.svelte` (índice) y `pages/api/substances.json.ts` no reciben el campo; solo
  se corrigió la ficha de detalle, que es donde vive la afirmación completa.

## Comandos ejecutados

```
node site/scripts/generate-graph.js
pnpm --dir site exec astro check
pnpm --dir site exec vitest run
```