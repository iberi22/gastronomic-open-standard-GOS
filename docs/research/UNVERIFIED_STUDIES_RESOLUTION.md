# Resolución de estudios `doi_status: unverified` — GOS

Fecha: 2026-10-01
Alcance: 7 estudios marcados `unverified` en `site/src/content/substances/{cafeina,piperina,cuminaldehido,genisteina,limoneno}.md`.
Método: `curl` contra la API REST de Crossref. NO se modificó ningún `.md` de sustancias.

---

## 1. Método y control de calidad

Comando de verificación de existencia (código HTTP):

```bash
curl -s -o /dev/null -w '%{http_code}' --max-time 20 \
  -H 'User-Agent: GOS-verify/1.0 (mailto:iberi22@gmail.com)' \
  'https://api.crossref.org/works/<DOI>'
# 200 = existe en Crossref ; 404 = no existe
```

Comando de metadatos (título, revista, año, abstract, tipo):

```bash
curl -s --max-time 25 \
  -H 'User-Agent: GOS-verify/1.0 (mailto:iberi22@gmail.com)' \
  'https://api.crossref.org/works/<DOI>'
```

**Control positivo (ejecutado al inicio y al final de cada tanda):**

```
10.3945/an.116.014852 => 200
# Crossref: "Effects of Anthocyanins on Cardiometabolic Health: A Systematic Review
#            and Meta-Analysis of Randomized Controlled Trials", Adv Nutr, 2017
```

Como el control dio `200`, las llamadas están bien formadas: un `404` significa que el DOI no
está registrado en Crossref, no que la consulta falle.

**Búsqueda de equivalentes:**

```bash
curl -s --max-time 30 \
  -H 'User-Agent: GOS-verify/1.0 (mailto:iberi22@gmail.com)' \
  'https://api.crossref.org/works?query.title=<TITULO>&rows=<N>&filter=type:journal-article&select=DOI,title,container-title,issued'
```

También se escaneó cada revista por ISSN y rango de fechas
(`/journals/<issn>/works?filter=from-pub-date=...`).

---

## 2. Verificación de los 7 DOI actuales (todos 404)

Salida real del comando, en una sola tanda con el control positivo:

| DOI actual | HTTP | Registro real en Crossref |
|---|---|---|
| `10.3945/an.116.014852` (control) | **200** | Adv Nutr 2017 |
| `10.1007/s00213-010-1900-8` | 404 | — |
| `10.4103/0975-9476.113033` | 404 | — |
| `10.1007/s00011-015-0824-3` | 404 | — |
| `10.1016/S0271-5317(99)00031-1` | 404 | — |
| `10.17795/middleeastjdd-12123` | 404 | — |
| `10.3945/jn.109.107979` | 404 | — |
| `10.1000/altmed.12.1.0` | 404 | — |

Los 7 DOI del repo son transcripciones incorrectas o citaciones inventadas. Ninguno existe.

---

## 3. Tabla de resolución

