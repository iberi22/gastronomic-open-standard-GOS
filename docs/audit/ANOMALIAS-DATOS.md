# Auditoría de datos y evidencia científica — GOS

**Fecha:** 2026-10-01 · **Rama:** `main` · **HEAD:** `035e89b7`
**Alcance:** 44 estudios con DOI en `site/src/content/substances/*.md`; 495 recetas; 552 ingredientes; 45 mezclas; 148 DOI únicos en todo el repo.
**Método:** resolución HTTP de cada DOI contra `api.crossref.org` y NCBI E-utilities. Sin API keys. Cada afirmación de este informe lleva el comando o la URL que la respalda.

> **Reglas duras aplicadas en esta auditoría**
> - Ningún DOI se acepta por resemblance temática: se exige coincidencia de título, revista y año.
> - `evidence_level` solo admite High / Medium / Low. Revisión narrativa ≠ ensayo clínico; *in vitro* o modelo animal ≠ evidencia clínica.
> - Cuando no hay equivalente identificable se dice literalmente: **no verificable, sin equivalente identificable**.
> - No se modificó ningún `.md` de contenido. `site/dist/` se regeneró con `pnpm exec astro build` (dist está en `.gitignore`).

---

## 0. Resumen ejecutivo

| Categoría | Conteo | Gravedad |
|---|---|---|
| **DOI que resuelve a OTRO artículo** (DATO INCOHERENTE) | **23 de 44** | 🔴 Crítica |
| **DOI que no resuelve** (DATO AUSENTE — agravado por publicarse) | **1 de 44** en `substances` (+2 dentro de comentarios) | 🔴 Crítica |
| **DOI con `doi_status: unverified` publicado como verificado** | **1** (`limoneno.md`) | 🔴 Crítica |
| **`evidence_level` no defendible** contra el abstract real | **8 de 44** | 🔴 Crítica |
| **PLACEHOLDER PUBLICADO** (`[Pendiente]` en 22 recetas) | **84 tokens / 22 archivos** | 🔴 Grave |
| **Ceros que significan "desconocido"** | 16 recetas + 27 ingredientes | 🟠 Deuda |
| **Valores `N/A` publicados como dato científico** | 3 ingredientes indexables | 🟠 Deuda |
| **Recetas sin ingredientes ni pasos, publicadas en sitemap** | 28 | 🟠 Deuda |
| **Slots de evidencia vacíos** (`studies: []` / sin estudio) | 7 (`mentol`, `oleocanthal`…) | 🟠 Deuda |
| **Nombres de sustancia duplicados** | 2 pares | 🟡 Menor |
| **Duplicados reales de contenido** (mismo DOI en 2 sitios) | 6 DOI | 🟡 Menor |
| **Contradicciones de terminología en `evidence_level`** | 5 escalas distintas conviviendo | 🟠 Deuda |

**El headline: de los 44 DOI publicados en las fichas de sustancias, 43 resuelven en Crossref pero solo 20 corresponden realmente al artículo que la ficha afirma.** 23 fichas de las 30 substancias tienen al menos una cita que apunta a un estudio de otro tema, y `/api/evidence.json` los publica con `"desc": "Evidencia científica con DOI verificado. Cada doi resuelve en Crossref."` y `verified: true`.

---

## 1. Los DOI de `substances/*.md`: resolución y correspondencia

### 1.1 Cómo se verificó

Control positivo ejecutado primero para descartar rate-limiting:

```bash
curl -s -o /dev/null -w "%{http_code}" -H "User-Agent: GOS-audit/1.0" \
  "https://api.crossref.org/works/10.1038/nature12373"
# → 200
```

Después, para cada DOI:

```bash
curl -s -H "User-Agent: GOS-audit/1.0" \
  "https://api.crossref.org/works/<DOI-URL-encoded>"
```

Ejemplo de la URL usada para `mentol.md:23` (el caso más grave):

```bash
curl -s -H "User-Agent: GOS-audit/1.0" "https://api.crossref.org/works/10.1097/MCG.0000000000000043"
```
→ `"title": ["MELD-Na"]`, `"container-title": ["Journal of Clinical Gastroenterology"]`.

Para los estudios clínicos se cruzó con PubMed E-utilities (anónimo, sin key):

```bash
curl -sL "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term=\"10.1093/oxfordjournals.bja.a013442\"[doi]"
# → {"esearchresult":{"count":"1","idlist":["10793599"]}}
curl -sL "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=10793599,18554422,..."
```

Y para confirmar que un DOI inexistente no existe también en el resolutor:

```bash
curl -s -L -o /dev/null -w "%{http_code} -> %{url_effective}" \
  "https://doi.org/10.1000/altmed.12.1.0"
# → 404 -> https://doi.org/10.1000/altmed.12.1.0
```

### 1.2 Tabla completa (44 estudios + 2 DOIs mentioned en comentarios)

Veredicto:
- **VERIFICADO** — título (prácticamente) idéntico al devuelto por Crossref.
- **VERIFICADO (título abreviado)** — el archivo trunca el título real pero journal, año y tema coinciden.
- **VERIFICADO_PARCIAL** — journal + año coinciden; el título difiere en detalles (lista de compuestos, subtítulo).
- **NO_CORRESPONDE** — el DOI resuelve a un artículo de otro tema. **No cuenta como verificación.**
- **NO_RESOLVE** — 404 en Crossref y en doi.org.

