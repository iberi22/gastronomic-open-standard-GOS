import os
import re

def fix_headings(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(".md"):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Regex to find the first heading after frontmatter
                # Frontmatter is between two ---
                # We look for the first ### heading after the second ---

                # Split by frontmatter
                parts = content.split('---', 2)
                if len(parts) >= 3:
                    frontmatter = parts[1]
                    body = parts[2]

                    # Check if the first heading in body is ###
                    # We look for the first line starting with #
                    match = re.search(r'^\s*(#+)\s+(.*)', body, re.MULTILINE)
                    if match:
                        level = len(match.group(1))
                        if level == 3:
                            # Replace the first occurrence of ### with ##
                            # Be careful to only replace the first one found
                            new_body = re.sub(r'^\s*###\s+', '## ', body, count=1, flags=re.MULTILINE)
                            new_content = '---' + frontmatter + '---' + new_body

                            if new_content != content:
                                print(f"Fixing {filepath}")
                                with open(filepath, 'w', encoding='utf-8') as f:
                                    f.write(new_content)

fix_headings('dishes/colombian')
