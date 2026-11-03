# India wave 1 — live source URLs

Date: 2026-11-03.

No dish cards are in this change. The 35 older stems under `dishes/indian/` stay untouched. P5 stays blocked. The roadmap percent stays 55.2% until a card from this list is published.

Fourteen rows use a Hindi Wikipedia article. Eight rows have no Hindi langlink, so the checked article is the English one. None is a category page, a disambiguation page, or a site homepage.

## Corpus checked before selection

Published Indian stems, the same 35 files under `site/src/content/dishes/indian/` and `dishes/indian/`:

`aloo_gobi`, `baingan_bharta`, `biryani_hyderabadi`, `bisi_bele_bath`, `butter_chicken`, `chana_masala`, `chicken_korma`, `chicken_tikka_masala`, `dal_makhani`, `dhokla_gujarati`, `dosa_masala`, `fish_amritsari`, `gulab_jamun`, `hyderabadi_haleem`, `idli_sambar`, `kathi_roll_kolkata`, `kheer_de_arroz`, `litti_chokha`, `malai_kofta`, `misal_pav`, `naan_de_ajo`, `palak_paneer`, `paneer_butter_masala`, `pani_puri`, `pav_bhaji`, `poha_indori`, `rajma_chawal`, `rasam_de_tomate`, `rasgulla`, `rogan_josh`, `samosa_de_patata`, `tandoori_chicken`, `thalipeeth`, `vada_pav`, `vindaloo_de_cerdo`.

## How each URL was fetched

On 2026-11-03 each candidate was resolved with the MediaWiki API (`action=query`, redirects on, `prop=info|pageprops|langlinks|extracts`) and then requested with HTTP GET. Redirects were followed.

`User-Agent: GOSResearch/1.0 (gastronomic-open-standard local research; article check)`

The final status was 200 for every row below. `pageprops` did not mark the chosen page as a disambiguation. A lead was read from the API extract.

## URLs

