# Bangladesh wave 1 — live source URLs

Date: 2026-11-03.

No dish cards are in this change. The 15 older stems under `dishes/bangladeshi/` stay untouched. P5 stays blocked. The roadmap percent stays 55.2% until a card from this list is published. The 22 India cards are still open pull requests and are not counted here.

These 15 rows are English Wikipedia articles. A Bengali langlink was absent on the pages that were kept, except falooda and akhni. Those two were still cited from the English page that was opened and read. None is a category page, a disambiguation page, or a site homepage.

## Corpus checked before selection

Published Bangladeshi stems, the same 15 files under `site/src/content/dishes/bangladeshi/` and `dishes/bangladeshi/`:

`aloo_bhorta`, `begun_bhorta`, `bhapa_pitha`, `borhani`, `chingri_malai_curry`, `chitol_mach_kofta`, `kacchi_biryani`, `mishti_doi`, `morog_polao`, `panta_bhat`, `patishapta_pitha`, `rui_mach_jhol`, `shorshe_ilish`, `shutki_bhorta`, `vuna_khichuri`.

## How each URL was fetched

On 2026-11-03 each candidate was resolved with the MediaWiki API (`action=query`, redirects on, `prop=info|pageprops|langlinks|extracts`) and then requested with HTTP GET. Redirects were followed.

`User-Agent: GOSResearch/1.0 (gastronomic-open-standard local research; article check)`

The final status was 200 for every row below. The final URL matched the API fullurl. `pageprops` did not mark the chosen page as a disambiguation. A lead was read from the API extract.

## URLs

| Stem | Plato | Categoría fijada | URL final | HTTP | Por qué no está ya en el corpus |
| --- | --- | --- | --- | --- | --- |
| bakarkhani | Bakarkhani | Antojito | https://en.wikipedia.org/wiki/Bakarkhani | 200 | No hay tallo bakarkhani. El borhani publicado es una bebida, no este pan especiado. |
| chomchom | Chomchom | Postre | https://en.wikipedia.org/wiki/Chomchom | 200 | No hay tallo chomchom. El mishti doi publicado es yogur, no este dulce de chhena. |
| chotpoti | Chotpoti | Antojito | https://en.wikipedia.org/wiki/Chotpoti | 200 | No hay tallo chotpoti. No es el bhorta de papa ni el de berenjena. |
| jhalmuri | Jhalmuri | Antojito | https://en.wikipedia.org/wiki/Jhalmuri | 200 | No hay tallo jhalmuri. El panta bhat publicado es arroz fermentado, no arroz inflado. |
| sandesh | Sandesh | Postre | https://en.wikipedia.org/wiki/Sandesh_(confectionery) | 200 | No hay tallo sandesh. La página es Sandesh (confectionery), no una persona. |
| kala_bhuna | Kala bhuna | Guiso | https://en.wikipedia.org/wiki/Kala_Bhuna | 200 | No hay tallo kala bhuna. El kacchi publicado es biryani, no este curry oscuro de Chittagong. |
| chitoi_pitha | Chitoi pitha | Antojito | https://en.wikipedia.org/wiki/Chitoi_pitha | 200 | Los pithas publicados son bhapa y patishapta. Este es el de arroz de Daca. |
| falooda | Falooda | Bebida | https://en.wikipedia.org/wiki/Falooda | 200 | No hay tallo falooda. No es el borhani. |
| ghugni | Ghugni | Guiso | https://en.wikipedia.org/wiki/Ghugni | 200 | No hay tallo ghugni. No es el khichuri publicado. |
| handesh | Handesh | Postre | https://en.wikipedia.org/wiki/Handesh | 200 | No hay tallo handesh. Es el pitha frito de Sylhet, no el patishapta. |
| luchi | Luchi | Antojito | https://en.wikipedia.org/wiki/Luchi | 200 | No hay tallo luchi. No es el paratha ni el bakarkhani. |
| mughlai_paratha | Mughlai paratha | Antojito | https://en.wikipedia.org/wiki/Mughlai_paratha | 200 | No hay tallo de este paratha relleno. El morog polao publicado es arroz. |
| shemai | Shemai | Postre | https://en.wikipedia.org/wiki/Shemai | 200 | No hay tallo shemai. No es el payesh genérico ni el mishti doi. |
| akhni | Akhni | Plato fuerte | https://en.wikipedia.org/wiki/Akhni | 200 | El kacchi y el morog polao publicados son otros arroces. Este es el de Chittagong y Sylhet. |
| alur_chop | Aloo chap | Antojito | https://en.wikipedia.org/wiki/Aloo_chap | 200 | No hay tallo alur chop. El aloo bhorta publicado es un puré, no esta croqueta. |

## Rejected

Rejected and not in this list: Phuchka resolves to the general Panipuri article, and pani puri is already an Indian card. Payesh resolves to the general Kheer article. Tehari on the English wiki is the Awadh Tehri, a different rice. Singara resolves to the Roman fort. Mezban is the Chittagong feast, not one dish. Paturi resolves to a person. Doi maach, kalojam, chicken roast, dimer dalna, beef rezala, and semiya had no English article under those titles on 2026-11-03.
