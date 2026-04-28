import os
import json

base = r'E:\scripts-python\gastronomic-open-standard-GOS\dishes'
colombian_files = []
for root, dirs, filenames in os.walk(base):
    for f in filenames:
        if f.endswith('.md') and not f.startswith('_') and f != 'README.md':
            fpath = os.path.join(root, f)
            with open(fpath, 'r', encoding='utf-8') as fp:
                content = fp.read()
            if len(colombian_files) < 10:
                colombian_files.append({'path': fpath, 'content': content[:4000]})

with open(r'E:\scripts-python\gastronomic-open-standard-GOS\automation\colombian_samples.json', 'w', encoding='utf-8') as f:
    json.dump(colombian_files, f, ensure_ascii=False, indent=2)
print('Written {} samples'.format(len(colombian_files)))
