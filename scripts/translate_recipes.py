"""
Batch translator for GOS recipes - translates Spanish recipes to English.
Uses Gemini CLI for translation.
"""
import json
import subprocess
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

PROJECT_ROOT = Path("E:/scripts-python/gastronomic-open-standard-GOS")
DISHES_DIR = PROJECT_ROOT / "dishes"

# Language pairs
COLombian_ENGLISH_DIR = DISHES_DIR / "colombian" / "english"
PERUVIAN_ENGLISH_DIR = DISHES_DIR / "peruvian" / "english"

def get_spanish_recipes(country: str) -> list:
    """Get all Spanish recipe files for a country."""
    country_dir = DISHES_DIR / country
    recipes = []
    
    for md_file in country_dir.rglob("*.md"):
        # Skip non-recipe files
        if any(skip in md_file.name.lower() for skip in ["readme", "_template", "recetas_", "colombian_recipes"]):
            continue
        if md_file.stem in ["envueltos", "cayeye", "mazamorra", "mote_de_queso", "postre_de_natas", "tamal_tolimense", "arequipe", "natilla", "hayaca_llanera", "tungo_llanero"]:
            # These are flat files at country level, not in subdirectories
            if md_file.parent.name == country:
                recipes.append(md_file)
            continue
        if md_file.parent.name == "english":
            continue
        recipes.append(md_file)
    
    return recipes

def get_translation_prompt(content: str, title: str, region: str) -> str:
    """Generate translation prompt for Gemini."""
    return f"""Translate the following Colombian or Peruvian recipe from Spanish to English. 
Preserve ALL frontmatter exactly as shown. Preserve ALL markdown structure.
Fill in any missing metadata fields (sensory, prep_time, cook_time, difficulty, image should be null).
Keep the translated recipe faithful to the original while making it natural in English.

Recipe title: {title}
Region: {region}

```markdown
{content}
```

Output ONLY the translated markdown file, nothing else. Use this format:

---
title: "Translated Title"
region: {region}
...all fields translated to English...
---

English translation:"""

def translate_file(file_path: Path, output_dir: Path) -> dict:
    """Translate a single file using Gemini CLI."""
    try:
        content = file_path.read_text(encoding="utf-8")
        
        # Extract title and region from frontmatter
        title = "Unknown"
        region = ""
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                fm_text = parts[1]
                title_match = re.search(r'title:\s*["\']?([^"\'\n]+)', fm_text)
                if title_match:
                    title = title_match.group(1)
                region_match = re.search(r'region:\s*["\']?([^"\'\n]+)', fm_text)
                if region_match:
                    region = region_match.group(1)
        
        # Create output path preserving directory structure
        relative = file_path.relative_to(DISHES_DIR)
        # For flat files like cayeye.md in otras_preparaciones, put them directly in english/
        if file_path.parent.name in ["colombian", "peruvian"]:
            output_path = output_dir / file_path.name
        else:
            output_path = output_dir / file_path.name
        
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Use Gemini CLI for translation
        prompt = get_translation_prompt(content, title, region)
        
        # Use cmd /c to properly invoke gemini.cmd on Windows
        result = subprocess.run(
            ["cmd", "/c", "gemini", "-p", prompt, "-y"],
            capture_output=True,
            text=True,
            timeout=120,
            shell=False
        )
        
        if result.returncode == 0:
            translated = result.stdout.strip()
            # If it's just the prompt echoed back, try to extract the markdown
            if "```markdown" in translated:
                start = translated.find("```markdown") + 10
                end = translated.rfind("```")
                if end > start:
                    translated = translated[start:end].strip()
            elif "---" not in translated:
                # Just use what we got
                pass
            
            output_path.write_text(translated, encoding="utf-8")
            return {"status": "success", "file": str(file_path), "output": str(output_path)}
        else:
            return {"status": "error", "file": str(file_path), "error": result.stderr}
            
    except Exception as e:
        return {"status": "error", "file": str(file_path), "error": str(e)}

def main():
    # Ensure output directories exist
    COLombian_ENGLISH_DIR.mkdir(parents=True, exist_ok=True)
    PERUVIAN_ENGLISH_DIR.mkdir(parents=True, exist_ok=True)
    
    # Get all recipes
    colombian_recipes = get_spanish_recipes("colombian")
    peruvian_recipes = get_spanish_recipes("peruvian")
    
    print(f"Found {len(colombian_recipes)} Colombian recipes")
    print(f"Found {len(peruvian_recipes)} Peruvian recipes")
    
    # Translate Colombian recipes
    print("\n--- Translating Colombian recipes ---")
    results = []
    for i, recipe in enumerate(colombian_recipes):
        print(f"[{i+1}/{len(colombian_recipes)}] Translating {recipe.relative_to(DISHES_DIR)}...")
        result = translate_file(recipe, COLombian_ENGLISH_DIR)
        results.append(result)
        if result["status"] == "success":
            print(f"  ✓ Done")
        else:
            print(f"  ✗ Error: {result.get('error', 'Unknown')[:100]}")
    
    # Translate Peruvian recipes
    print("\n--- Translating Peruvian recipes ---")
    for i, recipe in enumerate(peruvian_recipes):
        print(f"[{i+1}/{len(peruvian_recipes)}] Translating {recipe.relative_to(DISHES_DIR)}...")
        result = translate_file(recipe, PERUVIAN_ENGLISH_DIR)
        results.append(result)
        if result["status"] == "success":
            print(f"  ✓ Done")
        else:
            print(f"  ✗ Error: {result.get('error', 'Unknown')[:100]}")
    
    # Summary
    success = sum(1 for r in results if r["status"] == "success")
    failed = sum(1 for r in results if r["status"] == "error")
    print(f"\n=== SUMMARY ===")
    print(f"Total: {len(results)}")
    print(f"Success: {success}")
    print(f"Failed: {failed}")
    
    if failed > 0:
        print("\nFailed files:")
        for r in results:
            if r["status"] == "error":
                print(f"  - {r['file']}: {r.get('error', '')[:80]}")

if __name__ == "__main__":
    main()