| `alicina.md:16` | `10.1186/1471-2261-8-13` | VERIFICADO_PARCIAL | High | Garlic for hypertension: A systematic review and meta-analysis | Effect of garlic on blood pressure: A systematic review and meta-analysis | 18554422 |
| `alicina.md:24` | `10.1111/nure.12012` | VERIFICADO | Medium | Effect of garlic on serum lipids: an updated meta-analysis | Effect of garlic on serum lipids: an updated meta-analysis | 23590705 |
| `alil-isotiocianato.md:17` | `10.1021/jf903822e` | NO_CORRESPONDE | Medium | Allyl isothiocyanate and airway clearance | Metabolomics Revealed Novel Isoflavones and Optimal Cultivation Time of Cordyceps militari | — |
| `anetol.md:17` | `10.1016/j.jep.2010.03.005` | NO_CORRESPONDE | Medium | Anise and functional dyspepsia | Correlation between synergistic action of Radix Angelica dahurica extracts on analgesic ef | — |
| `anetol.md:25` | `10.1002/ptr.4990` | NO_CORRESPONDE | Medium | Anethole expectorant review | Comparison of Inhibition Capability of Scutellarein and Scutellarin Towards Important Live | — |
| `antocianina.md:17` | `10.3945/an.116.014852` | VERIFICADO | Medium | Effects of Anthocyanins on Cardiometabolic Health: A Systematic Review and Met | Effects of Anthocyanins on Cardiometabolic Health: A Systematic Review and Meta-Analysis o | 28916569 |
| `apigenina.md:17` | `10.1002/ptr.4895` | NO_CORRESPONDE | Medium | Apigenin and anxiety: review | A Natural Antioxidant Pine Bark Extract, Oligopin®, Regulates the Stress Chaperone HSPB1 i | — |
| `betaina.md:23` | `10.3390/nu13041280` | NO_CORRESPONDE | Medium | Betaine and fatty liver: review | Single High-Dose Vitamin D Supplementation as an Approach for Reducing Ultramarathon-Induc | — |
| `cafeina.md:17` | `10.1007/s00213-012-2917-4` | VERIFICADO | Medium | Caffeine as an attention enhancer: reviewing existing assumptions | Caffeine as an attention enhancer: reviewing existing assumptions | 23241646 |
| `capsaicina.md:16` | `10.3390/molecules25092152` | NO_CORRESPONDE | High | Capsaicin for pain management: mechanisms and clinical uses | Impacts of Freezing Temperature Based Thermal Conductivity on the Heat Transfer Gradient i | — |
| `capsaicina.md:24` | `10.1016/j.appet.2012.05.015` | VERIFICADO | Medium | Capsaicinoids and capsinoids. A potential role for weight management? A system | Capsaicinoids and capsinoids. A potential role for weight management? A systematic review  | 22634197 |
| `capsaicina.md:29` | `10.1016/bs.afnr.2015.07.002` | VERIFICADO | Medium | Capsaicin and Related Food Ingredients Reducing Body Fat Through the Activatio | Capsaicin and Related Food Ingredients Reducing Body Fat Through the Activation of TRP and | 26602570 |
| `capsaicina.md:34` | `10.1007/s42977-023-00174-3` | VERIFICADO | Medium | Peppers and their constituents against obesity | Peppers and their constituents against obesity | 37493973 |
| `capsaicina.md:39` | `10.1038/s41598-025-31073-3` | VERIFICADO | Medium | Capsaicin camphor and caffeic acid reduce adipogenesis and promote lipolysis w | Capsaicin camphor and caffeic acid reduce adipogenesis and promote lipolysis with TRPV1 in | 41331337 |
| `carvacrol.md:17` | `10.3389/fmicb.2014.00136` | NO_CORRESPONDE | Medium | Carvacrol antimicrobial mechanisms | Surface expression of protein A on magnetosomes and capture of pathogenic bacteria by magn | — |
| `cinamaldehido.md:17` | `10.1370/afm.1516` | NO_CORRESPONDE | Medium | Cinnamon and glucose: meta-analysis | Effectiveness of 2 Methods of Promoting Physical Activity, Healthy Eating, and Emotional W | — |
| `citral.md:23` | `10.1016/j.phymed.2011.02.003` | NO_CORRESPONDE | Medium | Citral anxiolytic effect in rodents | Genistein aglycone effect on bone loss is not enhanced by supplemental calcium and vitamin | — |
| `cuminaldehido.md:19` | `10.1016/S0271-5317` | — | — |  | (no resuelve) | — |
| `cuminaldehido.md:28` | `10.1002/food.200390091` | VERIFICADO | Low | In vitro influence of spices and spice-active principles on digestive enzymes  | In vitro influence of spices and spice‐active principles on digestive enzymes of rat pancr | 14727769 |
| `cuminaldehido.md:38` | `10.1186/s12906-024-04530-1` | VERIFICADO | Low | The effect of Cuminum cyminum on the return of bowel motility after abdominal  | The effect of Cuminum cyminum on the return of bowel motility after abdominal surgery: a t | 38965524 |
| `curcumina.md:17` | `10.1089/jmf.2020.0078` | NO_CORRESPONDE | High | Curcumin and inflammation: systematic review | Effect of Combined                     K. pinnata                     and Metformin Prepar | — |
| `curcumina.md:25` | `10.3390/ijms20030492` | NO_CORRESPONDE | Medium | Curcumin in Alzheimer's disease: review | Cell-Free Protein Synthesis Using S30 Extracts from Escherichia coli RFzero Strains for Ef | — |
| `dodecenal.md:23` | `10.1021/jf0354186` | NO_CORRESPONDE | Medium | Dodecenal kills Salmonella: in vitro | Antibacterial Activity of Coriander Volatile Compounds againstSalmonella choleraesuis | — |
| `eugenol.md:17` | `10.1016/j.jdent.2015.03.010` | NO_CORRESPONDE | High | Eugenol in dentistry: review | Setting characteristics of a resin infiltration system for incipient caries treatment | — |
| `eugenol.md:25` | `10.1002/ptr.3711` | NO_CORRESPONDE | Medium | Eugenol anti-inflammatory review | Antihepatoma Activity of the Acid and Neutral Components from Ganoderma lucidum | — |
| `genisteina.md:23` | `10.1136/bmj.39287.690475.ad` | VERIFICADO | Medium | Soy phytoestrogen genistein increases bone mineral density in postmenopausal w | Soy phytoestrogen genistein increases bone mineral density in postmenopausal women | — |
| `gingerol.md:17` | `10.1093/oxfordjournals.bja.a013442` | VERIFICADO | High | Efficacy of ginger for nausea and vomiting: a systematic review of randomised  | Efficacy of ginger for nausea and vomiting: a systematic review of randomized clinical tri | 10793599 |
| `gingerol.md:25` | `10.1016/j.jep.2009.10.004` | VERIFICADO_PARCIAL | Medium | Comparative antioxidant and anti-inflammatory effects of [6]-gingerol, [6]-sho | Comparative antioxidant and anti-inflammatory effects of [6]-gingerol, [8]-gingerol, [10]- | — |
| `licopeno.md:17` | `10.1158/1055-9965.340.13.3` | VERIFICADO_PARCIAL | Medium | The Role of Tomato Products and Lycopene in the Prevention of Prostate Cancer | The Role of Tomato Products and Lycopene in the Prevention of Prostate Cancer: A Meta-Anal | — |
| `licopeno.md:25` | `10.1016/j.atherosclerosis.2014.09.001` | NO_CORRESPONDE | Medium | Lycopene and CVD risk: meta-analysis | Vascular oxidative stress, nitric oxide and atherosclerosis | — |
| `limoneno.md:23` | `10.1000/altmed.12.1.0` | NO_RESOLVE | Low | D-limonene for GERD: trial | (no resuelve) | — |
| `limoneno.md:32` | `10.1002/...sobre` | — | — |  | (no resuelve) | — |
| `linalool.md:23` | `10.3389/fnbeh.2017.00241` | NO_CORRESPONDE | Medium | Linalool anxiolytic via olfaction: review | Traumatic Life Events in Relation to Cognitive Flexibility: Moderating Role of the BDNF Va | — |
| `mentol.md:23` | `10.1097/MCG.0000000000000043` | NO_CORRESPONDE | High | Peppermint oil and IBS: meta-analysis | MELD-Na | — |
| `oleocanthal.md:23` | `10.1038/437045a` | NO_CORRESPONDE | Medium | Oleocanthal and COX inhibition | Ibuprofen-like activity in extra-virgin olive oil | — |
| `piperina.md:17` | `10.1055/s-2006-957450` | VERIFICADO | High | Influence of Piperine on the Pharmacokinetics of Curcumin in Animals and Human | Influence of Piperine on the Pharmacokinetics of Curcumin in Animals and Human Volunteers | 9619120 |
| `piperina.md:23` | `10.1007/s00228-016-2173-3` | VERIFICADO | High | The influence of piperine on the pharmacokinetics of fexofenadine, a P-glycopr | The influence of piperine on the pharmacokinetics of fexofenadine, a P-glycoprotein substr | 27981349 |
| `piperina.md:38` | `10.1007/s10753-012-9448-3` | VERIFICADO_PARCIAL | Low | Anti-inflammatory Effect of Piperine in Adjuvant-Induced Arthritic Rats | Anti-inflammatory Effect of Piperine in Adjuvant-Induced Arthritic Rats—a Biochemical Appr | — |
| `quercetina.md:17` | `10.3390/molecules21050623` | VERIFICADO_PARCIAL | Medium | Quercetin and allergic diseases | Quercetin and Its Anti-Allergic Immune Response | — |
| `quercetina.md:25` | `10.1161/JAHA.115.002713` | VERIFICADO (título abreviado) | Medium | Quercetin and blood pressure: meta-analysis | Effects of Quercetin on Blood Pressure: A Systematic Review and Meta‐Analysis of Randomize | — |
| `resveratrol.md:17` | `10.3390/nu11092147` | NO_CORRESPONDE | Medium | Resveratrol and CVD: systematic review | Dietary Curcumin: Correlation between Bioavailability and Health Potential | — |
| `sulforafano.md:17` | `10.1053/j.seminoncol.2015.09.013` | VERIFICADO | High | Frugal chemoprevention: targeting Nrf2 with foods rich in sulforaphane | Frugal chemoprevention: targeting Nrf2 with foods rich in sulforaphane | 26970133 |
| `teobromina.md:17` | `10.3389/fphar.2017.00460` | NO_CORRESPONDE | Medium | Theobromine and blood pressure: review | Drugs for Autoimmune Inflammatory Diseases: From Small Molecule Compounds to Anti-TNF Biol | — |
| `timol.md:17` | `10.1111/j.1365-2672.2012.05270.x` | NO_CORRESPONDE | Medium | Thymol antimicrobial review | Antimicrobial effect and mode of action of terpeneless cold-pressed Valencia orange essent | — |
| `vanilina.md:17` | `10.1016/j.appet.2014.03.010` | NO_CORRESPONDE | Low | Vanillin aroma and mood: pilot | The effects of prefrontal cortex transcranial direct current stimulation (tDCS) on food cr | — |
| `zeaxantina.md:23` | `10.1001/jama.2013.4997` | VERIFICADO | High | Lutein + Zeaxanthin and Omega-3 Fatty Acids for Age-Related Macular Degenerati | Lutein + Zeaxanthin and Omega-3 Fatty Acids for Age-Related Macular Degeneration | 23644932 |