| Stem | Plato | URL final | HTTP | Por qué no está ya en el corpus |
| --- | --- | --- | --- | --- |
| upma | Upma | https://hi.wikipedia.org/wiki/%E0%A4%89%E0%A4%AA%E0%A4%AE%E0%A4%BE | 200 | No hay tallo upma. El poha publicado es arroz aplastado, no sémola tostada. |
| appam | Appam | https://hi.wikipedia.org/wiki/%E0%A4%85%E0%A4%AA%E0%A5%8D%E0%A4%AA%E0%A4%AE | 200 | El dosa publicado es otro crepe. El appam es el de arroz fermentado y coco, con borde crujiente. |
| jalebi | Jalebi | https://hi.wikipedia.org/wiki/%E0%A4%9C%E0%A4%B2%E0%A5%87%E0%A4%AC%E0%A5%80 | 200 | El gulab jamun y el rasgulla publicados son otros dulces. |
| mysore_pak | Mysore pak | https://hi.wikipedia.org/wiki/%E0%A4%AE%E0%A5%88%E0%A4%B8%E0%A5%82%E0%A4%B0_%E0%A4%AA%E0%A4%BE%E0%A4%95 | 200 | No hay tallo mysore pak. Es el dulce de besan y ghee de Karnataka. |
| pongal | Pongal (पकवान) | https://hi.wikipedia.org/wiki/%E0%A4%AA%E0%A5%8B%E0%A4%82%E0%A4%97%E0%A4%B2_(%E0%A4%AA%E0%A4%95%E0%A4%B5%E0%A4%BE%E0%A4%A8) | 200 | No hay tallo pongal. El bisi bele bath publicado es otro arroz. La página del festival no se usa. |
| bhel_puri | Bhel puri | https://hi.wikipedia.org/wiki/%E0%A4%AD%E0%A5%87%E0%A4%B2%E0%A4%AA%E0%A5%82%E0%A4%B0%E0%A5%80 | 200 | El pani puri publicado es otra chaat. |
| kulfi | Kulfi | https://hi.wikipedia.org/wiki/%E0%A4%95%E0%A4%BC%E0%A5%81%E0%A4%B2%E0%A5%8D%E0%A4%AB%E0%A4%BC%E0%A5%80 | 200 | El kheer publicado es un arroz con leche, no este helado denso. |
| idiyappam | Idiyappam | https://hi.wikipedia.org/wiki/%E0%A4%87%E0%A4%A1%E0%A4%BF%E0%A4%AF%E0%A4%AA%E0%A5%8D%E0%A4%AA%E0%A4%AE | 200 | El idli publicado es el pastel al vapor. El idiyappam es la red de arroz. |
| puran_poli | Puran poli | https://hi.wikipedia.org/wiki/%E0%A4%AA%E0%A5%81%E0%A4%B0%E0%A4%A8_%E0%A4%AA%E0%A5%8B%E0%A4%B2%E0%A5%80 | 200 | No hay tallo puran poli. |
| kachori | Kachori | https://hi.wikipedia.org/wiki/%E0%A4%95%E0%A4%9A%E0%A5%8C%E0%A4%A1%E0%A4%BC%E0%A5%80 | 200 | La samosa publicada es otra fritura rellena. |
| pakora | Pakora | https://hi.wikipedia.org/wiki/%E0%A4%AA%E0%A4%95%E0%A5%8B%E0%A4%A1%E0%A4%BC%E0%A4%BE | 200 | No hay tallo pakora. |
| double_ka_meetha | Double ka meetha | https://hi.wikipedia.org/wiki/%E0%A4%A1%E0%A4%AC%E0%A4%B2_%E0%A4%95%E0%A4%BE_%E0%A4%AE%E0%A5%80%E0%A4%A0%E0%A4%BE | 200 | El haleem publicado es el guiso de Hyderabad, no este pudín de pan. |
| olan | Olan | https://hi.wikipedia.org/wiki/%E0%A4%93%E0%A4%B2%E0%A4%A8 | 200 | No hay tallo olan. Es el guiso de calabaza de ceniza y frijol de careta de Kerala. |
| erissery | Erissery | https://hi.wikipedia.org/wiki/%E0%A4%8F%E0%A4%B0%E0%A4%BF%E0%A4%B6%E0%A5%8D%E0%A4%B6%E0%A5%87%E0%A4%B0%E0%A5%80 | 200 | No hay tallo erissery. Es el guiso de Kerala con coco. |
| chole_bhature | Chole bhature | https://en.wikipedia.org/wiki/Chole_bhature | 200 | El chana masala publicado no incluye el bhatura. No hay artículo equivalente en hindi. |
| medu_vada | Medu vada | https://en.wikipedia.org/wiki/Medu_vada | 200 | El vada pav publicado es el bocadillo de Mumbai, no esta rosquilla de lenteja negra. No hay artículo equivalente en hindi. |
| laal_maas | Laal maas | https://en.wikipedia.org/wiki/Laal_maas | 200 | El rogan josh publicado es el curry de Cachemira. Este es el de Rajasthan. No hay artículo equivalente en hindi. |
| gajar_ka_halwa | Gajar ka halwa | https://en.wikipedia.org/wiki/Gajar_ka_halwa | 200 | No hay tallo halwa. No hay artículo equivalente en hindi. |
| chicken_65 | Chicken 65 | https://en.wikipedia.org/wiki/Chicken_65 | 200 | El tandoori publicado es otro pollo. Este es el frito de Chennai. No hay artículo equivalente en hindi. |
| modak | Modak | https://en.wikipedia.org/wiki/Modak | 200 | No hay tallo modak. No hay artículo equivalente en hindi. |
| khaman | Khaman | https://en.wikipedia.org/wiki/Khaman | 200 | El dhokla publicado es otra preparación al vapor de Gujarat. El khaman se hace con harina de garbanzo. No hay artículo equivalente en hindi. |
| malabar_matthi_curry | Malabar matthi curry | https://en.wikipedia.org/wiki/Malabar_matthi_curry | 200 | El fish amritsari publicado es el pescado frito del Punjab, no este curry de Kerala. No hay artículo equivalente en hindi. |

22 rows, each with final HTTP status 200.

## Rejected on 2026-11-03

These titles were opened and left off the list.

| Title tried | Result |
| --- | --- |
| Khandvi | The English article is a village in Buldhana district, Maharashtra, not the Gujarati snack. |
| Thoran | The Hindi article describes a class of dry coconut vegetable dishes, not one dish. |
| Chettinad chicken, Chicken chettinad, Fish moilee, Meen moilee, Kadhi (dish), Goan fish curry, Prawn balchao, Chicken cafreal, Dal baati churma, Kadala curry, Malabar parotta, Karimeen pollichathu, Sabudana khichdi, Bhindi masala, Gatte ki sabzi, Ker sangri, Hyderabadi lukhmi | No article at those titles. |
