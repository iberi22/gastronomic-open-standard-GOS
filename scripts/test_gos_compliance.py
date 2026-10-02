
import sys
import os
sys.path.append(os.getcwd())
from pathlib import Path
from gos.io import load_recipe

# Separadores de Path: antes eran literales de Windows (dishes\colombian\...),
# que en Linux se buscan como un unico nombre de archivo con backslashes y
# nunca existian.
test_files = [
    Path("dishes/colombian/caribe/mote_de_queso/mote_de_queso.md"),
    Path("dishes/peruvian/arroz_con_pollo.md"),
]

def test_compliance():
    print("🧪 Testing Compliance...")

    for path in test_files:
        print(f"Checking {path}...")
        frontmatter, errors, body = load_recipe(path)

        assert not errors, f"{path}: {errors}"
        print("✅ YAML/Schema Passed")

        assert "Análisis Detallado y Sabiduría Colectiva" in body, \
            f"{path}: falta la sección de análisis científico"
        print("✅ Scientific Analysis Present")

    print("\n✨ SUCCESS: Standardized recipes are fully compliant with GOS Framework.")

if __name__ == "__main__":
    test_compliance()
