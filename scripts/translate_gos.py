"""
GOS Recipe Translator v4 - file-based I/O, shell=True for PATH resolution.
Uses temp prompt files passed via @ trick.
"""
import subprocess
import re
import os
import tempfile
import shlex
from pathlib import Path

PROJECT = Path("E:/scripts-python/gastronomic-open-standard-GOS")
DISHES = PROJECT / "dishes"
COL_OUT = DISHES / "colombian" / "english"
PER_OUT = DISHES / "peruvian" / "english"

COL_OUT.mkdir(parents=True, exist_ok=True)
PER_OUT.mkdir(parents=True, exist_ok=True)

SKIP_NAMES = {'readme.md', '_template.md', 'recetas_amazonia.md', 'recetas_andinas.md',
              'recetas_caribe.md', 'recetas_insulares.md', 'recetas_pacificas.md',
              'recetas_orinoquia.md', 'colombian_recipes_plan.md'}
SKIP_STEMS = {'envueltos', 'cayeye', 'mazamorra', 'mote_de_queso', 'postre_de_natas',
              'tamal_tolimense', 'arequipe', 'natilla', 'hayaca_llanera', 'tungo_llanero'}

def get_recipes(country: str) -> list:
    recipes = []
    for md in (DISHES / country).rglob("*.md"):
        if md.name.lower() in SKIP_NAMES or md.stem in SKIP_STEMS:
            continue
        if md.parent.name == 'english':
            continue
        recipes.append(md)
    return recipes

def extract_title(content: str) -> str:
    fm = re.match(r'---\n(.*?)\n---', content, re.DOTALL)
    if fm:
        t = re.search(r'title:\s*["\']?(.+?)["\']?\s*$', fm.group(1), re.MULTILINE)
        if t:
            return t.group(1).strip()
    return "Unknown"

def sanitize(raw: str) -> str:
    lines = raw.split('\n')
    clean = [l for l in lines if not any(x in l for x in [
        '\x1b[', 'MCP issues', 'Tool calls', 'LocalAgentExecutor', 'Skipping',
        'Error executing', 'Blocked call', 'did you mean', 'to prevent recursion',
        'run_shell_command', 'list_directory', 'YOLO mode', '[LocalAgentExecutor]']
    )]
    text = '\n'.join(clean).strip()
    
    if '```' in text:
        parts = text.split('```')
        for i in range(1, len(parts), 2):
            block = parts[i].strip()
            for p in ('markdown\n', 'yaml\n', 'markdown', 'yaml'):
                if block.startswith(p):
                    block = block[len(p):].strip()
                    break
            if block.startswith('---'):
                return block
        candidates = [p.strip() for p in parts[1::2] if p.strip().startswith('---')]
        if candidates:
            return max(candidates, key=len)
    return text

def translate_file(recipe: Path, out_dir: Path) -> tuple:
    content = recipe.read_text(encoding='utf-8')
    title = extract_title(content)
    rel = recipe.relative_to(DISHES)
    orig_path = f"../{rel.parent.name}/{rel.name}"
    
    max_chars = 6000
    display_content = content if len(content) <= max_chars else content[:max_chars]
    
    prompt = (
        f'Translate recipe to English. Keep ALL markdown structure and frontmatter. '
        f'Fill missing metadata (sensory flavor/texture/aroma arrays, prep_time, cook_time, difficulty, image: null). '
        f'Add to frontmatter: translated_from: "{orig_path}"\n\n'
        f'{display_content}\n\nOutput English markdown only:'
    )
    
    # Write prompt to temp file (UTF-8)
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', encoding='utf-8', delete=False) as f:
        pf = f.name
        f.write(prompt)
    
    try:
        # shell=True + @file trick - gemini reads prompt from file
        result = subprocess.run(
            f'gemini -p "@{pf}" -y',
            capture_output=True,
            text=True,
            timeout=150,
            shell=True
        )
        
        translated = sanitize(result.stdout)
        if translated.startswith('---'):
            out_file = out_dir / recipe.name
            out_file.write_text(translated, encoding='utf-8')
            return True, "OK"
        else:
            return False, f"Bad: {translated[:80]}"
    except subprocess.TimeoutExpired:
        return False, "TIMEOUT"
    except Exception as e:
        return False, str(e)[:60]
    finally:
        try:
            os.unlink(pf)
        except:
            pass

def main():
    print("=== GOS Recipe Translator v4 ===")
    
    all_recipes = []
    for country, out_dir in [("colombian", COL_OUT), ("peruvian", PER_OUT)]:
        recipes = get_recipes(country)
        print(f"{country}: {len(recipes)} recipes")
        all_recipes.extend((r, out_dir) for r in recipes)
    
    print(f"Total: {len(all_recipes)}\n")
    
    total_ok = 0
    total_fail = 0
    
    for idx, (recipe, out_dir) in enumerate(all_recipes):
        rel = recipe.relative_to(DISHES)
        print(f"[{idx+1}/{len(all_recipes)}] {rel}...", end=" ", flush=True)
        
        ok, msg = translate_file(recipe, out_dir)
        if ok:
            print("OK")
            total_ok += 1
        else:
            print(f"FAIL: {msg}")
            total_fail += 1
    
    print(f"\n=== DONE: {total_ok} ok, {total_fail} failed ===")

if __name__ == "__main__":
    main()