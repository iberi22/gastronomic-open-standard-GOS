# United States wave 1 — live source URLs

Date: 2026-11-02.

These URLs are not dishes yet. This change does not add dish Markdown. P5 stays blocked. The cards, when written, go in `dishes/american/`. The 35 stems already there stay untouched.

The sources are English-language articles on `en.wikipedia.org`. Automatic translation is not a source. Each row is one dish article. None is a category page, a disambiguation page, or a site homepage.

## Corpus checked before selection

Published American stems, the same 35 files under `site/src/content/dishes/american/` and `dishes/american/`:

`apple_pie_traditional`, `bbq_pork_ribs`, `biscuits_and_gravy`, `brisket_texas_style`, `brunswick_stew`, `buffalo_chicken_wings`, `chicken_and_waffles`, `chicken_fried_steak`, `chili_verde_new_mexico`, `clam_chowder_boston`, `clam_chowder_manhattan`, `classic_cheeseburger`, `cobbler_de_melocoton`, `collard_greens_southern`, `cornbread_southern`, `crawfish_boil_louisiana`, `eggs_benedict`, `fried_chicken_southern`, `gumbo_louisiana`, `jambalaya_cajun`, `key_lime_pie`, `lobster_roll_maine`, `macaroni_and_cheese`, `meatloaf_with_glaze`, `pancakes_maple_syrup`, `pecan_pie_traditional`, `philly_cheesesteak`, `po_boy_shrimp`, `pot_roast_american`, `pulled_pork_sandwich`, `reuben_sandwich`, `shrimp_and_grits`, `st_louis_ribs_bbq`, `tennessee_pulled_chicken`, `texas_chili_con_carne`.

## How each URL was fetched

On 2026-11-02 each candidate was requested once with HTTP GET. Redirects were followed.

`User-Agent: GOSResearch/1.0 (gastronomic-open-standard local research; article check)`

The final status was 200 for every row. The final URL is the article URL. The body contained the dish `h1` and was not a disambiguation page. The hushpuppy article has sections History, Name, and Characteristics and preparation; it is the cornmeal fritter, not another subject.

## URLs

| Stem | Plato | URL final | HTTP | Por qué no está ya en el corpus |
| --- | --- | --- | --- | --- |
| cobb_salad | Cobb salad | https://en.wikipedia.org/wiki/Cobb_salad | 200 | No hay tallo de ensalada Cobb entre los 35. |
| waldorf_salad | Waldorf salad | https://en.wikipedia.org/wiki/Waldorf_salad | 200 | No hay tallo Waldorf. |
| succotash | Succotash | https://en.wikipedia.org/wiki/Succotash | 200 | No hay tallo succotash. Los verdes publicados son collard greens. |
| hoppin_john | Hoppin' John | https://en.wikipedia.org/wiki/Hoppin%27_John | 200 | No hay tallo Hoppin' John. El arroz publicado de Luisiana es jambalaya. |
| etouffee | Étouffée | https://en.wikipedia.org/wiki/%C3%89touff%C3%A9e | 200 | El gumbo y el jambalaya publicados no son étouffée. |
| muffuletta | Muffuletta | https://en.wikipedia.org/wiki/Muffuletta | 200 | El sándwich publicado de Nueva Orleans es el po' boy de camarón. |
| beignet | Beignet | https://en.wikipedia.org/wiki/Beignet | 200 | No hay tallo beignet. El postre publicado de Nueva Orleans no existe; el de Florida es key lime pie. |
| bananas_foster | Bananas Foster | https://en.wikipedia.org/wiki/Bananas_Foster | 200 | No hay tallo bananas foster. |
| chicago_hot_dog | Chicago-style hot dog | https://en.wikipedia.org/wiki/Chicago-style_hot_dog | 200 | El sándwich publicado de esa ciudad no existe; el de Filadelfia es el cheesesteak. |
| cincinnati_chili | Cincinnati chili | https://en.wikipedia.org/wiki/Cincinnati_chili | 200 | El chili publicado es texas chili con carne, otro platillo. |
| italian_beef | Italian beef | https://en.wikipedia.org/wiki/Italian_beef | 200 | No hay tallo italian beef. |
| nashville_hot_chicken | Hot chicken | https://en.wikipedia.org/wiki/Hot_chicken | 200 | El pollo frito publicado es fried chicken southern, no el hot chicken de Nashville. |
| cioppino | Cioppino | https://en.wikipedia.org/wiki/Cioppino | 200 | Los caldos publicados son clam chowder de Boston y de Manhattan. |
| oysters_rockefeller | Oysters Rockefeller | https://en.wikipedia.org/wiki/Oysters_Rockefeller | 200 | No hay tallo de ostras Rockefeller. |
| hot_brown | Hot Brown | https://en.wikipedia.org/wiki/Hot_Brown | 200 | No hay tallo Hot Brown. |
| red_beans_and_rice | Red beans and rice | https://en.wikipedia.org/wiki/Red_beans_and_rice | 200 | No hay tallo red beans and rice. |
| hushpuppy | Hushpuppy | https://en.wikipedia.org/wiki/Hushpuppy | 200 | El maíz publicado es cornbread, no el hushpuppy. |
| frito_pie | Frito pie | https://en.wikipedia.org/wiki/Frito_pie | 200 | No hay tallo frito pie. |
| garbage_plate | Garbage Plate | https://en.wikipedia.org/wiki/Garbage_Plate | 200 | No hay tallo Garbage Plate. |
| mission_burrito | Mission burrito | https://en.wikipedia.org/wiki/Mission_burrito | 200 | No hay tallo mission burrito. |
| frybread | Frybread | https://en.wikipedia.org/wiki/Frybread | 200 | No hay tallo frybread. |
| chess_pie | Chess pie | https://en.wikipedia.org/wiki/Chess_pie | 200 | Los pasteles publicados son apple, pecan y key lime, más el cobbler de melocotón. |

22 rows, each with final HTTP status 200.