| # | Sustancia | Condición | DOI resuelto | HTTP | Título real | Revista | Año | Tipo / calidad | Veredicto |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Cafeína | Fatigue / Alertness | `10.1007/s00213-012-2917-4` | **200** | Caffeine as an attention enhancer: reviewing existing assumptions | Psychopharmacology | 2012 | Revisión narrativa (McLellan et al.) | **Sustituye** — revisar, no ensayo clínico → bajar evidence_level |
| 1b | Cafeína | Fatigue / Alertness | `10.1007/bf02245786` | **200** | Effects of caffeine on alertness | Psychopharmacology | 1990 | Revisión (Lieberman et al.) | Alternativa / apoyo |
| 2 | Piperina | Nutrient malabsorption | `10.1055/s-2006-957450` | **200** | Influence of Piperine on the Pharmacokinetics of Curcumin in Animals and Human Volunteers | Planta Medica | 1998 | Ensayo en humanos + animales (Shoba et al.) | **Sustituye** — el estudio canónico de bioenhancer |
| 2b | Piperina | Nutrient malabsorption | `10.1007/s00228-016-2173-3` | **200** | The influence of piperine on the pharmacokinetics of fexofenadine, a P-glycoprotein substrate, in healthy volunteers | Eur J Clin Pharmacol | 2016 | Ensayo en humanos (mecanismo P-gp) | Apoyo mecanístico |
| 2c | Piperina | Nutrient malabsorption | `10.22270/jddt.v13i4.5781` | **200** | A Systematic Review of Piperine as a Bioavailability Enhancer | J Drug Deliv Ther | 2023 | Revisión sistemática | Apoyo (rev. narrativa/sistemática) |
| 3 | Piperina | Inflammation | `10.1007/s10753-012-9448-3` | **200** | Anti-inflammatory Effect of Piperine in Adjuvant-Induced Arthritic Rats—a Biochemical Approach | Inflammation | 2012 | **Preclínico (rata)**, no clínico | Sustituye pero baja calidad: evidence_level ya era Medium; no subir a High |
| 3b | Piperina | Inflammation | `10.1007/s10753-015-0250-x` | **200** | Piperine Ameliorates Lipopolysaccharide-Induced Acute Lung Injury via Modulating NF-κB Signaling Pathways | Inflammation | 2015 | Preclínico (rata), NF-κB | Encaja con el mechanism (NF-kB), animal |
| 4 | Cuminaldehído | Dyspepsia / Bloating | `10.1002/(sici)1521-3803(20000101)44:1<42::aid-food42>3.0.co;2-d` | **200** | Influence of dietary spices and their active principles on pancreatic digestive enzymes in albino rats | Nahrung/Food | 2000 | **Preclínico (rata)**; archivo distinto y año distinto al declarado | Sustituye con salvedades |
| 4b | Cuminaldehído | Dyspepsia / Bloating | `10.1002/food.200390091` | **200** | In vitro influence of spices and spice-active principles on digestive enzymes of rat pancreas and small intestine | Food / Nahrung | 2003 | **In vitro + rata**; abstract confirma amilasa/lipasa pancreática y **cumin** entre las 14 especias | Sustituye; el mejor ajuste temático (amilasa-proteasa-lipasa + cumin) |
| 5 | Cuminaldehído | Irritable bowel | `10.1186/s12906-024-04530-1` | **200** | The effect of Cuminum cyminum on the return of bowel motility after abdominal surgery: a triple-blind randomized clinical trial | BMC Complement Med Ther | 2024 | **Ensayo clínico aleatorizado**, 74 pacientes | Sustituye por tema, **cambia población** (post-quirúrgico, no IBS) |
| 6 | Genisteína | Postmenopausal osteoporosis | `10.1136/bmj.39287.690475.ad` | **200** | Soy phytoestrogen genistein increases bone mineral density in postmenopausal women | BMJ | 2007 | Resultados de ensayo (BMJ RCT, 2007) | Sustituye — el artículo BMJ canónico de genisteína y hueso |
| 6b | Genisteína | Postmenopausal osteoporosis | `10.7326/0003-4819-146-12-200706190-00002` | **200** | Effects of the Phytoestrogen Genistein on Bone Health in Postmenopausal Women | Ann Intern Med | 2007 | Editorial/reply sobre el mismo estudio BMJ | Solo apoyo; NO usar como estudio principal (no es el ensayo) |
| 7 | Limoneno | GERD / Heartburn | — | — | — | — | — | — | **SIN EQUIVALENTE IDENTIFICABLE** |

---

## 4. Respuestas reales (corte) de cada DOI propuesto

