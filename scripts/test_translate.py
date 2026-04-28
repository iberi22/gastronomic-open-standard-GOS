"""Simple test translator - translate a single file using Gemini."""
import subprocess
import re
from pathlib import Path

content = Path("E:/scripts-python/gastronomic-open-standard-GOS/test_achiras.md").read_text(encoding="utf-8")

prompt = f"""Translate this Colombian recipe from Spanish to English. Keep ALL markdown structure and frontmatter exactly as shown. Fill in any missing metadata fields.

```markdown
{content}
```

Output ONLY the translated markdown file, nothing else."""

result = subprocess.run(
    ["cmd", "/c", "gemini", "-p", prompt, "-y"],
    capture_output=True,
    text=True,
    timeout=120
)

print("RC:", result.returncode)
print("OUT:", result.stdout[:500])
if result.stderr:
    print("ERR:", result.stderr[:200])