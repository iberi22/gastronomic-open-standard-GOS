import subprocess, tempfile, os, re
from pathlib import Path

PROJECT = Path('E:/scripts-python/gastronomic-open-standard-GOS')
recipe = PROJECT / 'dishes/colombian/amasijos/achiras/achiras.md'
content = recipe.read_text(encoding='utf-8')

prompt = f'Translate to English, keep all markdown and frontmatter.\n\n{content}\n\nEnglish:'

with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', encoding='utf-8', delete=False) as f:
    pf = f.name
    f.write(prompt)

result = subprocess.run(
    f'gemini -p "@{pf}" -y',
    capture_output=True,
    text=True,
    timeout=150,
    shell=True
)
os.unlink(pf)
print('RC:', result.returncode)
print('OUT[:400]:', result.stdout[:400])