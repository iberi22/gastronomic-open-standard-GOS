
---
description: Process for generating, auditing, and watermarking recipe images.
---

# Recipe Image Generation Protocol

This workflow outlines the standard operating procedure for identifying recipes properly, generating AI images for them, and finalizing them with the project watermark.

## 1. Identify Missing Images
Run the following script to find recipes in the `colombian` directory (or configured directory) that lack local images:

```bash
python scripts/find_missing_images.py
```

## 2. Generate Image
For each missing recipe:
1.  **Read the Recipe**: Understand the visual elements (ingredients, colors, plating style).
    -   *Example*: "Pescado envuelto en hojas de plátano, asado a las brasas."
2.  **Prompt Engineering**: Create a high-quality prompt for the `generate_image` tool.
    -   *Style*: "Professional food photography, 8k resolution, cinematic lighting, top-down or 45-degree angle, delicious, vibrant colors."
    -   *Context*: Ensure cultural accuracy (e.g., correct serving dishes, sides like patacones).
3.  **Generate**: Use the `generate_image` tool.
    -   `Prompt`: "[Dish Name], [Description], professional food photography..."
    -   `ImageName`: `[dish_slug]_nano`

## 3. Save Image
1.  Use the `run_command` or filesystem tools to move/save the generated image to the recipe's folder.
    -   Target: `dishes/region/dish_name/images/1.jpg` (or 1.png)
    -   Create the `images` folder if it doesn't exist.

## 4. Run Watermark Workflow
**Critical Step**: Do not commit the raw image directly. Run the watermark workflow to backup the raw version and brand the public version.

```bash
python scripts/watermark_workflow.py
```

## 5. Update Documentation
1.  Edit the `recipe.md` file.
2.  Update the `images` frontmatter list or add the image reference in the body if desired.
    ```yaml
    images:
      - url: "./images/1.jpg"
        description: "Plato servido con [acompañantes]"
    ```

## 6. Verify and Commit
1.  Check that `assets/raw_images_registry` has the clean backup.
2.  Check that `dishes/.../images/[dish_slug]_nano.jpg` has the Nano Banana watermark.
3.  Commit changes.

// turbo
python scripts/audit_recipes.py
