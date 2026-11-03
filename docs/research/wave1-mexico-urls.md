# Mexico wave 1 — live source URLs

Date: 2026-11-02.

Each row now has one card. The Markdown is `dishes/mexican/<stem>.md` and the same bytes are in `site/src/content/dishes/mexican/`. The stems are `manchamanteles`, `mole_de_caderas`, `mole_blanco`, `mole_de_olla`, `mole_prieto`, `encacahuatado`, `relleno_negro`, `atapakua`, `memela`, `enchilada_potosina`, `salbut`, `papadzul`, `pan_de_cazon`, `corunda`, `guajolota`, `cafe_de_olla`, `champurrado`, `pozol`, `tejate`, `tascalate`, `tepache`, and `mixiote`. Those cards paraphrase the article. They do not carry cook times, nutrition, photos, or `url: pending`. P5 stays blocked: wave 1 is seven languages, and this list added no mixtures.

The sources are Spanish-language articles on `es.wikipedia.org`. Automatic translation is not a source. Each row is one dish article. None is a category page, a disambiguation page, or a site homepage.

## Corpus checked before selection

Published Mexican stems, same 35 files under `site/src/content/dishes/mexican/` and `dishes/mexican/`. There is no `dishes/mexico/` directory.

`agua_de_horchata_de_arroz`, `aguachile_verde`, `albondigas_en_chipotle`, `barbacoa_de_borrego`, `birria_de_res`, `carnitas_de_michoacan`, `chilaquiles_verdes`, `chiles_en_nogada`, `chiles_rellenos_de_queso`, `chilpachole_de_jaiba`, `cochinita_pibil`, `enchiladas_verdes`, `enmoladas_de_pollo`, `esquites_con_epazote`, `guacamole_tradicional`, `huarache_de_cecina`, `mole_amarillo`, `mole_negro_oaxaqueno`, `mole_poblano`, `mole_verde_oaxaqueno`, `pambazo_de_papa_con_chorizo`, `panuchos_yucatecos`, `pescado_a_la_veracruzana`, `pipian_verde`, `poc_chuc`, `pozole_rojo`, `quesadillas_de_flor_de_calabaza`, `sopa_de_lima`, `sopas_de_tortilla`, `sopes_tradicionales`, `tacos_al_pastor`, `tacos_de_canasta`, `tamales_oaxaquenos`, `tlacoyos_de_alverjon`, `tlayuda_oaxaquena`.

## How each URL was fetched

On 2026-11-02 each candidate was requested once with HTTP GET. Redirects were followed. Nothing was retried. A 1.3 second pause separated requests.

```bash
curl -sS -L --max-redirs 8 --retry 0 \
  -A "GOSResearch/1.0 (gastronomic-open-standard local research; article check)" \
  -o /tmp/gos-mx-html/NN.html \
  -D /tmp/gos-mx-html/NN.meta \
  -w "%{http_code}\t%{url_effective}\t%{num_redirects}" \
  "URL"
```

`%{http_code}` is the status of the final response. For every row below that code was `200`, `%{num_redirects}` was `0`, and the saved response headers begin with `HTTP/2 200`. The final URL is the article URL in the table. The body was accepted only when it contained the dish `h1`, a `mw-content-text` article, and a lead that describes that dish. The `<body>` tag did not carry `mw-disambig`. The body was not a soft-404 and not a login wall.

## URLs