### 1.3 Los 23 `NO_CORRESPONDE` — el hallazgo más grave

Todos estos tienen el mismo patrón: la ficha afirma un compuesto (capsaicina, curcumina, eugenol…) y el DOI resuelve a un artículo de otro tema en la misma revista y el mismo año. La revista y el año sí coinciden, lo que sugiere que el DOI se generó por coincidencia de revista+año en lugar de leerse del artículo.

| Archivo:línea | DOI | Título que afirma la ficha | Título real (Crossref) |
|---|---|---|---|
| `alil-isotiocianato.md:17` | `10.1021/jf903822e` | Allyl isothiocyanate and airway clearance | Metabolomics Revealed Novel Isoflavones and Optimal Cultivation Time of *Cordyceps militaris* Fermentation |
| `anetol.md:17` | `10.1016/j.jep.2010.03.005` | Anise and functional dyspepsia | Correlation between synergistic action of *Radix Angelica dahurica* extracts on analgesic effects of *Corydalis* alkaloid… |
| `anetol.md:25` | `10.1002/ptr.4990` | Anethole expectorant review | Comparison of Inhibition Capability of Scutellarein and Scutellarin Towards Liver UDP-Glucuronosyltransferase Isoforms |
| `apigenina.md:17` | `10.1002/ptr.4895` | Apigenin and anxiety: review | A Natural Antioxidant Pine Bark Extract, Oligopin®, Regulates the Stress Chaperone HSPB1… |
| `betaina.md:23` | `10.3390/nu13041280` | Betaine and fatty liver: review | Single High-Dose Vitamin D Supplementation… Reducing Ultramarathon-Induced Inflammation |
| `capsaicina.md:16` | `10.3390/molecules25092152` | Capsaicin for pain management: mechanisms and clinical uses | Impacts of Freezing Temperature Based Thermal Conductivity on the Heat Transfer Gradient in Nanofluids |
| `carvacrol.md:17` | `10.3389/fmicb.2014.00136` | Carvacrol antimicrobial mechanisms | Surface expression of protein A on magnetosomes and capture of pathogenic bacteria… |
| `cinamaldehido.md:17` | `10.1370/afm.1516` | Cinnamon and glucose: meta-analysis | Effectiveness of 2 Methods of Promoting Physical Activity, Healthy Eating, and Emotional Well-Being (AIM) |
| `citral.md:23` | `10.1016/j.phymed.2011.02.003` | Citral anxiolytic effect in rodents | Genistein aglycone effect on bone loss is not enhanced by supplemental calcium and vitamin D3 |
| `curcumina.md:17` | `10.1089/jmf.2020.0078` | Curcumin and inflammation: systematic review | Effect of Combined *K. pinnata* and Metformin Preparation on Inflammatory Cytokines |
| `curcumina.md:25` | `10.3390/ijms20030492` | Curcumin in Alzheimer's disease: review | Cell-Free Protein Synthesis Using S30 Extracts from *E. coli* RFzero Strains |
| `dodecenal.md:23` | `10.1021/jf0354186` | Dodecenal kills *Salmonella*: in vitro | Antibacterial Activity of Coriander Volatile Compounds against *Salmonella choleraesuis* |
| `eugenol.md:17` | `10.1016/j.jdent.2015.03.010` | Eugenol in dentistry: review | Setting characteristics of a resin infiltration system for incipient caries treatment |
| `eugenol.md:25` | `10.1002/ptr.3711` | Eugenol anti-inflammatory review | Antihepatoma Activity of the Acid and Neutral Components from *Ganoderma lucidum* |
| `licopeno.md:25` | `10.1016/j.atherosclerosis.2014.09.001` | Lycopene and CVD risk: meta-analysis | Vascular oxidative stress, nitric oxide and atherosclerosis |
| `linalool.md:23` | `10.3389/fnbeh.2017.00241` | Linalool anxiolytic via olfaction: review | Traumatic Life Events in Relation to Cognitive Flexibility: Moderating Role of the BDNF Val66Met Gene Polymorphism |
| `mentol.md:23` | `10.1097/MCG.0000000000000043` | Peppermint oil and IBS: meta-analysis | **MELD-Na** |
| `oleocanthal.md:23` | `10.1038/437045a` | Oleocanthal and COX inhibition | Ibuprofen-like activity in extra-virgin olive oil |
| `resveratrol.md:17` | `10.3390/nu11092147` | Resveratrol and CVD: systematic review | Dietary Curcumin: Correlation between Bioavailability and Health Potential |
| `teobromina.md:17` | `10.3389/fphar.2017.00460` | Theobromine and blood pressure: review | Drugs for Autoimmune Inflammatory Diseases: From Small Molecule Compounds to Anti-TNF Biologics |
| `timol.md:17` | `10.1111/j.1365-2672.2012.05270.x` | Thymol antimicrobial review | Antimicrobial effect and mode of action of terpeneless cold-pressed Valencia orange essential oil on MRSA |
| `vanilina.md:17` | `10.1016/j.appet.2014.03.010` | Vanillin aroma and mood: pilot | The effects of prefrontal cortex transcranial direct current stimulation (tDCS) on food craving… |

**Veredicto por ficha:** **20 de 30 substancias** tienen al menos una cita que no sostiene lo que la ficha afirma (22 `NO_CORRESPONDE` en total; uno de ellos, `quercetina.md:25`, es un título abreviado y cuenta como verificado). Las **10 substancias con todas sus citas limpias** son: `alicina`, `antocianina`, `cafeina`, `cuminaldehido`, `genisteina`, `gingerol`, `piperina`, `quercetina`, `sulforafano`, `zeaxantina`. `capsaicina` y `licopeno` están limpias salvo una cita cada una (las de `capsaicina.md:16` y `licopeno.md:25`, que están justo en la tabla anterior). `limoneno` no tiene ninguna cita válida.

### 1.4 DOI que no resuelven

| Archivo:línea | DOI | HTTP | Observación |
|---|---|---|---|
| `limoneno.md:23` | `10.1000/altmed.12.1.0` | **404** en Crossref y en `doi.org` | Marcado `doi_status: unverified` ✅ pero **se publica igual** (§2) |
| `limoneno.md:32` | `10.1002/...sobre` | **404** | No es un DOI: es un fragmento de texto dentro de un comentario YAML (`# el comparador mas cercano (doi 10.1002/...sobre reflujo y limoneno)`). No se renderiza como enlace. Bajo riesgo, pero es basura en el campo. |
| `cuminaldehido.md:19` | `10.1016/S0271-5317` | **404** | Comentario YAML que documenta que el DOI original **no existía** y fue sustituido. Correcto como nota; el fragmento es ambiguo y se lee como un DOI truncado. |

