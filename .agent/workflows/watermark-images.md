---
description: Automatically process recipe images to apply branding watermarks while archiving the original clean versions.
---

# Image Watermark Workflow

This workflow is designed to manage recipe images. It ensures that every image in the `dishes/` directory has a branded watermark, while safely storing the original clean version in `assets/raw_images_registry/`.

## When to use
- After adding new images to any recipe in `dishes/`.
- Before committing changes to the repository.
- When you want to ensure consistent branding across all recipe photos.

## How it works
1.  **Scanning**: The script scans the `dishes/` directory for image files.
2.  **Registry Check**: It checks if a clean backup of the image exists in `assets/raw_images_registry/`.
3.  **Archiving**: If no backup exists, it assumes the current image is "New & Clean", and copies it to the registry.
4.  **Watermarking**: It then takes the clean image, superimposes the `assets/images/logo_gos.png`, and overwrites the active image in `dishes/` with the watermarked version.

## Steps

1.  Run the workflow script using Python:
    ```bash
    python scripts/watermark_workflow.py
    ```

2.  Verify the output:
    -   New clean images will be listed as archived.
    -   Images that received a watermark will be confirmed.

3.  (Optional) Commit the changes:
    -   You will see changes in `dishes/` (modified images).
    -   You will see new files in `assets/raw_images_registry/` (new backups).
    ```bash
    git add dishes assets/raw_images_registry
    git commit -m "chore(images): process and watermark new recipe images"
    ```

## Dependencies
-   Python 3
-   Pillow (`pip install Pillow`)