| Plato | URL final | HTTP | Por qué no está ya en el corpus mexicano |
| --- | --- | --- | --- |
| Manchamanteles | https://es.wikipedia.org/wiki/Manchamanteles | 200 | Los moles publicados son amarillo, negro oaxaqueño, poblano y verde oaxaqueño; el manchamanteles, mole de carne con fruta de Puebla y Oaxaca, no tiene tallo. |
| Mole de caderas | https://es.wikipedia.org/wiki/Mole_de_caderas | 200 | El mole de caderas, guiso de chivo de la matanza mixteca, no tiene tallo; la barbacoa publicada es barbacoa de borrego. |
| Mole blanco | https://es.wikipedia.org/wiki/Mole_blanco | 200 | El mole blanco, salsa de ingredientes claros, no está entre el mole poblano, el negro, el verde oaxaqueño ni el amarillo. |
| Mole de olla | https://es.wikipedia.org/wiki/Mole_de_olla | 200 | El mole de olla es un guiso de carne y verduras del centro de México y no coincide con los moles de mesa ni con el pozole rojo publicados. |
| Mole prieto | https://es.wikipedia.org/wiki/Mole_prieto | 200 | El mole prieto es el tlilmolli ritual de Tlaxcala; el mole negro publicado es el oaxaqueño. |
| Encacahuatado | https://es.wikipedia.org/wiki/Encacahuatado | 200 | El encacahuatado es salsa de cacahuate; el pipián publicado es el pipián verde. |
| Relleno negro | https://es.wikipedia.org/wiki/Relleno_negro | 200 | El relleno negro es pavo y cerdo en chilmole yucateco; los platos yucatecos publicados son cochinita pibil, poc chuc, panuchos y sopa de lima. |
| Atápakua | https://es.wikipedia.org/wiki/At%C3%A1pakua | 200 | El atápakua es el guiso p'urhépecha; el plato michoacano publicado es carnitas de Michoacán. |
| Memela | https://es.wikipedia.org/wiki/Memela | 200 | La memela, tortilla ovalada con frijol, no está entre los sopes, tlacoyos, huaraches ni la tlayuda publicados. |
| Enchilada potosina | https://es.wikipedia.org/wiki/Enchilada_potosina | 200 | La enchilada potosina lleva el chile en la masa; la enchilada publicada es enchiladas verdes. |
| Salbut | https://es.wikipedia.org/wiki/Salbut | 200 | El salbut es la tortilla frita e inflada de la península; el antojito yucateco publicado es panuchos yucatecos. |
| Papadzul | https://es.wikipedia.org/wiki/Papadzul | 200 | Los papadzules son tortillas con huevo y salsa de pepita de Yucatán; no hay tallo papadzul junto al pipián verde. |
| Pan de cazón | https://es.wikipedia.org/wiki/Pan_de_caz%C3%B3n | 200 | El pan de cazón, tortillas apiladas con frijol y cazón de Champotón, no tiene tallo en `dishes/mexican/`. |
| Corunda | https://es.wikipedia.org/wiki/Corunda | 200 | La corunda es el tamal p'urhépecha en hoja de la caña; el tamal publicado es tamales oaxaqueños. |
| Guajolota | https://es.wikipedia.org/wiki/Guajolota | 200 | La guajolota es un tamal dentro de un bolillo de la Ciudad de México; el tamal publicado se queda en tamales oaxaqueños. |
| Café de olla | https://es.wikipedia.org/wiki/Caf%C3%A9_de_olla | 200 | El café de olla es café con piloncillo y canela; la bebida mexicana publicada es agua de horchata de arroz. |
| Champurrado | https://es.wikipedia.org/wiki/Champurrado | 200 | El champurrado es atole de masa y chocolate; la bebida publicada es agua de horchata de arroz. |
| Pozol | https://es.wikipedia.org/wiki/Pozol | 200 | El pozol es la bebida de masa de maíz, a veces fermentada, del sureste; el homónimo publicado es pozole rojo de Jalisco. |
| Tejate | https://es.wikipedia.org/wiki/Tejate | 200 | El tejate es la bebida prehispánica de maíz y cacao de Oaxaca y no aparece entre las 35 fichas. |
| Tascalate | https://es.wikipedia.org/wiki/Tascalate | 200 | El tascalate es la bebida de maíz, cacao y achiote de Chiapas y no tiene tallo publicado. |
| Tepache | https://es.wikipedia.org/wiki/Tepache_(bebida_alcoh%C3%B3lica) | 200 | El tepache es la bebida fermentada mexicana de esa ficha; no hay tallo de tepache junto a la horchata. |
| Mixiote | https://es.wikipedia.org/wiki/Mixiote | 200 | El mixiote es carne enchilada cocida al vapor en la cutícula del maguey; la barbacoa publicada es barbacoa de borrego. |

22 rows, each with final HTTP status 200.

Huaxmole also returned `HTTP/2 200` at <https://es.wikipedia.org/wiki/Huaxmole> and was left out of the table: that article treats the Mixteca version as mole de caderas, which already has a row. Agua de Jamaica returned `HTTP/2 200` at <https://es.wikipedia.org/wiki/Agua_de_Jamaica> and was left out because the article is a general hibiscus infusion, not a Mexican dish article. Menudo returned `HTTP/2 200` at <https://es.wikipedia.org/wiki/Menudo_(comida)> and was left out because the article presents the dish as Spanish gastronomy shared across countries.
