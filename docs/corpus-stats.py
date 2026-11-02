import json
import pathlib
import sys

NUTRITION_KEY = 'nutrition_per_100g'


def has_positive_number(value):
    """True when a nutrition block holds at least one number strictly > 0.

    Non-numeric values (strings, booleans, null) and missing keys count as zero,
    so no figure is invented from unparsed text.
    """
    if isinstance(value, bool):
        return False
    if isinstance(value, (int, float)):
        return value > 0
    if isinstance(value, dict):
        return any(has_positive_number(v) for v in value.values())
    if isinstance(value, list):
        return any(has_positive_number(v) for v in value)
    return False


def count_ingredient_json(ingredients_dir):
    """Count published/pending-review ingredient JSON and measured nutrition."""
    published = 0
    pending_review = 0
    nonzero_nutrition = 0

    for path in sorted(ingredients_dir.rglob('*.json')):
        if 'pending_review' in path.parts:
            pending_review += 1
            continue

        published += 1
        try:
            with open(path, 'r', encoding='utf-8') as f:
                record = json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            sys.stderr.write(f"Cannot parse ingredient JSON {path}: {exc}\n")
            sys.exit(1)

        if not isinstance(record, dict):
            record = {}
        if has_positive_number(record.get(NUTRITION_KEY)):
            nonzero_nutrition += 1

    return {
        'published': published,
        'pending_review': pending_review,
        'nonzero_nutrition': nonzero_nutrition,
    }


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

    # Markdown collections stay on *.md. JSON collections count *.json.
    # Ingredients count the published set only; pending_review stays in
    # ingredients_json so a zero markdown count is not read as an empty corpus.
    count_basis = {
        'conditions': 'json',
        'diets': 'json',
        'dishes': 'md',
        'ingredients': 'published_json',
        'mixtures': 'json',
        'substances': 'json',
        'tips': 'md',
        'vitamins': 'json',
    }

    counts = {}
    for coll in collections:
        coll_dir = site_content / coll
        if not coll_dir.is_dir():
            sys.stderr.write(f"Directory missing: {coll_dir}\n")
            sys.exit(1)
        if coll not in count_basis:
            sys.stderr.write(f"No count basis for {coll}\n")
            sys.exit(1)

    root_mirror = {
        'dishes_md': len(list((repo_root / 'dishes').rglob('*.md'))),
        'dishes_recetas_index': len(list((repo_root / 'dishes').rglob('recetas_*.md'))),
        'ingredients_md': len(list((repo_root / 'ingredients').rglob('*.md'))),
    }

    ingredients_json = count_ingredient_json(site_content / 'ingredients')

    for coll, basis in count_basis.items():
        coll_dir = site_content / coll
        if basis == 'md':
            counts[coll] = len(list(coll_dir.rglob('*.md')))
        elif basis == 'json':
            counts[coll] = len(list(coll_dir.rglob('*.json')))
        elif basis == 'published_json':
            counts[coll] = ingredients_json['published']
        else:
            sys.stderr.write(f"Unknown count basis {basis} for {coll}\n")
            sys.exit(1)

    output_data = {
        "source": "site/src/content",
        "count_basis": count_basis,
        "counts": counts,
        "root_mirror": root_mirror,
        "ingredients_json": ingredients_json,
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

        readme_es_path = repo_root / 'README.es.md'
        with open(readme_es_path, 'r', encoding='utf-8') as f:
            readme_es = f.read()

        dishes_es_str = f"{counts['dishes']} platos"
        if dishes_es_str not in readme_es:
            sys.stderr.write(f"README.es.md missing expected string: '{dishes_es_str}'\n")
            sys.exit(1)

        if "405 platos" in readme_es:
            sys.stderr.write("README.es.md still contains '405 platos'\n")
            sys.exit(1)

        if "383 platos" in readme_es:
            sys.stderr.write("README.es.md still contains '383 platos'\n")
            sys.exit(1)

        # The README headline must quote the measured ingredient JSON counts.
        headline_checks = [
            (readme, 'README.md', [
                f"{ingredients_json['published']} published ingredients",
                f"{ingredients_json['pending_review']} pending review",
                f"{ingredients_json['nonzero_nutrition']} with non-zero nutrition",
            ]),
            (readme_es, 'README.es.md', [
                f"{ingredients_json['published']} ingredientes publicados",
                f"{ingredients_json['pending_review']} pendientes de revisión",
                f"{ingredients_json['nonzero_nutrition']} con nutrición no nula",
            ]),
        ]

        for text, name, expected_strings in headline_checks:
            for expected_str in expected_strings:
                if expected_str not in text:
                    sys.stderr.write(
                        f"{name} missing expected headline string: '{expected_str}'\n"
                    )
                    sys.exit(1)

        api_readme_path = repo_root / 'API_README.md'
        with open(api_readme_path, 'r', encoding='utf-8') as f:
            api_readme = f.read()

        if "docs/stats.json" not in api_readme:
            sys.stderr.write("API_README.md missing literal 'docs/stats.json'\n")
            sys.exit(1)

        sys.exit(0)
    else:
        with open(stats_file, 'w', encoding='utf-8') as f:
            f.write(output_json)
        print(output_json, end='')

if __name__ == '__main__':
    main()
