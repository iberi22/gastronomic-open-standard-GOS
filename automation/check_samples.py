import os
import json

base = r'E:\scripts-python\gastronomic-open-standard-GOS\dishes'
files = []
for root, dirs, filenames in os.walk(base):
    for f in filenames:
        if f.endswith('.md') and not f.startswith('_') and f != 'README.md':
            files.append(os.path.join(root, f))

print('Total: {}'.format(len(files)))

samples = []
for fpath in files[:5]:
    with open(fpath, 'r', encoding='utf-8') as fp:
        content = fp.read()
        samples.append({'path': fpath, 'content': content[:3000]})

with open(r'E:\scripts-python\gastronomic-open-standard-GOS\automation\samples_output.json', 'w', encoding='utf-8') as f:
    json.dump(samples, f, ensure_ascii=False, indent=2)
print('Written to samples_output.json')
