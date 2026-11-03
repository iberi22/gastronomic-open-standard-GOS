# Brazil wave 1 — live source URLs

Date: 2026-11-02.

Each row now has one card. The Markdown is `dishes/brazilian/<stem>.md` and the same bytes are in `site/src/content/dishes/brazilian/`. The 25 older stems stay untouched. The new cards paraphrase the Portuguese article in Portuguese. They do not carry cook times, nutrition, photos, or `url: pending`. P5 stays blocked: four wave-1 languages and the mixtures are still unwritten.

The sources are Portuguese-language articles on `pt.wikipedia.org`. Automatic translation is not a source. Each row is one dish article. None is a category page, a disambiguation page, or a site homepage.

## Corpus checked before selection

Published Brazilian stems, the same 25 files under `site/src/content/dishes/brazilian/` and `dishes/brazilian/`:

`acai_na_tigela`, `acaraje`, `baiao_de_dois`, `bobo_de_camarao`, `bolo_de_rolo`, `brigadeiro`, `caipirinha`, `caruru`, `churrasco`, `coxinha`, `creme_de_cupuacu`, `escondidinho_de_carne_de_sol`, `farofa_de_mandioca`, `feijoada`, `feijoada_a_baiana`, `galinhada`, `moqueca_capixaba`, `moqueca_de_peixe`, `pao_de_queijo`, `pastel_de_feira`, `pato_no_tucupi`, `pudim_de_leite`, `tacaca`, `tutu_de_feijao`, `vatapa`.

## How each URL was fetched

On 2026-11-02 each candidate was requested with HTTP GET. Redirects were followed.

`User-Agent: GOSResearch/1.0 (gastronomic-open-standard local research; article check)`

The final status was 200 for every row below. The final URL is the article URL. The page title class was not `mw-page-title-disambig`. A lead was read from the MediaWiki API or the REST summary for every row.

## URLs

| Stem | Plato | URL final | HTTP | Por qué no está ya en el corpus |
| --- | --- | --- | --- | --- |
| manicoba | Maniçoba | https://pt.wikipedia.org/wiki/Mani%C3%A7oba | 200 | No hay tallo maniçoba. El plato de Pará publicado es pato no tucupi, otro guiso. |
| barreado | Barreado | https://pt.wikipedia.org/wiki/Barreado | 200 | No hay tallo barreado. Es la carne cocida del litoral de Paraná. |
| feijao_tropeiro | Feijão-tropeiro | https://pt.wikipedia.org/wiki/Feij%C3%A3o-tropeiro | 200 | La feijoada y el tutu publicados no son el feijão-tropeiro. |
| arroz_carreteiro | Arroz carreteiro | https://pt.wikipedia.org/wiki/Arroz_carreteiro | 200 | No hay tallo arroz carreteiro. El arroz de la feijoada no es este plato de Rio Grande do Sul. |
| sarapatel | Sarapatel | https://pt.wikipedia.org/wiki/Sarapatel | 200 | No hay tallo sarapatel. |
| buchada_de_bode | Buchada de bode | https://pt.wikipedia.org/wiki/Buchada_de_bode | 200 | No hay tallo buchada. El churrasco publicado no es este plato de vísceras. |
| vaca_atolada | Vaca atolada | https://pt.wikipedia.org/wiki/Vaca_atolada | 200 | No hay tallo vaca atolada. |
| abara | Abará | https://pt.wikipedia.org/wiki/Abar%C3%A1 | 200 | El acarajé publicado es el bollo frito. El abará es la misma masa cocida al vapor. |
| bauru | Bauru (sanduíche) | https://pt.wikipedia.org/wiki/Bauru_(sandu%C3%ADche) | 200 | No hay tallo bauru. El artículo es el sándwich de São Paulo, no la ciudad. |
| cuscuz_paulista | Cuscuz paulista | https://pt.wikipedia.org/wiki/Cuscuz_paulista | 200 | No hay tallo cuscuz. |
| casquinha_de_siri | Casquinha de siri | https://pt.wikipedia.org/wiki/Casquinha_de_siri | 200 | No hay tallo casquinha. Las moquecas publicadas son otros platos de pescado. |
| camarao_na_moranga | Camarão na moranga | https://pt.wikipedia.org/wiki/Camar%C3%A3o_na_moranga | 200 | El bobó de camarão publicado no es el camarón servido en moranga. |
| pamonha | Pamonha | https://pt.wikipedia.org/wiki/Pamonha | 200 | No hay tallo pamonha. |
| virado | Virado | https://pt.wikipedia.org/wiki/Virado | 200 | El artículo se llama Virado y también virado à paulista. El tutu publicado es otro plato de frijol. |
| quindim | Quindim | https://pt.wikipedia.org/wiki/Quindim | 200 | No hay tallo quindim. La página es el dulce de yema, azúcar y coco. Una nota apunta al personaje de Monteiro Lobato; no es la ficha. |
| beijinho | Beijinho (doce) | https://pt.wikipedia.org/wiki/Beijinho_(doce) | 200 | No hay tallo beijinho. El brigadeiro publicado es otro dulce de fiesta. La URL sin calificador es una desambiguación y no se usa. |
| pe_de_moleque | Pé de moleque | https://pt.wikipedia.org/wiki/P%C3%A9_de_moleque | 200 | No hay tallo pé de moleque. |
| curau | Curau | https://pt.wikipedia.org/wiki/Curau | 200 | No hay tallo curau. Canjica es una página de desambiguación y no entra en esta lista. |
| arrumadinho | Arrumadinho | https://pt.wikipedia.org/wiki/Arrumadinho | 200 | No hay tallo arrumadinho. |
| mocoto | Mocotó | https://pt.wikipedia.org/wiki/Mocot%C3%B3 | 200 | No hay tallo mocotó. El artículo es el guiso de pata de res. |
| pacoca | Paçoca | https://pt.wikipedia.org/wiki/Pa%C3%A7oca | 200 | No hay tallo paçoca. Este artículo es la paçoca de carne seca y harina de yuca, no el dulce de maní. |
| pirao | Pirão | https://pt.wikipedia.org/wiki/Pir%C3%A3o | 200 | No hay tallo pirão. El vatapá publicado es otra pasta. |

22 rows, each with final HTTP status 200.

## Rejected on 2026-11-02

These titles were opened and left off the list.

| Title tried | Result |
| --- | --- |
| Canjica | Disambiguation: grain, canjiquinha, curau, munguzá. The corn cream on this list is Curau. |
| Beijinho | Disambiguation. The sweet is Beijinho (doce). |
| Dobradinha | Sports term, not a tripe stew. |
| Cabidela | The article is the dish of Minho, in northern Portugal. |
| Xinxim, Xinxim de galinha | No article at those titles. |
| Virado à paulista, Virado (comida) | No article at those titles. The dish article is Virado, and it is on the list. |
| Frango com quiabo | No article at that title. |
| Leitão à pururuca | No article at that title. |
| Angu (comida), Mocotó (prato) | No article at those titles. Mocotó itself is the dish and is on the list. |
| Quibe, Esfirra, Cocada, Beiju, Frango à passarinho | Live dish articles. They were not needed once 22 Brazil dishes above were confirmed. Quibe and esfirra are Middle Eastern foods also eaten in Brazil. Cocada, beiju, and frango à passarinho are not only Brazilian. |
