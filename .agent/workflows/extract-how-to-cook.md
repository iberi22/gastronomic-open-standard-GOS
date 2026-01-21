---
description: Automatically sync recipes from Anduin2017/HowToCook and integrate them into the gastronomic-open-standard-GOS repository.
---

# Sync HowToCook Recipes

This workflow automates the extraction of recipes from the `Anduin2017/HowToCook` repository.

## Steps

1. Run the sync script:

    ```bash
    python scripts/sync_how_to_cook.py
    ```

2. Review specific newly created recipes. Use `git status` to see new additions in `dishes/china`.

3. (Optional) Run ingredient enrichment "Task":
    - Identify new ingredients in the generated markdown.
    - Create new files in `ingredients/` following `docs/SCIENTIFIC_INGREDIENT_PROTOCOL.md`.

4. Commit changes:

    ```bash
    git add dishes/china
    git commit -m "feat(china): sync recipes from HowToCook"
    ```
