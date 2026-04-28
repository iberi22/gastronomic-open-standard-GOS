import subprocess, re
from pathlib import Path

PROJECT = Path('E:/scripts-python/gastronomic-open-standard-GOS')
recipe = PROJECT / 'dishes/colombian/amasijos/achiras/achiras.md'
content = recipe.read_text(encoding='utf-8')

prompt = f'Translate to English, keep all markdown and frontmatter.\n\n{content}\n\nEnglish:'

# Escape for cmd.exe shell: " becomes "" inside double-quoted string
prompt_escaped = prompt.replace('"', '""')

result = subprocess.run(
    f'gemini -p "{prompt_escaped}" -y',
    capture_output=True,
    text=True,
    timeout=150,
    shell=True
)
print('RC:', result.returncode)
print('OUT[:500]:', result.stdout[:500])
print('ERR[:200]:', result.stderr[:200])