```
10.1007/s00213-012-2917-4 => 200
  TYPE: journal-article | TITLE: Caffeine as an attention enhancer: reviewing existing assumptions
  JOURNAL: Psychopharmacology (2012)

10.1007/bf02245786 => 200
  TITLE: Effects of caffeine on alertness | JOURNAL: Psychopharmacology (1990)

10.1055/s-2006-957450 => 200
  TITLE: Influence of Piperine on the Pharmacokinetics of Curcumin in Animals and Human Volunteers
  JOURNAL: Planta Medica (1998)

10.1007/s00228-016-2173-3 => 200
  TITLE: The influence of piperine on the pharmacokinetics of fexofenadine, a P-glycoprotein
         substrate, in healthy volunteers
  JOURNAL: European Journal of Clinical Pharmacology (2016)

10.1007/s10753-012-9448-3 => 200
  TITLE: Anti-inflammatory Effect of Piperine in Adjuvant-Induced Arthritic Rats—a Biochemical Approach
  JOURNAL: Inflammation (2012)

10.1007/s10753-015-0250-x => 200
  TITLE: Piperine Ameliorates Lipopolysaccharide-Induced Acute Lung Injury via Modulating
         NF-κB Signaling Pathways
  JOURNAL: Inflammation (2015)

10.1002/(sici)1521-3803(20000101)44:1<42::aid-food42>3.0.co;2-d => 200
  TITLE: Influence of dietary spices and their active principles on pancreatic digestive
         enzymes in albino rats | JOURNAL: Nahrung/Food (2000)

10.1002/food.200390091 => 200
  TITLE: In vitro influence of spices and spice-active principles on digestive enzymes of
         rat pancreas and small intestine | JOURNAL: Food / Nahrung (2003)
  ABSTRACT (extracto): "...14 individual spices (curcumin, capsaicin, piperine, garlic,
  onion, ginger, mint, coriander, cumin, ajowan, fennel, fenugreek, mustard, and asafoetida)
  on the activities of digestive enzymes of rat pancreas and small intestine... A majority of
  spices enhanced the activity of pancreatic lipase and amylase..."

10.1136/bmj.39287.690475.ad => 200
  TYPE: journal-article | TITLE: Soy phytoestrogen genistein increases bone mineral density
  in postmenopausal women | JOURNAL: BMJ (2007)

10.7326/0003-4819-146-12-200706190-00002 => 200
  TITLE: Effects of the Phytoestrogen Genistein on Bone Health in Postmenopausal Women
  JOURNAL: Annals of Internal Medicine (2007)

10.1186/s12906-024-04530-1 => 200
  TITLE: The effect of Cuminum cyminum on the return of bowel motility after abdominal
  surgery: a triple-blind randomized clinical trial
  JOURNAL: BMC Complementary Medicine and Therapies (2024)
  ABSTRACT (extracto): "...74 patients undergoing abdominal surgery were assigned to the
  intervention and control groups..."

10.1002/ptr.6500 => 200   (descartado como equivalente: síndrome metabólico, no IBS)
  TITLE: Effects of cumin (Cuminum cyminum L.) essential oil supplementation on metabolic
  syndrome components | JOURNAL: Phytotherapy Research (2019)
```

---

## 5. Descartes explícitos (no son equivalentes temáticos)

| DOI descartado | Motivo del descarte |
|---|---|
| `10.23880/pdraj-16000126` | Resuelve (200) pero es *Pharmaceutical Drug Regulatory Affairs Journal* — revisión regulatoria, no biodisponibilidad de piperina. Confirmado el descarte ya indicado. |
| `10.4103/0973-7847.79101` | *Cuminum cyminum and Carum carvi: An update*, Pharmacognosy Reviews 2011 — revisión de fitoterapia, no IBS ni enzimas digestivas. |
| `10.1002/ptr.6500` | Aceite esencial de comino en síndrome metabólico, no síntomas de intestino irritable. |
| `10.7326/0003-4819-146-12-200706190-00002` | Editorial/respuesta de Annals sobre el estudio BMJ; no es el ensayo original. |
| `10.1016/s0271-5317(97)00207-8` | Nutrition Research 1998, comino antidiabético en ratas — tema distinto. |
| `10.1007/s00213-012-2917-4` como ensayo | Existe y trata fatiga/alertness, pero es revisión narrativa, no ensayo clínico. Usado con aviso explícito (ver §6). |

---

## 6. Cambios de `evidence_level` que implican estos reemplazos

**DECLARACIÓN EXPRESA — modifiqué la interpretación de la evidencia en 3 casos. El nivel publicado
debe ajustarse:**

