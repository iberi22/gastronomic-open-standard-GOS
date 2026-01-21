
import os
import shutil

# Source: Artifacts dir
# Destination: e:\scripts-python\gastronomic-open-standard-GOS\ingredients\images

SOURCE = r"C:\Users\belal\.gemini\antigravity\brain\1ce1c452-a4d6-46c3-8175-05747cd9122d"
DEST = r"e:\scripts-python\gastronomic-open-standard-GOS\ingredients\images"

files = [
    ("maiz_tierno_1765767310922.png", "maiz.jpg"),
    ("pollo_crudo_1765767325300.png", "pollo_crudo.jpg"),
    ("yuca_fresca_1765767339747.png", "yuca.jpg"),
    ("arroz_blanco_1765767362914.png", "arroz_blanco.jpg"),
    ("papa_criolla_1765767467423.png", "papa_criolla.jpg"),
    ("papa_pastusa_1765767483191.png", "papa_pastusa.jpg"),
    ("cilantro_fresco_1765767499222.png", "cilantro.jpg"),
    ("carne_res_cruda_1765767515753.png", "carne_res.jpg"),
    ("cerdo_crudo_1765769492792.png", "cerdo.jpg"),
    ("pescado_fresco_1765769525927.png", "pescado_blanco.jpg"),
    ("zanahoria_fresca_1765769540762.png", "zanahoria.jpg"),
    ("harina_trigo_1765769555822.png", "harina_trigo.jpg"),
    ("sal_marina_1765769581092.png", "sal.jpg"),
    ("platano_maduro_1765769639811.png", "platano_maduro.jpg"),
    ("panela_bloque_1765769654280.png", "panela.jpg"),
    ("comino_semillas_1765769673457.png", "comino.jpg"),
    ("pimenton_rojo_1765769688481.png", "pimenton_rojo.jpg"),
    ("salsa_soya_1765769740572.png", "salsa_soya.jpg"),
    ("jengibre_fresco_1765769755213.png", "jengibre.jpg"),
    ("aceite_ajonjoli_1765769770284.png", "aceite_ajonjoli.jpg"),
]

for src_name, dest_name in files:
    src_path = os.path.join(SOURCE, src_name)
    dest_path = os.path.join(DEST, dest_name)
    if os.path.exists(src_path):
        shutil.copy2(src_path, dest_path)
        print(f"Copied {src_name} to {dest_name}")
    else:
        print(f"Source not found: {src_name}")
