
import os

MKDOCS_FILE = r"e:\scripts-python\gastronomic-open-standard\mkdocs.yml"

def clean_mkdocs():
    if not os.path.exists(MKDOCS_FILE):
        print(f"File not found: {MKDOCS_FILE}")
        return

    with open(MKDOCS_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    removed_count = 0

    for line in lines:
        # Check if line contains the invalid path pattern
        if "site\\src\\content" in line or "site/src/content" in line:
            removed_count += 1
            continue
        new_lines.append(line)

    with open(MKDOCS_FILE, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    print(f"Cleaned {removed_count} lines containing 'site/src/content' from {MKDOCS_FILE}")

if __name__ == "__main__":
    clean_mkdocs()
