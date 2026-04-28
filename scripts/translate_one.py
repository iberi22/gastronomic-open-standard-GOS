"""Translate one recipe file using Gemini CLI via subprocess."""
import subprocess
import re
from pathlib import Path

input_file = Path("E:/scripts-python/gastronomic-open-standard-GOS/dishes/colombian/amasijos/achiras/achiras.md")
output_file = Path("E:/scripts-python/gastronomic-open-standard-GOS/dishes/colombian/english/achiras.md")

content = input_file.read_text(encoding="utf-8")

fm_match = re.match(r'---\n(.*?)\n---', content, re.DOTALL)
title = "Unknown"
if fm_match:
    t = re.search(r'title:\s*["\']?(.+?)["\']?\s*$', fm_match.group(1), re.MULTILINE)
    if t:
        title = t.group(1).strip()

prompt = f"""Translate this Colombian recipe to English. Keep the exact same markdown structure and frontmatter format. Fill in any missing metadata fields (sensory, prep_time, cook_time, difficulty). Add 'translated_from' in frontmatter.

Recipe: {title}

{content}

Output ONLY the translated English markdown:"""

print(f"Translating: {title}")

CREATE_NEW_PROCESS_GROUP = 0x00000200

result = subprocess.run(
    ["cmd", "/c", "gemini", "-p", prompt, "-y"],
    creationflags=CREATE_NEW_PROCESS_GROUP,
    timeout=180,
)

print(f"RC: {result.returncode}")
output = result.stdout

lines = output.split('\n')
clean_lines = []
for line in lines:
    if '\x1b[' in line or 'MCP' in line or 'YOLO' in line or 'Tool calls' in line:
        continue
    clean_lines.append(line)
clean_output = '\n'.join(clean_lines).strip()

if '```' in clean_output:
    start = clean_output.find('```') + 3
    if clean_output[start:start+10].strip() in ['markdown', 'yaml']:
        start = clean_output.find('\n', start) + 1
    end = clean_output.rfind('```')
    clean_output = clean_output[start:end].strip()

print(f"Clean length: {len(clean_output)}, starts with: {clean_output[:100]}")

if result.returncode == 0 and '---' in clean_output:
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(clean_output, encoding="utf-8")
    print(f"Saved to {output_file}")
else:
    print(f"Failed RC={result.returncode}")
    print("Snippet:", clean_output[:200])
    print("stderr:", result.stderr[:300] if hasattr(result, 'stderr') else 'N/A')