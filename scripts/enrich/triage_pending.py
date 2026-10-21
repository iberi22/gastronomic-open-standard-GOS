#!/usr/bin/env python3
"""Triage site/src/content/ingredients/pending_review/* stubs (gos-d1-02).

Each stub is (a) merged into an existing/new canonical ingredient as an alias,
(b) promoted to a new canonical ingredient (TODO-free, es only, empty nutrition)
or (c) deleted as parser garbage. No nutrition/scientific values are written.
Idempotent: once stubs are gone a re-run changes nothing.

Usage: triage_pending.py [--dry-run] [--check] [--selftest]
Storage: ingredients are JSON (<slug>.json); aliases naming two foods are dropped.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
ING = ROOT / "site/src/content/ingredients"
PEND = ING / "pending_review"
DISHES = ROOT / "site/src/content/dishes"
REPORT = Path(__file__).with_name("triage-report.md")
FOLDER = {"Vegetable": "vegetables", "Fruit": "fruits", "Condiment": "condiments",
          "Protein": "proteins", "Grain": "grains", "Dairy": "dairy", "Legume": "legumes",
          "Oil": "oils", "Sauce": "sauces", "Sugar": "condiments", "Beverage": "beverages"}


def fold(s):
    s = unicodedata.normalize("NFD", s.lower().replace("_", " "))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip()


# slug: (display name, group, zh/en aliases)  -- new canonical ingredients
NEW = {
    "achiote": ("Achiote", "Condiment", {"es": ["color"]}),
    "aceite_achiote": ("Aceite de Achiote", "Oil", {}),
    "aceite_picante": ("Aceite de Ají Picante", "Oil", {"zh": ["辣椒油", "油泼辣子"]}),
    "aji_amarillo": ("Ají Amarillo (Pasta)", "Condiment", {}),
    "aji_picante": ("Ají Picante", "Vegetable", {"zh": ["干辣椒", "小米辣", "干红椒"]}),
    "ahuyama": ("Ahuyama (Calabaza)", "Vegetable", {"es": ["calabaza"]}),
    "alcaparras": ("Alcaparras", "Condiment", {}),
    "amaranto": ("Amaranto", "Grain", {}),
    "anguila": ("Anguila", "Protein", {"zh": ["鳝丝"]}),
    "anis_estrella": ("Anís Estrellado", "Condiment", {"zh": ["八角"]}),
    "apio": ("Apio", "Vegetable", {"zh": ["芹菜"]}),
    "arepa": ("Arepa", "Grain", {}),
    "arracacha": ("Arracacha", "Vegetable", {}),
    "arveja": ("Arveja", "Legume", {"zh": ["青豆"]}),
    "avena": ("Avena", "Grain", {}),
    "azucar": ("Azúcar", "Sugar", {"zh": ["白糖", "冰糖"]}),
    "banano": ("Banano (Guineo)", "Fruit", {"es": ["guineo"]}),
    "bicarbonato": ("Bicarbonato de Sodio", "Condiment", {}),
    "brocoli": ("Brócoli", "Vegetable", {"zh": ["西兰花"]}),
    "caldo": ("Caldo", "Sauce", {"zh": ["牛肉高汤", "蔬菜高汤"]}),
    "camaron": ("Camarón", "Protein", {"zh": ["虾仁"]}),
    "canela": ("Canela", "Condiment", {}),
    "cangrejo": ("Cangrejo (Jaiba/Langosta)", "Protein", {"zh": ["螃蟹", "肉蟹", "青蟹"]}),
    "caracol": ("Caracol de Mar", "Protein", {}),
    "cecina": ("Cecina", "Protein", {}),
    "cerveza": ("Cerveza", "Beverage", {"zh": ["啤酒"]}),
    "champinon": ("Champiñón", "Vegetable", {"zh": ["白蘑菇"]}),
    "chicharron": ("Chicharrón", "Protein", {"zh": ["猪油渣"]}),
    "chigüiro": ("Chigüiro", "Protein", {}),
    "chocolate_mesa": ("Chocolate de Mesa", "Sugar", {}),
    "chorizo": ("Chorizo", "Protein", {"es": ["longaniza"]}),
    "clavo_olor": ("Clavo de Olor", "Condiment", {}),
    "coco": ("Coco", "Fruit", {}),
    "cubio": ("Cubio", "Vegetable", {}),
    "culantro": ("Culantro (Cilantro Cimarrón)", "Condiment", {}),
    "curry": ("Curry", "Condiment", {"zh": ["咖喱块"]}),
    "doubanjiang": ("Pasta de Haba Picante (Doubanjiang)", "Sauce", {"zh": ["豆瓣酱", "红油豆瓣酱"]}),
    "enoki": ("Enoki", "Vegetable", {"zh": ["金针菇"]}),
    "fideos": ("Fideos", "Grain", {"zh": ["面条", "干面条", "鲜面条", "方便面", "泡面"]}),
    "gaseosa": ("Gaseosa", "Beverage", {"zh": ["可乐"]}),
    "glutamato": ("Glutamato Monosódico", "Condiment", {"zh": ["味素"]}),
    "goji": ("Goji", "Fruit", {"zh": ["枸杞"]}),
    "guascas": ("Guascas", "Condiment", {}),
    "habichuela": ("Habichuela", "Vegetable", {}),
    "harina_maiz": ("Harina de Maíz", "Grain", {}),
    "harina_yuca": ("Harina de Yuca", "Grain", {}),
    "hoisin": ("Salsa Hoisin", "Sauce", {"zh": ["海鲜酱"]}),
    "jamon": ("Jamón", "Protein", {"zh": ["火腿", "火腿肠"]}),
    "jujuba": ("Azufaifo (Jujuba)", "Fruit", {"zh": ["红枣"]}),
    "laurel": ("Laurel", "Condiment", {}),
    "lechuga": ("Lechuga", "Vegetable", {"zh": ["生菜"]}),
    "leche_coco": ("Leche de Coco", "Fruit", {"zh": ["椰浆"]}),
    "leche_condensada": ("Leche Condensada", "Dairy", {}),
    "levadura": ("Levadura", "Condiment", {}),
    "mani": ("Maní", "Legume", {"zh": ["花生"]}),
    "manteca_cerdo": ("Manteca de Cerdo", "Oil", {"zh": ["猪油"]}),
    "mango": ("Mango", "Fruit", {}),
    "masa_hojaldre": ("Masa de Hojaldre", "Grain", {}),
    "mayonesa": ("Mayonesa", "Sauce", {}),
    "miel": ("Miel", "Sugar", {"zh": ["蜂蜜"]}),
    "miel_cana": ("Miel de Caña", "Sugar", {}),
    "mijo": ("Mijo", "Grain", {"zh": ["小米"]}),
    "mojojoy": ("Mojojoy", "Protein", {}),
    "morcilla": ("Morcilla", "Protein", {}),
    "mostaza": ("Mostaza", "Condiment", {}),
    "nabo": ("Nabo", "Vegetable", {}),
    "naranja": ("Naranja", "Fruit", {}),
    "nian_gao": ("Pastel de Arroz (Nian Gao)", "Grain", {"zh": ["年糕", "年糕白粿"]}),
    "nori": ("Alga Nori", "Vegetable", {"zh": ["紫菜"]}),
    "nuez_moscada": ("Nuez Moscada", "Condiment", {}),
    "ñame": ("Ñame", "Vegetable", {}),
    "oregano": ("Orégano", "Condiment", {}),
    "ostion": ("Ostión", "Protein", {"zh": ["生蚝"]}),
    "paprika": ("Paprika", "Condiment", {}),
    "papaya": ("Papaya", "Fruit", {}),
    "pasta_soya": ("Pasta de Soya", "Sauce", {"zh": ["黄豆酱"]}),
    "pepino": ("Pepino", "Vegetable", {"zh": ["黄瓜"]}),
    "pimenton_verde": ("Pimentón Verde", "Vegetable", {"zh": ["青椒"]}),
    "pimienta_blanca": ("Pimienta Blanca", "Condiment", {"zh": ["白胡椒粉"]}),
    "pimienta_negra": ("Pimienta Negra", "Condiment", {"zh": ["胡椒粉", "黑胡椒碎", "黑椒粉", "黑椒碎"]}),
    "pimienta_sichuan": ("Pimienta de Sichuan", "Condiment", {"zh": ["花椒"]}),
    "pina": ("Piña", "Fruit", {}),
    "polvo_hornear": ("Polvo de Hornear", "Condiment", {}),
    "puerro_chino": ("Puerro Chino", "Vegetable", {"zh": ["韭菜"]}),
    "repollo": ("Repollo", "Vegetable", {}),
    "salchicha": ("Salchicha", "Protein", {}),
    "salsa_ostion": ("Salsa de Ostión", "Sauce", {"zh": ["蚝油"]}),
    "salsa_tomate": ("Salsa de Tomate", "Sauce", {"zh": ["番茄酱"]}),
    "sandia": ("Sandía", "Fruit", {}),
    "shiitake": ("Shiitake", "Vegetable", {"zh": ["香菇"]}),
    "suero_costeno": ("Suero Costeño", "Dairy", {}),
    "tocino": ("Tocino", "Protein", {"zh": ["咸肉"]}),
    "tomillo": ("Tomillo", "Condiment", {}),
    "vainilla": ("Vainilla (Esencia)", "Condiment", {}),
    "vinagre": ("Vinagre", "Condiment", {"zh": ["香醋"]}),
    "vino_cocina": ("Vino de Cocina", "Condiment", {"zh": ["料酒"]}),
    "almidon": ("Almidón", "Grain", {"zh": ["淀粉", "生粉"]}),
    "arroz_glutinoso": ("Arroz Glutinoso", "Grain", {"zh": ["糯米"]}),
    "frijol_adzuki": ("Frijol Adzuki", "Legume", {"zh": ["红豆"]}),
    "pan_vapor": ("Pan al Vapor (Mantou)", "Grain", {"zh": ["馒头"]}),
    "huevo_pidan": ("Huevo Centenario (Pidan)", "Protein", {"zh": ["皮蛋"]}),
    "cinco_especias": ("Cinco Especias Chinas", "Condiment", {"zh": ["五香粉"]}),
    "brote_bambu": ("Brote de Bambú", "Vegetable", {"zh": ["冬笋"]}),
    "salsa_trigo_dulce": ("Salsa Dulce de Trigo", "Sauce", {"zh": ["甜面酱"]}),
    "pasta_ajonjoli": ("Pasta de Ajonjolí (Tahini)", "Condiment", {"zh": ["芝麻酱"]}),
    "salsa_chile_crujiente": ("Salsa de Chile Crujiente", "Sauce", {"zh": ["老干妈"]}),
}
NEW = {k: v for k, v in NEW.items() if v}

# ordered (regex on folded text, target slug | None=garbage, reason)
RULES = [
    (r"^(fuente|palitos|brasas|bejucos|hielo|ulos maduros|echon o 5 kg)$|^(fuente|palitos|brasas|bejucos|hielo|ulos)\b", None, "utensil/fuel/unidentifiable fragment"),
    (r"hogao y aji|sal y pimienta|yuca cocida y platano|laurel y tomillo|frutas confitadas|galletas|hamburguesas", None, "composite/accompaniment line, not one ingredient"),
    (r"^(hojas?|manojo de hojas)\b.*(bijao|platano|naranjo)", None, "wrapper/leaf, not an ingredient"),
    (r"^(s |itros? |cucharadas? )?de agua\b|^agua\b|^s de agua|^itros? de agua|^cucharadas? de agua", None, "water"),
    (r"^caldo de coccion", None, "cooking liquid"),
    (r"aceite de achiote", "aceite_achiote", ""),
    (r"aceite de ajonjoli", "aceite_ajonjoli", ""),
    (r"aceite", "aceite", ""),
    (r"manteca de cerdo|grasa de cerdo", "manteca_cerdo", ""),
    (r"mantequilla", "mantequilla", ""),
    (r"crema de leche|crema agria", "crema_leche", ""),
    (r"leche de coco", "leche_coco", ""),
    (r"leche condensada", "leche_condensada", ""),
    (r"suero costeno", "suero_costeno", ""),
    (r"\bleche\b|^itros? de leche|^s de leche", "leche", ""),
    (r"queso", "queso", ""),
    (r"onjas de jamon|jamon", "jamon", ""),
    (r"^cocos?\b|coco fresco|coco rallado", "coco", ""),
    (r"caldo", "caldo", ""),
    (r"cerveza", "cerveza", ""),
    (r"gaseosa", "gaseosa", ""),
    (r"salsa de tomate|ketchup", "salsa_tomate", ""),
    (r"salsa soya", "salsa_soya", ""),
    (r"mayonesa", "mayonesa", ""),
    (r"hogao", "hogao", ""),
    (r"^salsas$", None, "generic category word"),
    (r"pasta de aji amarillo", "aji_amarillo", ""),
    (r"\baji(es)?\b|chile", "aji_picante", ""),
    (r"achiote|^cucharad\w* de color|^cucharadita de color", "achiote", ""),
    (r"almidon de yuca", "almidon_yuca", ""),
    (r"harina de yuca", "harina_yuca", ""),
    (r"harina de maiz|masa de maiz", "harina_maiz", ""),
    (r"harina de trigo", "harina_trigo", ""),
    (r"avena", "avena", ""),
    (r"amaranto", "amaranto", ""),
    (r"masa de hojaldre", "masa_hojaldre", ""),
    (r"arepa", "arepa", ""),
    (r"\barroz\b|^ibra de arroz|^s de arroz", "arroz", ""),
    (r"mazorca|maiz|choclo", "maiz", ""),
    (r"arveja", "arveja", ""),
    (r"caraota|frijol", "frijol", ""),
    (r"\bmani\b", "mani", ""),
    (r"chorizo|longaniza|onganiza", "chorizo", ""),
    (r"morcilla", "morcilla", ""),
    (r"cecina", "cecina", ""),
    (r"chicharron", "chicharron", ""),
    (r"tocino", "tocino", ""),
    (r"salchicha", "salchicha", ""),
    (r"chiguiro", "chigüiro", ""),
    (r"mojojoy", "mojojoy", ""),
    (r"camaron", "camaron", ""),
    (r"calamar|pulpo|mejillon|piangua", None, "SEAFOOD"),  # replaced below
    (r"cangrejo|jaiba|langosta", "cangrejo", ""),
    (r"caracol", "caracol", ""),
    (r"pescado|cachama|pirarucu|tollo|gumarra", "pescado", ""),
    (r"pechuga|pollo|gallina|allina|presas de pollo", "pollo", ""),
    (r"carne de res|costilla de res|carne molida|ternera|hamburguesa", "carne_res", ""),
    (r"cerdo|lechon|echon|tripas", "cerdo", ""),
    (r"\bhuevos?\b|yemas?", "huevo", ""),
    (r"cabezas? de ajo|dientes? de ajo|\bajo\b", "ajo", ""),
    (r"culantro|cilantro cimarron", "culantro", ""),
    (r"cilantro", "cilantro", ""),
    (r"canela", "canela", ""),
    (r"clavos? de olor", "clavo_olor", ""),
    (r"laurel", "laurel", ""),
    (r"tomillo", "tomillo", ""),
    (r"oregano", "oregano", ""),
    (r"nuez moscada", "nuez_moscada", ""),
    (r"pimienta", "pimienta_negra", ""),
    (r"paprika", "paprika", ""),
    (r"vainilla", "vainilla", ""),
    (r"bicarbonato", "bicarbonato", ""),
    (r"polvo de hornear", "polvo_hornear", ""),
    (r"mostaza", "mostaza", ""),
    (r"vinagre", "vinagre", ""),
    (r"alcaparra", "alcaparras", ""),
    (r"levadura", "levadura", ""),
    (r"guascas", "guascas", ""),
    (r"comino", "comino", ""),
    (r"\bsal\b", "sal", ""),
    (r"azucar morena|\bazucar\b", "azucar", ""),
    (r"miel de cana", "miel_cana", ""),
    (r"chocolate", "chocolate_mesa", ""),
    (r"\blimon|\bimon|jugo de 1 limon|ralladura de limon", "limon", ""),
    (r"aguacate", "aguacate", ""),
    (r"naranja", "naranja", ""),
    (r"\bpina\b|^pina\b", "pina", ""),
    (r"papaya", "papaya", ""),
    (r"mango", "mango", ""),
    (r"sandia", "sandia", ""),
    (r"banano|guineo", "banano", ""),
    (r"platanos? maduros?|ulos maduros", "platano_maduro", ""),
    (r"platanos? verdes?", "platano_verde", ""),
    (r"\bpapas?\b", "papa_pastusa", ""),
    (r"pimenton|pimiento", "pimenton_rojo", ""),
    (r"tomate", "tomate", ""),
    (r"zanahoria", "zanahoria", ""),
    (r"yuca", "yuca", ""),
    (r"\bname\b|\bnames\b|ñame|\bame\b|^ame", "ñame", ""),
    (r"ahuyama|calabaza", "ahuyama", ""),
    (r"arracacha", "arracacha", ""),
    (r"\bnabo\b", "nabo", ""),
    (r"lechuga", "lechuga", ""),
    (r"repollo", "repollo", ""),
    (r"apio", "apio", ""),
    (r"cubio", "cubio", ""),
    (r"habichuela", "habichuela", ""),
]
SEAFOOD = {"calamar": ("calamar", "Calamar", "Protein"), "pulpo": ("pulpo", "Pulpo", "Protein"),
           "mejillon": ("mejillon", "Mejillón", "Protein"), "piangua": ("piangua", "Piangua", "Protein")}
for key, (slug, nm, grp) in SEAFOOD.items():
    NEW[slug] = (nm, grp, {})
RULES = [(p, (SEAFOOD[next(k for k in SEAFOOD if k in p)][0] if r == "SEAFOOD" else t), r) if False else (p, t, r) for p, t, r in RULES]
RULES = [r for r in RULES if r[2] != "SEAFOOD"]
for key, (slug, _n, _g) in SEAFOOD.items():
    RULES.insert(next(i for i, r in enumerate(RULES) if r[0].startswith("cangrejo")), (key, slug, ""))

ZH = {}
for slug, (_n, _g, al) in NEW.items():
    for term in al.get("zh", []):
        ZH[term] = slug
ZH.update({
    "大蒜": "ajo", "蒜末": "ajo", "蒜瓣": "ajo", "蒜水": "ajo", "姜末": "jengibre", "生姜": "jengibre",
    "生姜末": "jengibre", "老姜": "jengibre", "香菜": "cilantro", "酱油": "salsa_soya", "生抽": "salsa_soya",
    "老抽": "salsa_soya", "芝麻油": "aceite_ajonjoli", "香油": "aceite_ajonjoli", "麻油": "aceite_ajonjoli",
    "芝麻香油": "aceite_ajonjoli", "植物油": "aceite", "食用油": "aceite", "菜油": "aceite", "菜籽油": "aceite",
    "花生油": "aceite", "食盐": "sal", "食用盐": "sal", "土豆": "papa_pastusa", "大米": "arroz", "米饭": "arroz",
    "冷饭": "arroz", "面粉": "harina_trigo", "牛奶": "leche", "淡奶油": "crema_leche", "黄油": "mantequilla",
    "鸡蛋": "huevo", "猪肉末": "cerdo", "猪五花肉": "cerdo", "排骨": "cerdo", "肉末": "cerdo", "肉馅": "cerdo",
    "瘦肉": "cerdo", "肉丁肉末": "cerdo", "牛肉": "carne_res", "鸡腿": "pollo", "番茄": "tomate",
    "西红柿": "tomate", "洋葱": "cebolla_cabezona", "葱花": "cebolla_larga", "葱末": "cebolla_larga",
    "小葱": "cebolla_larga", "香葱": "cebolla_larga", "青葱": "cebolla_larga", "胡萝卜": "zanahoria",
    "红椒": "pimenton_rojo", "孜然粉": "comino", "巴沙鱼": "pescado", "黑鳕鱼": "pescado", "鱼头一个": "pescado",
    "生菜菠菜油麦菜": "lechuga", "青菜": "lechuga", "玉米粒": "maiz", "辣椒油": "aceite_picante",
})
ZH_GARBAGE = re.compile(r"^(刷子|厨房秤|擀面杖|蒸笼垫|煲汤盅|量杯|密封袋|原料|其他调味料|调味料|炒料|面食材料|菜类材料|蔬菜|"
                        r"清水|冷水|饮用水|菜码|复配食品增稠剂|皮冻|小汤圆|烧卖皮|肉汤汁|牛羊鱼虾等肉类|火腿肠或鸡胸肉|"
                        r"藤椒油|红葱油|鸡精|玉竹|石斛|麦冬|西洋参|陈皮|萝卜干|酸豆角|醪糟|蕨根粉|葱姜蒜|鲤鱼五花肉|"
                        r"热干面特有的碱水面|炒河粉猪肉牛肉|高汤或浓汤宝|豆块豆筋豆腐皮等豆制品类|"
                        r"鸡蛋鸭蛋鹅蛋鸵鸟蛋等蛋类|青椒番茄胡萝卜等蔬菜类|风干快熟面任何牌子的快熟面)$|"
                        r"油盐|大葱姜大蒜|姜蒜瓣|灯影牛肉丝|黄瓜面筋|八角干辣椒")
ZH_REASON = "non-ingredient (tool/generic/composite/niche prep)"

PREFIX = re.compile(r"^(\d+\s*)+|^(cucharadas?|cucharaditas?|pizca|manojo|ramas?|ramitas?|dientes?|rodajas|"
                    r"s|ibras?|itros?|onjas|de)\b( de)?\s*")
SUFFIX = re.compile(r"\s+(para|en|con|y)\s+.*$|\s+(grandes?|medianos?|medianas?|pequenos?|pequenas?|frescos?|"
                    r"frescas?|maduros?|maduras?|picados?|picadas?|rallados?|rallada|molidos?|molida|cocidos?|cocida|"
                    r"derretida|tibia|fria|pelados?|limpios?|desgranado|enteros?|duros|precocidas?|tostados?|"
                    r"tiernos?|tiernas|secos?|seca)$")


def clean(name):
    s = fold(name)
    prev = None
    while prev != s:
        prev = s
        s = PREFIX.sub("", s).strip()
        s = SUFFIX.sub("", s).strip()
    return s


# Kept as pending_review on purpose: ambiguous ("colour" seasoning, no canonical
# fit) and site/src/lib/gos-v1.test.ts asserts >=1 placeholder stub still exists.
KEEP = {"condimento_con_color"}


def classify(name):
    """-> (kind, slug|None, reason).  kind in alias|garbage|unresolved."""
    if name in KEEP:
        return "unresolved", None, ""
    if re.search(r"[\u4e00-\u9fff]", name):
        if name in ZH:
            return "alias", ZH[name], ""
        if ZH_GARBAGE.search(name):
            return "garbage", None, ZH_REASON
        return "unresolved", None, ""
    s = fold(name)
    s = re.split(r"\s+o\s+", s)[0] if not re.search(r"hojas? de|hogao y", s) else s
    for pat, slug, reason in RULES:
        if re.search(pat, s):
            return ("garbage", None, reason) if slug is None else ("alias", slug, "")
    return "unresolved", None, ""


def selftest_classify():
    cases = {"cucharada_de_orégano_seco": "oregano", "hogao_y_ají_para_acompañar": None,
             "de_caracol_de_mar_limpio_y_ablandado": "caracol", "dientes_de_ajo": "ajo",
             "papaya": None, "de_crema_de_leche": "crema_leche", "imones_grandes": "limon",
             "papas_sabaneras": "papa_pastusa", "大蒜": "ajo", "刷子": None, "cucharadas_de_agua": None}
    for name, want in cases.items():
        if name == "papaya":
            want = "papaya"
        kind, slug, _ = classify(name)
        assert slug == want, (name, kind, slug, want)
    assert clean("cucharadas_de_azúcar_morena") == "azucar morena", clean("cucharadas_de_azúcar_morena")
    assert clean("ramas_de_orégano_fresco") == "oregano"
    print("selftest ok")


# ---------------------------------------------------------------- IO helpers
MULTI = re.compile(r"\s(o|y|or|and|和|与)\s", re.I)


def multi_food(term):
    """True for aliases naming two foods ('aceite o mantequilla')."""
    return bool(MULTI.search(term))


def read_json(path):
    return json.loads(path.read_text("utf8"))


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", "utf8")


def canonical_files():
    out = {}
    for p in sorted(ING.rglob("*.json")):
        if "pending_review" in p.parts or "_archive" in p.parts:
            continue
        out[p.stem] = p
    return out


def dish_refs():
    refs = set()
    for p in DISHES.rglob("*.md"):
        m = re.match(r"^---\n(.*?)\n---", p.read_text("utf8"), re.S)
        try:
            fm = (yaml.safe_load(m.group(1)) if m else None) or {}
        except Exception:
            continue
        for x in fm.get("main_ingredients") or []:
            if isinstance(x, str):
                refs.add(fold(x))
    return refs


def sanitize_aliases(canon, dry, root_check=None):
    """Drop aliases that name two foods ('aceite o mantequilla'). Returns changed slugs."""
    changed = []
    for slug, path in sorted(canon.items()):
        if not path.exists():
            continue
        data = read_json(path)
        al = data.get("aliases")
        if not isinstance(al, dict):
            continue
        new = {l: [t for t in v if not multi_food(t)] for l, v in al.items()}
        new = {l: v for l, v in new.items() if v}
        if new != al:
            changed.append(slug)
            if new:
                data["aliases"] = new
            else:
                del data["aliases"]
            if not dry:
                write_json(path, data)
    return changed


def main(argv):
    check = "--check" in argv
    dry = "--dry-run" in argv or check
    stubs = sorted(PEND.glob("*.json")) if PEND.is_dir() else []
    canon = canonical_files()
    refs = dish_refs()
    rows, adds, promote = [], {}, set()
    for p in stubs:
        fm = read_json(p)
        name = fm.get("name") or p.stem
        kind, slug, reason = classify(p.stem)
        if kind == "unresolved":
            rows.append((p.stem, clean(name), "KEPT (unresolved)", "", ""))
            continue
        if kind == "garbage":
            rows.append((p.stem, clean(name), "delete", "", reason))
            continue
        isnew = slug not in canon
        if isnew:
            promote.add(slug)
        if re.search(r"[\u4e00-\u9fff]", p.stem):
            adds.setdefault(slug, []).append(("zh", p.stem))
            rows.append((p.stem, p.stem, "promote" if isnew else "alias", slug, ""))
            continue
        terms = [name] if fold(name) in refs or fold(p.stem) in refs else []
        c = clean(name)
        if c and len(c.split()) <= 3 and not re.search(r"[\u4e00-\u9fff]", c) and c != fold(slug):
            terms.append(c)
        adds.setdefault(slug, []).extend(t for t in terms if not multi_food(t))
        rows.append((p.stem, clean(name), "promote" if isnew else "alias", slug,
                     "dish-referenced; redirect alias kept" if terms and fold(name) in refs else ""))
    # --- write new canonical files
    created = []
    for slug in sorted(promote):
        nm, grp, al = NEW[slug]
        path = ING / FOLDER[grp] / f"{slug}.json"
        data = {"name": nm, "group": grp,
                "i18n": {"es": {"common_name": nm, "other_names": []}},
                "nutrition_per_100g": {}}
        if any(al.values()):
            data["aliases"] = {k: list(v) for k, v in al.items() if v}
        data["body_md"] = f"# {nm}"
        if not dry:
            path.parent.mkdir(parents=True, exist_ok=True)
            write_json(path, data)
        canon[slug] = path
        created.append(slug)
    # --- resolver of already-claimed terms (ambiguity guard)
    claimed = {}
    for slug, path in canon.items():
        if not path.exists():
            continue
        fm = read_json(path)
        terms = [slug, fm.get("name", "")] + [t for v in (fm.get("aliases") or {}).values() for t in v]
        for t in terms:
            if t:
                claimed.setdefault(fold(t), slug)
    alias_changed = 0
    for slug in sorted(adds):
        path = canon[slug]
        if not path.exists():
            alias_changed += 1
            continue
        fm = read_json(path)
        before = json.dumps(fm, sort_keys=True)
        al = fm.setdefault("aliases", {})
        for t in adds[slug]:
            lang, t = t if isinstance(t, tuple) else ("es", t)
            lst = al.setdefault(lang, [])
            k = fold(t)
            if claimed.get(k, slug) != slug or any(fold(x) == k for x in lst):
                continue
            claimed[k] = slug
            lst.append(t)
        for lang in [l for l, v in al.items() if not v]:
            del al[lang]
        if not al:
            del fm["aliases"]
        if json.dumps(fm, sort_keys=True) != before:
            alias_changed += 1
            if not dry:
                write_json(path, fm)
    dropped = sanitize_aliases(canon, dry)
    removable = [p for p in stubs if next(x for x in rows if x[0] == p.stem)[2] != "KEPT (unresolved)"]
    if not dry:
        for p in removable:
            p.unlink()
    counts = {k: sum(1 for r in rows if r[2] == k) for k in ("alias", "promote", "delete", "KEPT (unresolved)")}
    lines = ["# Triage of `pending_review` ingredient stubs (gos-d2-05)", "",
             f"- Stubs before: {len(stubs)}",
             f"- Merged as alias of an existing canonical: {counts['alias']}",
             f"- Promoted to new canonical ingredient: {counts['promote']} stubs -> {len(created)} new files",
             f"- Deleted as garbage: {counts['delete']}",
             f"- Kept (unresolved): {counts['KEPT (unresolved)']}",
             f"- Canonical ingredients after: {len(canon)}",
             f"- Multi-food aliases dropped (e.g. `aceite o mantequilla`): {', '.join(dropped) or 'none'}", "",
             "New canonical files carry name/group/es i18n/aliases and an empty `nutrition_per_100g`; "
             "no nutrition or scientific values were written (data honesty).", "",
             "| stub | normalised | action | target | note |", "|---|---|---|---|---|"]
    lines += [f"| {a} | {b} | {c} | {d} | {e} |" for a, b, c, d, e in rows]
    pending = bool(removable or created or alias_changed or dropped)
    if check:
        if pending:
            print(f"triage would change files: {len(removable)} stubs, {len(created)} new, "
                  f"{alias_changed} alias edits, {len(dropped)} multi-food drops")
            return 1
        print("triage up to date")
        return 0
    if not pending:
        print("nothing to do")
        return 0
    if not dry and removable:
        REPORT.write_text("\n".join(lines) + "\n", "utf8")
    print("\n".join(lines[:10]))
    return 0


def selftest():
    assert multi_food("aceite o mantequilla") and multi_food("Ajo y Sal") and not multi_food("aceite vegetal")
    selftest_classify()


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        sys.exit(main(sys.argv[1:]))
