import json
import pathlib
import sys

def main():
    check_mode = len(sys.argv) > 1 and sys.argv[1] == '--check'

    docs_dir = pathlib.Path(__file__).parent
    repo_root = docs_dir.parent

    site_content = repo_root / 'site' / 'src' / 'content'

    collections = [
        'conditions',
        'diets',
        'dishes',
        'ingredients',
        'mixtures',
        'substances',
        'tips',
        'vitamins',
    ]

    counts = {}
    for coll in collections:
        coll_dir = site_content / coll
        if not coll_dir.is_dir():
            sys.stderr.write(f"Directory missing: {coll_dir}\n")
            sys.exit(1)

        counts[coll] = len(list(coll_dir.rglob('*.md')))

    root_mirror = {
        'dishes_md': len(list((repo_root / 'dishes').rglob('*.md'))),
        'dishes_recetas_index': len(list((repo_root / 'dishes').rglob('recetas_*.md'))),
        'ingredients_md': len(list((repo_root / 'ingredients').rglob('*.md'))),
    }

    output_data = {
        "source": "site/src/content",
        "counts": counts,
        "root_mirror": root_mirror
    }

    output_json = json.dumps(output_data, indent=2, sort_keys=False) + '\n'

    stats_file = docs_dir / 'stats.json'

    if check_mode:
        if not stats_file.exists():
            sys.stderr.write(f"Missing {stats_file}\n")
            sys.exit(1)

        with open(stats_file, 'r', encoding='utf-8') as f:
            disk_json = f.read()

        if disk_json != output_json:
            sys.stderr.write("stats.json on disk does not match computed stats\n")
            sys.exit(1)

        readme_path = repo_root / 'README.md'
        with open(readme_path, 'r', encoding='utf-8') as f:
            readme = f.read()

        dishes_str = f"{counts['dishes']} dishes"
        if dishes_str not in readme:
            sys.stderr.write(f"README.md missing expected string: '{dishes_str}'\n")
            sys.exit(1)

        if "405 dishes" in readme:
            sys.stderr.write("README.md still contains '405 dishes'\n")
            sys.exit(1)

        sys.exit(0)
    else:
        with open(stats_file, 'w', encoding='utf-8') as f:
            f.write(output_json)
        print(output_json, end='')

if __name__ == '__main__':
    main()