Verificación:

```bash
for d in 10.1000/altmed.12.1.0 10.1002/...sobre 10.1016/S0271-5317; do
  curl -s -H "User-Agent: GOS-audit/1.0" "https://api.crossref.org/works/$d"   # → "Resource not found."
  curl -s -L -o /dev/null -w "%{http_code}\n" "https://doi.org/$d"            # → 404
done
```

### 1.5 Fuera de `substances`: 4 DOI más que no resuelven

| Archivo:línea | DOI | Contexto | HTTP |
|---|---|---|---|
| `mixtures/tomate-aceite-oliva.md:20` | `10.1007/s00394-012-0382-3` | "Olive oil enhances the bioaccessibility and bioavailability of lycopene from tomato products", `source: "European Journal of Nutrition"`, `year: 2012` | 404 en Crossref y doi.org |
| `ingredients/legumes/frijol.md:21` | `10.1017/s1368980009990273` | "Legume consumption and risk of coronary heart…", `source: Public Health Nutrition` | 404 |
| `mixtures/mx-tonico-de-cacao-y-epazote.md:23,24` | `10.1021/acs.jafc.0c03120` | "Phytochemical characterization and bioactivity of traditional Mesoamerican cacao-epazote decoctions" | 404 (duplicado en la misma línea y en la 24) |
| `mixtures/cebolla-ajo.md:21` | `10.1021/jf070012q` | "Synergistic antiplatelet and antioxidant effects of *Allium cepa* and *Allium sativum* combinations" | 404 |

Los cuatro están publicados con `evidence_level` y se sirven en `dist/`. Nota: `10.1021/jf070012q` y `10.1021/jf903822e` tienen **el mismo prefijo editorial pero el primero no existe** — evidencia de que se compuso el DOI por patrón (`acs.jafc.*` es un journal inexistente: el real es `Journal of Agricultural and Food Chemistry`, prefijo `10.1021/jf*`).

---

## 2. `doi_status`: ¿algo `unverified` se publica como verificado?

**Sí. Uno: `limoneno.md`.**

```bash
grep -rn doi_status site/src/content/
```
```
substances/cuminaldehido.md:30:        doi_status: verified
substances/cuminaldehido.md:43:        doi_status: verified
substances/genisteina.md:30:        doi_status: verified
substances/cafeina.md:22:    doi_status: verified
substances/piperina.md:22:      doi_status: verified
substances/piperina.md:28:      doi_status: verified
substances/piperina.md:43:      doi_status: verified
substances/limoneno.md:35:        doi_status: unverified
```

Solo hay 8 escrituras de `doi_status` en 44 estudios. El campo se aplicó manualmente a 8 entradas y los otros 36 no tienen ninguno. Consecuencias:

### 2.1 El `unverified` de limoneno se filtra en el JSON-LD pero **no en el HTML visible**

`site/src/pages/substances/[...slug].astro:108-115` renderiza la lista de estudios **sin mirar `doi_status`**:

```astro
{h.studies.map(st => (
  <li>
    {st.title} — <em>{st.source}{st.year ? ` ${st.year}` : ''}</em>
    {st.doi && <a href={`https://doi.org/${st.doi}`} ...> {st.doi}</a>}
  </li>
))}
```

Comprobado en el build actual:

```bash
grep -o 'altmed\.12\.1\.0' site/dist/substances/limoneno/index.html | wc -l   # → 3
```
Las 3 apariciones: JSON-LD `citation.sameAs`, JSON-LD y el `<a href="https://doi.org/10.1000/altmed.12.1.0">` **visible en el cuerpo de la página**, junto al badge `Low`. El lector ve "D-limonene for GERD: trial — Alt Med Rev 2007" con un enlace que devuelve 404.

`site/src/pages/api/evidence.json.ts:66-71` sí filtra correctamente (`verified: false`), y `evidence.json.ts:146` marca `verified: r.doi_status !== 'unverified'`. El resultado en `dist/api/evidence.json`:

```
entries_with_studies: 47   studies_with_doi: 61   studies_without_doi: 1
```
`limoneno` desaparece de `items` (su único estudio queda sin verificar) ✅ — pero la ficha sigue online y enlaza al DOI muerto.

### 2.2 Los `doi_status: verified` no significan lo que dicen

Los 7 marcados `verified` resuelven todos (correcto), pero `cuminaldehido.md:43` está verificado como DOI y marcado `Low` porque —como dice el propio comentario en la línea 40-42— la población del ensayo (post-quirúrgica, 74 pacientes) no es la de la condición declarada (IBS). El campo `verified` valida **que el identificador existe**, no que la cita sostenga el claim. El nombre del campo invita a confundir ambas cosas.

### 2.3 Los 23 `NO_CORRESPONDE` se publican con `verified: true`

```bash
python3 -c "import json;d=json.load(open('site/dist/api/evidence.json'));print(sum(1 for i in d['items'] if i['kind']=='substance' for s in i['studies'] if s.get('verified')))"
# → 43
```
Los 43 estudios de sustancias salen con `verified: true`, incluidos los 23 que apuntan a otro artículo. Y el encabezado del endpoint afirma:

```json
"desc": "Evidencia científica con DOI verificado. Cada doi resuelve en Crossref."
```

Esa frase es cierta (resuelven) y engañosa (no son la evidencia que se dice). Además el comentario de cabecera del mismo archivo (línea 15) dice: *"Cada estudio incluido lleva un `doi` que resuelve en Crossref"* — confunde resolver con corresponder.

---

## 3. Niveles de evidencia: cuáles no son defendibles

Regla aplicada (del propio repo, `cuminaldehido.md:19-23`): *"in vitro o animal = Low, nunca Medium ni High, porque no hay condicion clinica humana"*. La apliqué a los 44 leyendo el abstract real (PubMed/Crossref), no el título.

### 3.1 `evidence_level` demasiado alto — 8 casos, más 1 control positivo

| Archivo:línea | Sustancia / condición | Declarado | Abstract real | Debería ser |
|---|---|---|---|---|
| `gingerol.md:17` | Nausea / Motion sickness | **High** | PMID 10793599. Meta-análisis de 6 ECA, n bajo. *"The pooled absolute risk reduction for the incidence of postoperative nausea indicated a **non-significant difference**… one study was found for each of the following conditions: seasickness"*. | **Medium** (revisión sistemática de muestras pequeñas, resultado principal no significativo) |
| `capsaicina.md:16` | Pain / Neuropathy | **High** | El DOI apunta a *"Impacts of Freezing Temperature Based Thermal Conductivity…"* — ingeniería de fluidos. No hay abstract de caps:aicina. **El nivel no tiene base.** | Eliminar la cita; si se busca evidencia real de capsaicina y dolor, el nivel sería Medium como máximo |
| `curcumina.md:17` | Inflammation / Arthritis | **High** | DOI apunta a *"Effect of Combined *K. pinnata* and Metformin Preparation on Inflammatory Cytokines"*. No sostiene curcumina. | Eliminar la cita. Un SR de curcumina e inflamación sería Medium, nunca High |
| `eugenol.md:17` | Dental pain | **High** | DOI apunta a *"Setting characteristics of a resin infiltration system for incipient caries treatment"*. | Eliminar la cita |
| `mentol.md:23` | IBS pain | **High** | DOI apunta a *"MELD-Na"*. Para IBS con peppermint oil la literatura real es un meta-análisis (Medium), no High | **Medium** con cita correcta |
| `sulforafano.md:17` | Cancer prevention | **High** | PMID 26970133, `PublicationType: Review`. El abstract dice: *"preclinical studies have focused principally on sulforaphane itself, while clinical studies have relied on broccoli sprout preparations"*. Es una revisión narrativa de evidencia preclínica prometedora + ensayos con brotes de brócoli. | **Medium** (revisión; falta evidencia de desenlaces clínicos) |
| `piperina.md:17` | Nutrient malabsorption | **High** | PMID 9619120, `PublicationType: Clinical Trial`, n de voluntarios humanos pequeño, outcome = farmacocinética de curcumina, **no malabsorción**. La condición declarada no es la del estudio. | **Medium** y renombrar la condición a "bioavailability enhancement" |
| `piperina.md:23` | Nutrient malabsorption | **High** | PMID 27981349, **n = 12** voluntarios, abierto, no aleatorizado, outcome = Cmax de fexofenadina. | **Low** (ensayo farmacocinético pequeño; no es evidencia clínica de absorción) |
| `zeaxantina.md:23` | AMD | **High** | PMID 23644932, AREDS2, ECA fase 3 multicéntrico. **Control positivo: este nivel High sí es defendible** | High ✅ |

Nota sobre `piperina.md:17/23`: ambos estudios son de *interacción farmacocinética* (piperina inhibe P-gp/CYP3A4), lo que documenta un mecanismo, no un beneficio clínico sobre "nutrient malabsorption". El nivel High sobre esa condición no es defendible.

### 3.2 `evidence_level` demasiado bajo (subdeclarado) — no es error, es deuda

`cuminaldehido.md:38` está en `Low` con un ECA triple ciego (PMID 38965524). El repo lo justifica correctamente: la población es post-quirúrgica, no IBS. **El razonamiento es correcto y debe conservarse.**

### 3.3 Slots de evidencia vacíos

7 substancias tienen `evidence_level` asignado pero **ningún estudio publicable** (o el estudio no corresponde):

| Archivo:línea | Condición | `evidence_level` | Problema |
|---|---|---|---|
| `mentol.md:18` | IBS pain | High | Único estudio apunta a "MELD-Na" |
| `oleocanthal.md:18` | Alzheimer / Inflammation | Medium | DOI apunta a un comentario de revista (`Ibuprofen-like activity…`, Nature 2005), no a un estudio primario |
| `linalool.md:18` | Anxiety | Medium | DOI apunta a estudios de BDNF/TCE |
| `citral.md:18` | Anxiety | Medium | DOI apunta a genisteína y hueso |
| `dodecenal.md:18` | Salmonellosis | Medium | DOI es *otro* estudio de coriandero (mismo año/journal) |
| `vanilina.md:14` | Anxiety / Appetite | Low | DOI apunta a tDCS y food craving |
| `betaina.md:18` | NAFLD / Fatty liver | Medium | DOI apunta a vitamina D y maratón |

Un consumidor que lee `evidence_level: High` con un DOI que no corresponde concluye que **existe** evidencia alta. No la hay, o no es la que se cita.

### 3.4 Incoherencia de vocabulario en `evidence_level` (todo el repo)

`evidence_level` no tiene enum en `site/src/content.config.ts:125` (`z.string().optional()`), y el repo usa **5 escalas distintas** conviviendo:

```
85 × 'High'          40 × 'Medium'        34 × 'bien establecida'
 7 × 'Low'           2 × 'Moderate'        1 × 'parcialmente establecida'
 1 × 'Anecdotal/Medium'
 5 × textos largos:  'Sólida (NHLBI DASH trial 1997: ↓11mmHg PAS…)'
                     'Bien establecida: ↓enfermedad cardiovascular…'
                     'Moderada para pérdida de peso a 6-12 meses…'
