import subprocess, re
from pathlib import Path

PROJECT = Path('E:/scripts-python/gastronomic-open-standard-GOS')
recipe = PROJECT / 'dishes/colombian/amasijos/achiras/achiras.md'
content = recipe.read_text(encoding='utf-8')

prompt = f'Translate this recipe to English. Keep all markdown and frontmatter. Fill missing metadata (sensory flavor/texture/aroma arrays, prep_time, cook_time, difficulty, image: null). Add to frontmatter: translated_from: "../amasijos/achiras/achiras.md"\n\n{content}\n\nEnglish markdown only:'

result = subprocess.run(
    f'qwen -p "{prompt}" -y',
    capture_output=True,
    text=True,
    timeout=120,
    shell=True
)
print('RC:', result.returncode)
print('OUT[:600]:', result.stdout[:600])
print('ERR[:200]:', result.stderr[:200])