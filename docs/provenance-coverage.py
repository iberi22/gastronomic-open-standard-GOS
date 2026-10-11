import os
import sys
from pathlib import Path
import re

def count_provenance():
    base_dir = Path("site/src/content/ingredients")
    if not base_dir.exists():
        base_dir = Path(".") # Fallback or error, assume it exists for now based on prompt

    ingredients_scanned = 0
    ingredients_with_license = 0
    ingredients_with_date_retrieved = 0
    unsplash_in_ingredient_files = 0

    # regexes
    license_re = re.compile(r'^license:', re.MULTILINE)
    date_retrieved_re = re.compile(r'date_retrieved:')
    unsplash_re = re.compile(r'unsplash', re.IGNORECASE)

    for root, _, files in os.walk(base_dir):
        for file in files:
            if not file.endswith(".md"):
                continue
            if file == "README.md" or file == "_template.md":
                continue

            file_path = Path(root) / file
            ingredients_scanned += 1

            try:
                content = file_path.read_text(encoding='utf-8')

                # We need to extract frontmatter for accurate checking
                parts = content.split('---')
                if len(parts) >= 3:
                    frontmatter = parts[1]
                else:
                    frontmatter = content

                if license_re.search(frontmatter):
                    ingredients_with_license += 1
                if date_retrieved_re.search(frontmatter):
                    ingredients_with_date_retrieved += 1

                if unsplash_re.search(content):
                    unsplash_in_ingredient_files += 1

            except Exception as e:
                pass

    template_has_license = 0
    template_has_date_retrieved = 0
    template_path = Path("ingredients/_template.md")
    if template_path.exists():
        try:
            template_content = template_path.read_text(encoding='utf-8')
            parts = template_content.split('---')
            if len(parts) >= 3:
                frontmatter = parts[1]
            else:
                frontmatter = template_content

            if license_re.search(frontmatter):
                template_has_license = 1
            if date_retrieved_re.search(frontmatter):
                template_has_date_retrieved = 1
        except Exception:
            pass

    print(f"ingredients_scanned={ingredients_scanned}")
    print(f"ingredients_with_license={ingredients_with_license}")
    print(f"ingredients_with_date_retrieved={ingredients_with_date_retrieved}")
    print(f"template_has_license={template_has_license}")
    print(f"template_has_date_retrieved={template_has_date_retrieved}")
    print(f"unsplash_in_ingredient_files={unsplash_in_ingredient_files}")

    if template_has_license == 0 or template_has_date_retrieved == 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    count_provenance()
