
import sys
import os
sys.path.append(os.getcwd())
from pathlib import Path
from gos.io import load_recipe

test_files = [
    r"dishes\colombian\caribe\mote_de_queso\mote_de_queso.md",
    r"dishes\peruvian\arroz_con_pollo.md"
]

def test_compliance():
    print("🧪 Testing Compliance...")
    all_passed = True

    for relative_path in test_files:
        path = Path(relative_path)
        print(f"Checking {path}...")

        frontmatter, errors, body = load_recipe(path)

        if errors:
            print(f"❌ YAML/Schema Errors: {errors}")
            all_passed = False
        else:
            print("✅ YAML/Schema Passed")

        if "Análisis Detallado y Sabiduría Colectiva" not in body:
            print("❌ Missing Scientific Analysis Section")
            all_passed = False
        else:
            print("✅ Scientific Analysis Present")

    if all_passed:
        print("\n✨ SUCCESS: Standardized recipes are fully compliant with GOS Framework.")
        exit(0)
    else:
        print("\n❌ FAILURE: Validation failed.")
        exit(1)

if __name__ == "__main__":
    test_compliance()
