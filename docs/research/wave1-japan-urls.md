# Japan wave 1 — live source URLs

Date: 2026-11-03.

No dish cards are in this change. The 35 older stems under `dishes/japanese/` stay untouched. P5 stays blocked. The roadmap percent stays 55.2% until a card from this list is published. The 22 India cards are still open pull requests and are not counted here.

These 15 rows are English Wikipedia articles. A Japanese langlink was present for chazuke and taiyaki. Both are still cited from the English page that was opened and read. None is a category page, a disambiguation page, or a site homepage.

## Corpus checked before selection

Published Japanese stems, the same 35 files under `site/src/content/dishes/japanese/` and `dishes/japanese/`:

`agedashi_tofu`, `asari_no_sakamushi`, `buri_daikon`, `chanchan_yaki`, `chashu_pork_slice`, `chawanmushi`, `chicken_katsu_curry`, `chikuzenni`, `dorayaki`, `gyudon_beef_bowl`, `hida_houba_miso`, `ichigo_daifuku`, `imoni_yamagata`, `ishikari_nabe`, `karaage_chicken`, `kenchin_jiru`, `kiriotanpo_nabe`, `matcha_miso_dengaku`, `miso_soup_classic`, `nikujaga_home`, `okonomiyaki_osaka`, `ramen_shoyu`, `saba_no_miso_ni`, `soba_zaru`, `sukiyaki_beef`, `sushi_nigiri_salmon`, `takoyaki_osaka`, `tamagoyaki_omelet`, `tempura_moriawase`, `tonkatsu_pork`, `udon_kitsune`, `unadon_unagi`, `unagi_no_kabayaki`, `yakitori_tare`, `yudofu_kyoto`.

## How each URL was fetched

On 2026-11-03 each candidate was resolved with the MediaWiki API (`action=query`, redirects on, `prop=info|pageprops|langlinks|extracts`) and then requested with HTTP GET. Redirects were followed.

`User-Agent: GOSResearch/1.0 (gastronomic-open-standard local research; article check)`

The final status was 200 for every row below. The final URL matched the API fullurl. `pageprops` did not mark the chosen page as a disambiguation. A lead was read from the API extract.

## URLs

| Stem | Plato | Categoría fijada | URL final | HTTP | Por qué no está ya en el corpus |
| --- | --- | --- | --- | --- | --- |
| onigiri | Onigiri | Antojito | https://en.wikipedia.org/wiki/Onigiri | 200 | No hay tallo onigiri. El nigiri publicado es sushi de salmón, no la bola de arroz. |
| katsudon | Katsudon | Plato fuerte | https://en.wikipedia.org/wiki/Katsudon | 200 | El tonkatsu publicado es la chuleta sola. Este es el bol de arroz. |
| oden | Oden | Guiso | https://en.wikipedia.org/wiki/Oden | 200 | No hay tallo oden. El nikujaga y el chikuzenni publicados son otros guisos. |
| omurice | Omurice | Plato fuerte | https://en.wikipedia.org/wiki/Omurice | 200 | No hay tallo omurice. No es el tamagoyaki ni el katsudon. |
| natto | Natto | Antojito | https://en.wikipedia.org/wiki/Natto | 200 | No hay tallo natto. La sopa de miso publicada es otro fermento de soja. |
| ochazuke | Chazuke | Plato fuerte | https://en.wikipedia.org/wiki/Chazuke | 200 | No hay tallo ochazuke. No es la sopa de miso ni el onigiri. |
| korokke | Korokke | Antojito | https://en.wikipedia.org/wiki/Korokke | 200 | No hay tallo korokke. No es el menchi ni el tonkatsu, que no están como croqueta de papa. |
| taiyaki | Taiyaki | Postre | https://en.wikipedia.org/wiki/Taiyaki | 200 | El dorayaki publicado es otro dulce. Este es el pastel con forma de pez. |
| anpan | Anpan | Postre | https://en.wikipedia.org/wiki/Anpan | 200 | No hay tallo anpan. El ichigo daifuku publicado es otro dulce de pasta de judía. |
| hiyashi_chuka | Hiyashi chuka | Plato fuerte | https://en.wikipedia.org/wiki/Hiyashi_ch%C5%ABka | 200 | El ramen shoyu publicado es un ramen caliente. Este es el fideo frío de verano. |
| yakisoba | Yakisoba | Plato fuerte | https://en.wikipedia.org/wiki/Yakisoba | 200 | El soba zaru publicado es alforfón frío. El yakisoba usa fideo de trigo. |
| kinpira_gobo | Kinpira | Antojito | https://en.wikipedia.org/wiki/Kinpira | 200 | No hay tallo kinpira. La página es la guarnición de raíz, sobre todo bardana. |
| okinawa_soba | Okinawa soba | Plato fuerte | https://en.wikipedia.org/wiki/Okinawa_soba | 200 | El soba zaru es de alforfón. Este fideo de Okinawa es de trigo. |
| somen | Somen | Plato fuerte | https://en.wikipedia.org/wiki/S%C5%8Dmen | 200 | El udon kitsune publicado es otro fideo. El somen es el hilo de trigo. |
| mitarashi_dango | Mitarashi dango | Postre | https://en.wikipedia.org/wiki/Mitarashi_dango | 200 | No hay tallo dango. No es el dorayaki ni el daifuku de fresa. |

## Rejected

Rejected and not in this list: Gyoza resolves to the general Jiaozi article. Chirashizushi resolves to the general Sushi article, and nigiri salmon is already published. Sanma is a disambiguation. Castella (cake), shogayaki, and tendon (tempura) were missing. Chanpuru is a class of Okinawan stir-fries. Hiyayakko's lead only says chilled tofu and toppings. Kakigori's lead is a single sentence and was left off this minimum set.