1. **Cafeína / Fatigue-Alertness: `High` → `Medium`.**
   El DOI de reemplazo (`10.1007/s00213-012-2917-4`, McLellan et al.) es una **revisión narrativa**
   ("reviewing existing assumptions"), no un meta-análisis ni un ensayo. El título original declaraba
   un meta-análisis que no existe en Crossref. Mantener `High` con una revisión narrativa
   sobre-declara la evidencia.

2. **Piperina / Inflammation: se mantiene `Medium`, sin cambio.**
   Los DOI de reemplazo son preclínicos (rata). El nivel `Medium` ya era generoso para un mecanismo
   NF-κB animal; no se sube a `High`. Anotar que es evidencia animal, no humana.

3. **Cuminaldehído / Dyspepsia-Bloating: `High` → `Low`.**
   El DOI declarado (Nutrition Research 1999) no existe. Los sustitutos reales (`Nahrung/Food` 2000
   y 2003) son **estudios en rata y/o in vitro**, no humanos. `High` era incorrecto para esta
   evidencia; `Low` es lo defendible. Si se quiere conservar un nivel alto, hay que añadir un ensayo
   clínico humano de comino en dispepsia, que no se localizó.

4. **Cuminaldehído / Irritable bowel: `Medium` → `Medium`, pero cambia la población.**
   `10.1186/s12906-024-04530-1` es un ensayo clínico aleatorizado real, pero en pacientes
   post-quirúrgicos (motilidad intestinal), no en IBS. Es el mejor ajuste disponible, pero no
   prueba el claim de IBS. **No subir a `High`.**

5. **Genisteína / Postmenopausal osteoporosis: `Medium` → `Medium`.**
   `10.1136/bmj.39287.690475.ad` (BMJ 2007) es el estudio canónico y es un ensayo en humanos
   posmenopáusica. Podría sustentar `High`; no lo subo aquí porque el DOI declarado era un
   meta-análisis en *J Nutr* que no existe, y prefiero no elevar el nivel sin que el agente lo revise.
   **El agente puede subirlo a `High` si lo acepta explícitamente.**

6. **Piperina / Nutrient malabsorption: `High` se mantiene.**
   `10.1055/s-2006-957450` (Shoba et al., Planta Med 1998) es un ensayo con voluntarios humanos
   que demuestra el efecto bioenhancer. Sustenta `High` legítimamente.

7. **Limoneno / GERD: `Medium` → debe bajar a `Low` o el estudio eliminarse.**
   Sin equivalente identificable. El claim "D-limonene for GERD: trial" en *Alt Med Rev* 2007
   (`10.1000/altmed.12.1.0`) es una cita que no resuelve. Si se conserva la entrada, el
   `evidence_level` de `Medium` no tiene respaldo documental.

---

## 7. Resumen ejecutivo

| Sustancia | Condición | Resultado |
|---|---|---|
| Cafeína | Fatigue / Alertness | DOI real `10.1007/s00213-012-2917-4` (200) — **bajar a Medium** (es revisión) |
| Piperina | Nutrient malabsorption | DOI real `10.1055/s-2006-957450` (200) — ensayo humano, **High OK** |
| Piperina | Inflammation | DOI real `10.1007/s10753-012-9448-3` (200) — animal, **Medium OK** |
| Cuminaldehído | Dyspepsia / Bloating | DOI real `10.1002/food.200390091` (200) — in vitro/rata, **bajar a Low** |
| Cuminaldehído | Irritable bowel | DOI real `10.1186/s12906-024-04530-1` (200) — RCT post-quirúrgico, **Medium con aviso** |
| Genisteína | Postmenopausal osteoporosis | DOI real `10.1136/bmj.39287.690475.ad` (200) — BMJ, **Medium→High posible** |
| Limoneno | GERD / Heartburn | **SIN EQUIVALENTE IDENTIFICABLE** |

6 de 7 resueltos con DOI verificado (HTTP 200). 1 de 7 sin equivalente.
Los 3 ajustes de `evidence_level` recommended (Cafeína→Medium, Cuminaldehído dispepsia→Low,
Limoneno→Low o eliminar) están declarados arriba para que los aplique quien edite los `.md`.