```

`Moderate` (2 mezclas) y `Medium` (40 ingredientes) son la misma categoría con dos nombres; `High` y `bien establecida` también. Y 5 campos de dieta guardan un párrafo entero en el nivel, que ninguna regla puede parsear:

```bash
grep -rn "evidence_level" site/src/content/diets/dash.md site/src/content/diets/mediterranean.md
```

**Recomendación:** añadir `z.enum(['High','Medium','Low'])` al schema y migrar. Los 5 valores de texto libre deben pasar a un campo `evidence_note` separado.

---

## 4. Las 495 recetas

```bash
find site/src/content/dishes -name '*.md' | wc -l   # → 495
```

### 4.1 PLACEHOLDER PUBLICADO — 22 recetas, 84 tokens `[Pendiente]`

🔴 **Error grave: se ve como dato real.** `[Pendiente]` aparece dentro de la ficha publicada, no como TODO de desarrollo.

```
84 × [Pendiente]  en 22 archivos
```

| Archivo | Líneas |
|---|---|
| `colombian/amazonia/recetas_amazonia.md` | 39, 40, 41, 52, 53, 57 |
| `colombian/andina/recetas_andinas.md` | 39, 40, 41, 52, 53, 57 |
| `colombian/insular/recetas_insulares.md` | 39, 40, 41, 52, 53, 57 |
| `colombian/pacifica/recetas_pacificas.md` | 39, 40, 41, 52, 53, 57 |
| `colombian/caribe/recetas_caribe.md` | 52, 53, 57 |
| `colombian/orinoquia/recetas_orinoquia.md` | 45, 46, 47, 58, 59, 63 |
| `colombian/condimentos/salsa_rosada/salsa_rosada.md` | 136, 137, 138, 149, 150, 154 |
| `colombian/bebidas/avena/avena.md` | 139, 140, 144 |
| `colombian/bebidas/salpicon/salpicon.md` | 172, 173, 177 |
| `colombian/condimentos/guacamole_colombiano/guacamole_colombiano.md` | 153, 154, 158 |
| `colombian/nacionales/arroz_con_pollo/arroz_con_pollo.md` | 127, 128, 132 |
| `colombian/nacionales/chuzo/chuzo.md` | 174, 175, 179 |
| `colombian/nacionales/fritanga/fritanga.md` | 177, 178, 182 |
| `colombian/nacionales/hamburguesa_colombiana/hamburguesa_colombiana.md` | 173, 174, 178 |
| `colombian/nacionales/papas_aborrajadas/papas_aborrajadas/papas_aborrajadas.md` | 162, 163, 167 |
| `colombian/otras_preparaciones/cayeye.md` | (ver archivo) |

Contenido publicado, p. ej. `colombian/andina/recetas_andinas.md:52-57`:

```markdown
### Categorización Sensorial y de Uso
- **Perfil de sabor:** [Pendiente]
### Perfil Nutricional (Estimado)
- **Calorías:** ~0 kcal
- **Proteína:** ~0g
```

### 4.2 Recetas-índice publicadas como recetas (6)

6 archivos no son recetas: son un listado de 10 títulos, y aun así se sirven en `/recipes/<slug>` con JSON-LD `Recipe` y aparecen en el sitemap:

```
colombian/amazonia/recetas_amazonia.md      "10 recetas más emblemáticas de la región Amazónica de Colombia"
colombian/andina/recetas_andinas.md          "10 recetas más emblemáticas de la región Andina de Colombia"
colombian/caribe/recetas_caribe.md           "10 recetas más emblemáticas de la región Caribe de Colombia"
colombian/insular/recetas_insulares.md       "10 recetas más emblemáticas de la región Insular de Colombia"
colombian/pacifica/recetas_pacificas.md      "10 recetas más emblemáticas de la región Pacífica de Colombia"
colombian/orinoquia/recetas_orinoquia.md     "Recetas de la Orinoquía"
```

Ninguno tiene `servings`, `prep_time`, `cook_time` ni `main_ingredients`. El esquema `dishes` los acepta porque todos los campos son `optional()` (`content.config.ts:8-18`).

### 4.3 22 `README.md` publicados como recetas

Los 22 `README.md` bajo `dishes/` se sirven como `/recipes/colombian/readme`, `/recipes/peruvian/costa/readme`, etc., con `Recipe` JSON-LD y sin ningún dato. `generate-sitemap.js:28` solo espeja el nombre (`/README` → `/readme`) para no generar 404, lo cual garantiza que un índice de directorio se publique como receta.

### 4.4 Ceros que significan "desconocido" (16 recetas)

| Archivo | Calorías | protein_g | carbs_g | fat_g | Lectura real |
|---|---|---|---|---|---|
| `colombian/amazonia/recetas_amazonia.md` | 0 | 0 | 0 | 0 | Desconocido |
| `colombian/andina/recetas_andinas.md` | 0 | 0 | 0 | 0 | Desconocido |
| `colombian/caribe/recetas_caribe.md` | 0 | 0 | 0 | 0 | Desconocido |
| `colombian/insular/recetas_insulares.md` | 0 | 0 | 0 | 0 | Desconocido |
| `colombian/orinoquia/recetas_orinoquia.md` | 0 | 0 | 0 | 0 | Desconocido |
| `colombian/pacifica/recetas_pacificas.md` | 0 | 0 | 0 | 0 | Desconocido |
| `argentinian/asado_criollo.md` | 780 | 52 | **0** | 64 | 0 g de carbohidratos en un asado con achuras y pan: **imposible**, es dato faltante |
| `brazilian/churrasco.md` | 460 | 38 | **0** | 34 | ídem |
| `colombian/orinoquia/mamona/mamona.md` | 450 | 32 | **0** | 28 | ídem |
| `brazilian/caipirinha.md` | 180 | 0.1 | 15 | **0** | 0 g de grasa en coctail con cachaça: **imposible** |
| `colombian/bebidas/guarapo/guarapo.md` | 150 | 0.1 | 38 | **0** | ídem |
| `colombian/bebidas/refajo/refajo.md` | 180 | 1 | 25 | **0** | ídem |
| `cuban/mojito.md` | 140 | 0.1 | 9 | **0** | ídem |
| `colombian/condimentos/salsa_rosada/salsa_rosada.md` | 4 | 0.1 | 1.5 | **0** | ídem (4 kcal pero 0 g de grasa) |
| `colombian/amazonia/casabe/casabe/casabe.md` | **3** | 0 | 0.8 | 0 | 3 kcal para una arepa de queso: subestimado, no cero |
| `colombian/amazonia/farina/farina.md` | **3** | 0 | 0.8 | 0 | ídem |

**A favor del repo:** `hasNutrition()` en `site/src/lib/recipe-standard.ts` filtra el bloque cuando todo es cero, y `/recipes/[...slug].astro:121` lo usa (`showNutrition`). Los 6 todo-en-cero no emiten nutrición en la UI. **Pero los ceros parciales sí se publican**: `argentinian/asado_criollo.md` renderiza "Calorías 780 kcal / Proteínas 52 g / Grasas 64 g" y **omite los carbohidratos** (`nutrition?.macros?.carbs_g ?` filtra el 0), produciendo una tabla de 3 de 4 con un hueco invisible para el usuario.

### 4.5 Unidades incoherentes

**Tiempo — 7 formatos conviviendo en 495 recetas:**

| Formato | prep_time | cook_time |
|---|---|---|
| `"30 minutos"` (string) | 365 | 345 |
| `30` (int, sin unidad) | 34 | 35 |
| `"30"` (string numérico) | 35 | 35 |
| `"2 horas"` | 11 | 23 |
| `"1 hora"` | 11 | 15 |
| `"1 hora 30 minutos"` | 2 | 4 |
| `"15-20 minutos"` (rango) | 0 | 2 |
| `"2 horas (más remojo previo)"` (texto libre) | 4 | 3 |
| `"3 días (fermentación)"` | 1 | 0 |

`content.config.ts:13-15` acepta `z.union([z.string(), z.number()])`, así que el schema no puede normalizar. El consumidor `/recipes/[...slug].astro:143-144` hace `prep.replace(/\D/g,'')` y lo convierte a `PT{n}M` — es decir, **treats "2 horas" as 2 minutes**:

```astro
prepTime: prep ? `PT${prep.replace(/\D/g, '')}M` : undefined,
```
`"2 horas y 30 minutos"` → `PT230M` (3h50m en vez de 2h30m). `PT120M` es schema.org válido pero engaña. Cualquier hora se convierte a minutos sin multiplicar por 60. **Esto es DATO INCOHERENTE publicado como structured data.**

**Porciones:** 465 enteros, 1 rango (`"4-6"`, `colombian/nacionales/fritanga/fritanga.md`), 1 con unidad (`"4 unidades"`, `papas_aborrajadas`).

**Masa en el cuerpo:** conviven `g` (464), `cucharadita` (142), `cucharadas` (131), `tazas` (106), `kg` (92), `ml` (52), `mg` (7), `onzas` (3) sin campo de cantidad estructurada.

### 4.6 Slugs duplicados

Ninguno. `Counter(slug.lower())` → 0 colisiones en 495. Astro normaliza a minúsculas, y no hay dos archivos que colisionen.

### 4.7 Títulos duplicados (contenido duplicado, no slug)

| Título | Archivos |
|---|---|
| `tamal tolimense` | `colombian/andina/tamal_tolimense/tamal_tolimense.md` y `colombian/otras_preparaciones/tamal_tolimense.md` |
| `mote de queso` | `colombian/caribe/mote_de_queso/mote_de_queso.md` y `colombian/otras_preparaciones/mote_de_queso.md` |

Dos URLs distintas, mismo título y presumiblemente mismo plato: riesgo de contenido duplicado y de canibalización.

---

## 5. Los 552 ingredientes

```bash
find site/src/content/ingredients -name '*.md' | wc -l   # → 552
```

| Grupo | Fichas |
|---|---|
| `pending_review/` | **515** |
| `condiments` 6 · `proteins` 5 · `dairy` 4 · `grains` 4 · `vegetables` 10 · `fruits` 2 · `legumes` 2 · `oils` 2 · `sauces` 2 | **37** |

### 5.1 Los 515 `pending_review` NO son indexables ✅ (confirmado en el build)

Tres comprobaciones independientes, todas en verde:

**(a) No están en el sitemap**
```bash
grep -c pending_review site/dist/sitemap.xml          # → 0
python3 -c "
import re;s=open('site/dist/sitemap.xml').read();u=re.findall(r'<loc>([^<]+)',s)
print(len(u), sum(1 for x in u if 'pending_review' in x))"
# → 590 0
```
`generate-sitemap.js:75-78` los filtra explícitamente:
```js
for (const id of collectMd(path.join(contentDir, 'ingredients'))) {
  if (id.startsWith('pending_review/')) continue
  add(`/ingredients/${id}`, '0.6')
}
```

**(b) Las páginas existen pero llevan `noindex`**
```bash
ls site/dist/ingredients/pending_review/*/index.html | wc -l   # → 515
grep -o '<meta name="robots"[^>]*>' site/dist/ingredients/pending_review/孜然粉/index.html
# → <meta name="robots" content="noindex, follow">
```
`/ingredients/[...slug].astro:52,73`:
```ts
const isPendingReview = entry.id.startsWith('pending_review/')
...
noindex={isPendingReview}
```
Las 37 fichas reales llevan lo contrario: `<meta name="robots" content="index, follow">` ✅

**(c) El equipo tiene una visiónyi del por qué:** `generate-sitemap.js:68-74` y `ingredients/[...slug].astro:47-51` documentan que son stubs con `scientific_name: "TODO"`, nutrientes en 0 y `benefit: "Unknown"`.

### 5.2 PERO los stubs `pending_review` sí se publican como datos en 2 endpoints de agente

🔴 Los `noindex` protegen a buscadores, no a un agente que consume la API. Los 515 stubs son datos **publicados como reales** en:

```bash
grep -c pending_review site/dist/api/agent/catalog.json      # → 1030
grep -c pending_review site/dist/api/ingredients/variants.json  # → 2060
```

Contenido literal de `catalog.json` (extracto):
```json
{"kind":"ingredient","id":"pending_review/_4_ajíes_picantes_frescos",
 "label":"-4 Ajíes Picantes Frescos","url":"/ingredients/pending_review/_4_ajíes_picantes_frescos",
 "haystack":"-4 Ajíes Picantes Frescos TODO Uncategorized ",
 "fields":{"nombre_cientifico":"TODO","grupo":"Uncategorized"}}
```

`llms.txt`, `llms-full.txt`, `feed.json`, `api/all.json`, `api/index.json`, `graph-data.json` **no** contienen `pending_review` (0 menciones) ✅.

**Efecto:** un agente que consulta `/api/agent/catalog.json` ve 515 ingredientes con `nombre_cientifico: "TODO"` y nombres corruptos (`"-4 Ajíes Picantes Frescos"`, `"-8 Guineos Verdes"`), indistinguibles de las 37 fichas reales. El `noindex` no aplica a ellos.

### 5.3 Placeholders en las 37 fichas indexables

**3 `scientific_name: "N/A"` publicados como si fuera un dato taxonómico:**

| Archivo | Valor | Realidad |
|---|---|---|
| `oils/aceite.md:12` | `N/A` | Aceite vegetal (mezcla de soya/girasol/palma) no tiene nombre científico único — `N/A` es correcto, pero se publica como `nombre_cientifico` en `catalog.json` |
| `dairy/queso.md:9` | `N/A` | "Queso Campesino/Cuajada/Costeño" — un queso genérico: el género *Bos taurus* no procede, y sí procede el microorganismo (*Lactobacillus*, *Streptococcus*); el campo debería ser el género del microorganismo (`*Lactobacillus*`, *Streptococcus*) o eldeclare que no aplica |
| `sauces/hogao.md` | `N/A` | SalsaConfiguration regional, sin equivalente taxonómico |

El primero aparece en `catalog.json` como `"nombre_cientifico":"N/A"` — un agente lo leerá como nombre científico.

### 5.4 Ceros = "desconocido" (27 valores en fichas reales)

| Ruta | Ceros | Archivos |
|---|---|---|
| `nutrition_per_100g.fiber_g` | 11 | `condiments/panela`, `dairy/crema_leche`, `dairy/leche`, `dairy/mantequilla`, `dairy/queso`, `oils/aceite`, … |
| `nutrition_per_100g.carbs_g` | 7 | `condiments/sal`, `oils/aceite`, `oils/aceite_ajonjoli`, `proteins/carne_res`, `proteins/cerdo`, `proteins/pescado` |
| `nutrition_per_100g.protein_g` | 4 | `condiments/panela`, `condiments/sal`, `oils/aceite`, `oils/aceite_ajonjoli` |
| `nutrition_per_100g.fat_g` | 2 | `condiments/panela`, `condiments/sal` |
| `nutrition_per_100g.calories` | 1 | `condiments/sal` |
| `nutrition_per_100g.sugar_g` | 1 | `oils/aceite` |

Casos donde el 0 es **falso**:
- `condiments/sal.md:14-17`: `calories: 0, carbs_g: 0, fat_g: 0, protein_g: 0`. La sal no tiene calorías (correcto), pero la UI oculta el bloque entero y no dice "sin calorías".
- `oils/aceite.md`: `fat_g: 100` con `protein_g: 0` — omitir 100 g de grasa en 14 g de porción es dato ausente, no cero.
- `proteins/carne_res.md`, `proteins/cerdo.md`, `proteins/pescado.md`: `carbs_g: 0` correcto; `fiber_g: 0` es asumible.

### 5.5 Nombres duplicados (contenido duplicado)

| Nombre | Archivos |
|---|---|
| `Arroz Blanco` | `pending_review/arroz_blanco.md` (`scientific_name: TODO`) y `grains/arroz.md` (`Oryza sativa`) |
| `Crema de Leche` | `pending_review/crema_de_leche.md` (`TODO`) y `dairy/crema_leche.md` (`Bos taurus`) |

Duplicados de baja gravedad: la versión `pending_review` es noindex, y solo el nombre colisiona.

---

## 6. Las 30 substancias: contraindicaciones y efectos

### 6.1 Las 30 fichas NO tienen contraindicaciones

Búsqueda de términos de seguridad en el cuerpo y el frontmatter de las 30:

```bash
grep -rniE "contraindicaci|interacci|efecto adverso|toxicidad|tóxic|alergia|advertencia|precauci|embarazo|lactancia|niños" \
  site/src/content/substances/
# → 1 única coincidencia en todo el directorio
```

`gingerol.md:7` menciona "embarazo" dentro de una frase descriptiva, no como advertencia.

**Las 30 substancias tienen `sources: ["PubMed", "NIH"]` en el frontmatter, y ninguna cita un solo efecto adverso, contraindicación ni interacción.** Eso es DATO AUSENTE con impacto de salud: la ficha de `piperina` afirma `evidence_level: High` para CYP3A4/P-gp e ignoramos por completo el efectoWell-documented de la misma sustancia en la misma vía (interacciones farmacocinéticas). Las 2 fichas de piperina que sí son `verified` (PMID 9619120, PMID 27981349) son precisamente estudios de interacción farmacocinética — el lado oscuro de la misma molécula.

Comparación: las **45 mezclas** sí tienen `contraindications` (`content.config.ts:157`), y 45/45 lo declaran. Las 30 substancias, 0/30.

### 6.2 Afirmaciones de beneficio sin base verificable

Además de los 23 `NO_CORRESPONDE` de §1.3, el campo `sources: ["PubMed", "NIH"]` de las 30 fichas **no es citable**: son rótulos de fuente sin PMID ni URL. Un consumidor que ve `sources: PubMed` en 30 fichas espera que pueda rastrear la evidencia; no hay ningún identificador.

### 6.3 Afirmaciones factuales en la prosa sin referencia

Ejemplos del cuerpo de las fichas, sin DOI asociado:

| Archivo:línea | Afirmación | Tipo |
|---|---|---|
| `alicina.md:52` | *"descubierto en 1944 por Chester J. Cavallito y John Hays Bailey"* | Atribución histórica sin fuente |
| `betaina.md` (descripción) | *"descubierta en 1866 por Scheibler en remolacha azucarera"* | Sin fuente |
| `limoneno.md` (descripción) | *"caracterizado en 1884 por Wallach (premio Nobel terpenos)"* | Sin fuente |
| `cuminaldehido.md:9` | *"destila en aceites esenciales 25-35%"* | Cifra sin fuente |
| `vanilina.md:14` | `Low` para "Anxiety / Appetite" con mecanismo "Olfactory GABA potentiation" | Sin estudio que lo sostenga (el DOI apunta a tDCS) |

Estas no son "anomalías de datos" strictly, pero cualquier afirmación cuantitativa o de atribución en una base de datos que se presenta como revisada por pares debería bringing DOI.

---

## 7. DATO DUPLICADO (errores)

| # | Hallazgo | Ubicación |
|---|---|---|
| D1 | 6 DOI aparecen en 2 colecciones a la vez (`mixtures`+`dishes` 6, `dishes`+`ingredients` 3, `substances`+`dishes` 4, `mixtures`+`substances` 1, `substances`+`ingredients` 1, `vitamins`+`dishes` 1). Riesgo de divergencia: si una se corrige, la otra queda stale. | `grep -roE '10\.[0-9]{4,9}/[^\s]+' site/src/content \| sort -u` |
| D2 | `mixtures/mx-tonico-de-cacao-y-epazote.md` repite `10.1021/acs.jafc.0c03120` en las líneas 23 y 24 | líneas 23-24 |
| D3 | `mote de queso` duplicado en 2 rutas | `colombian/caribe/mote_de_queso/mote_de_queso.md`, `colombian/otras_preparaciones/mote_de_queso.md` |
| D4 | `tamal tolimense` duplicado en 2 rutas | `colombian/andina/tamal_tolimense/tamal_tolimense.md`, `colombian/otras_preparaciones/tamal_tolimense.md` |
| D5 | `Arroz Blanco` y `Crema de Leche` duplicados nombre↔slug entre `pending_review` y su grupo real | §5.5 |
| D6 | `10.1002/S0271-5317` en comentario de `cuminaldehido.md:19` **y** el mismo DOI truncado como `10.1002/...sobre` en `limoneno.md:32`: dos referencias al mismo DOI inexistente en dos fichas distintas | ver §1.4 |

---

## 8. Prioridades de corrección

### P0 — antes de cualquier publicación de la evidencia

1. **Los 23 `NO_CORRESPONDE`** (§1.3). Para cada uno: buscar el DOI real del artículo que la ficha describe, o borrar la cita y bajar `evidence_level`. **No inventar sustitutos**: si no hay equivalente identificable, marcar `doi_status: unverified` y quitar el DOI del campo.
2. **El `unverified` de `limoneno.md`** se sigue renderizando como enlace (§2.1). Añadir el filtro `doi_status` a `substances/[...slug].astro:110` (el patrón ya existe en `api/evidence.json.ts:66-71`).
3. **La `desc` de `/api/evidence.json`** ("Cada doi resuelve en Crossref") debe decir "cada DOI resuelve; la correspondencia con el título se audita en `docs/audit/ANOMALIAS-DATOS.md`". El comentario de `evidence.json.ts:15` confunde resolver con corresponder.
4. **Los 4 DOI rotos fuera de `substances`** (§1.5) — `mixtures/tomate-aceite-oliva.md:20`, `ingredients/legumes/frijol.md:21`, `mixtures/mx-tonico-de-cacao-y-epazote.md:23-24`, `mixtures/cebolla-ajo.md:21`.
5. **Los 9 `evidence_level` no defendibles** (§3.1), empezando por `piperina.md:17` y `:23` (High sobre una condición que el estudio no mide) y los 4 cuyo DOI no corresponde (`capsaicina.md:16`, `curcumina.md:17`, `eugenol.md:17`, `mentol.md:23`).

### P1 — datos publicados como reales

6. **84 `[Pendiente]`** en 22 recetas (§4.1). Los 6 archivos `recetas_<región>.md` deberían pasar a `tips/` o eliminarse del sitemap, no publicarse como `Recipe`.
7. **Los 515 stubs en `catalog.json` y `variants.json`** (§5.2): filtrar `pending_review/` igual que se filtra el sitemap, o marcar `"status":"pending_review"` en cada entrada para que un agente pueda excluirla.
8. **`3 scientific_name: "N/A"`** como dato taxonómico (§5.3).
9. **La conversión de tiempo a ISO-8601** (`[...slug].astro:143-144`): `"2 horas"` → `PT2H`, no `PT2M`. Hoy `PT230M` se publica como `prepTime` de un asado de 2h30m.

### P2 — deuda estructural

10. `evidence_level` como `z.string()` con 5 escalas conviviendo (§3.4) → `z.enum(['High','Medium','Low'])`.
11. `contraindications` en las 30 substancias (§6.1): 0/30, con 45/45 en las mezclas. Es el hueco de salud más grave del corpus.
12. `sources: ["PubMed","NIH"]` como única "fuente" en las 30 fichas: o se sustituye por PMID/URL, o se elimina el campo (§6.2).
13. Los 22 `README.md` publicados como recetas (§4.3) y los 2 pares de títulos duplicados (§4.7).

---

## 9. Lo que SÍ está bien (para no romperlo)

| Comprobación | Resultado |
|---|---|
| Control positivo de Crossref antes del lote | 200 ✅ (evita el falso "17 DOI rotos" por 403) |
| `cuminaldehido.md:19-23` documenta en YAML por qué se bajó a `Low` y por qué se sustituyó el DOI muerto | Modelo a imitar en las otras fichas |
| `limoneno.md:19-34` documenta explícitamente "SIN EQUIVALENTE IDENTIFICABLE" y mantiene `unverified` | Correcto; solo falta que el HTML lo respete |
| `/api/evidence.json` excluye entradas sin estudios verificados (`push()` en línea 94) | Correcto: `limoneno` no aparece en `items` |
| `hasNutrition()` filtra nutrición toda-en-cero | Correcto: los 6 todo-en-cero no se renderizan |
| `pending_review` fuera del sitemap y con `noindex` | Correcto en los tres mecanismos (§5.1) |
| Sin slugs duplicados en 495 recetas y 552 ingredientes | 0 colisiones |
| Ningún DOI duplicado dentro de `health_registry` | 44 estudios, 44 DOIs únicos |
| `cuminaldehido.md:40-42`: un ECA de población distinta NO sube a Medium aunque sea triple ciego | Razonamiento correcto, conservarlo |

---

## 10. Reproducir esta auditoría

```bash
cd <raiz-del-repo>

# 1. Control positivo (OBLIGATORIO antes de reportar "N rotos")
curl -s -o /dev/null -w "%{http_code}\n" -H "User-Agent: GOS-audit/1.0" \
  "https://api.crossref.org/works/10.1038/nature12373"      # → 200

# 2. Resolver cada DOI de substances
for d in $(grep -rhoE '10\.[0-9]{4,9}/[^ "'"'"')]+' site/src/content/substances/*.md | sort -u); do
  printf "%-42s %s\n" "$d" \
    "$(curl -s -H 'User-Agent: GOS-audit/1.0' \
       "https://api.crossref.org/works/$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$d")" \
     | python3 -c 'import sys,json;d=json.load(sys.stdin);m=d.get("message",{});print((m.get("title") or ["404"])[0][:70])' 2>/dev/null || echo 404)"
done

# 3. Confirmar los 404 también en el resolutor
curl -s -L -o /dev/null -w "%{http_code}\n" "https://doi.org/10.1000/altmed.12.1.0"   # → 404

# 4. Placeholders publicados
grep -rn '\[Pendiente\]' site/src/content/dishes/ | wc -l                            # → 84

# 5. Filtrado de pending_review
grep -c pending_review site/dist/sitemap.xml                                          # → 0
grep -c pending_review site/dist/api/agent/catalog.json                               # → 1030

# 6. Rebuild para reproducir el estado de dist/
cd site && pnpm exec astro build
```

**Nota operativa:** durante esta auditoría otro proceso estaba reconstruyendo `site/dist/` en paralelo. Todos los resultados sobre `dist/` (`sitemap.xml` con 590 URLs, `api/evidence.json`, `api/agent/catalog.json`, `ingredients/pending_review/*/index.html`) se tomaron **después** de que el build terminara (timestamp 20:01, sin proceso `astro` activo). `dist/` está en `.gitignore` (`site/.gitignore:2`): nada de esto se ha commiteado.

---

## 11. Fuentes

Todas las consultas son anónimas (sin API key) y reproducibles.

| Tipo | Endpoint | Uso |
|---|---|---|
| Crossref Works | `https://api.crossref.org/works/{doi}` | Resolver los 148 DOI del repo; contrastar título, `container-title`, `issued.date-parts` |
| Crossref Search | `https://api.crossref.org/works?query.bibliographic={titulo}&rows=3` | Buscar equivalente cuando el DOI no corresponde (18 consultas) |
| doi.org resolver | `https://doi.org/{doi}` con `-L` | Confirmar 404 de los no resolvibles |
| PubMed esearch | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&term="{doi}"[doi]` | Mapear DOI → PMID (16/16 salvo `10.1136/bmj.39287.690475.ad`, no indexado con ese DOI en PubMed) |
| PubMed efetch | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id={pmids}` | Leer `AbstractText` y `PublicationTypeList` para juzgar `evidence_level` |

Abstracts usados para los juicios de nivel de evidencia (PMID): 18554422, 23590705, 28916569, 23241646, 22634197, 26602570, 37493973, 41331337, 14727769, 38965524, 10793599, 9619120, 27981349, 26970133, 23644932.