
import os
import shutil
from PIL import Image, ImageOps

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DISHES_DIR = os.path.join(PROJECT_ROOT, 'dishes')
RAW_REGISTRY_DIR = os.path.join(PROJECT_ROOT, 'assets', 'raw_images_registry')
LOGO_PATH = os.path.join(PROJECT_ROOT, 'assets', 'images', 'logo_gos.png')

# Extensions to process
IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp')
FORCE_UPDATE = True


def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def add_watermark(input_path, output_path, watermark_path):
    try:
        base_image = Image.open(input_path).convert("RGBA")
        watermark = Image.open(watermark_path).convert("RGBA")

        # Resize watermark to be 15% of the base image width
        width_ratio = 0.15
        w_width, w_height = watermark.size
        b_width, b_height = base_image.size

        new_w_width = int(b_width * width_ratio)
        new_w_height = int(w_height * (new_w_width / w_width))

        watermark = watermark.resize((new_w_width, new_w_height), Image.Resampling.LANCZOS)

        # Position: Bottom Right with slight padding
        padding = int(b_width * 0.02)
        position = (b_width - new_w_width - padding, b_height - new_w_height - padding)

        # Create transparent layer
        transparent = Image.new('RGBA', (b_width, b_height), (0,0,0,0))
        transparent.paste(base_image, (0,0))
        transparent.paste(watermark, position, mask=watermark)

        # Convert back to RGB(A) logic - if original was jpg, we need RGB
        original_format = os.path.splitext(input_path)[1].lower()
        if original_format in ['.jpg', '.jpeg']:
            final_image = transparent.convert("RGB")
        else:
            final_image = transparent

        final_image.save(output_path, quality=95)
        print(f"✅ Watermarked: {os.path.basename(output_path)}")
        return True
    except Exception as e:
        print(f"❌ Error watermarking {input_path}: {e}")
        return False

def process_images():
    print(f"🚀 Starting Watermark Workflow...")
    print(f"📂 Dishes Source: {DISHES_DIR}")
    print(f"📂 Raw Registry: {RAW_REGISTRY_DIR}")

    ensure_dir(RAW_REGISTRY_DIR)

    if not os.path.exists(LOGO_PATH):
        print(f"❌ Logo not found at {LOGO_PATH}. Aborting.")
        return

    count_processed = 0
    count_new_raw = 0

    for root, dirs, files in os.walk(DISHES_DIR):
        for file in files:
            if file.lower().endswith(IMAGE_EXTENSIONS):
                current_image_path = os.path.join(root, file)

                # Construct relative path to maintain structure in registry
                rel_path = os.path.relpath(current_image_path, DISHES_DIR)
                registry_image_path = os.path.join(RAW_REGISTRY_DIR, rel_path)

                # Check if we already have the raw version
                if not os.path.exists(registry_image_path):
                    # NEW IMAGE DETECTED
                    # Assume the one in DISHES is currently CLEAN (Raw) because we haven't backed it up yet.
                    print(f"🆕 New image detected: {rel_path}")

                    # 1. Save to Registry (Backup Clean Version)
                    ensure_dir(os.path.dirname(registry_image_path))
                    shutil.copy2(current_image_path, registry_image_path)
                    print(f"   └── Saved clean copy to registry.")
                    count_new_raw += 1

                    # 2. Apply Watermark to the one in DISHES
                    add_watermark(registry_image_path, current_image_path, LOGO_PATH)
                    count_processed += 1
                else:
                    # Registry exists.
                    # FORCE UPDATE: Ensure dishes version is watermarked from registry source
                    if FORCE_UPDATE:
                        add_watermark(registry_image_path, current_image_path, LOGO_PATH)
                        count_processed += 1
                    # We assume the one in DISHES is *already* watermarked or should be.
                    # To be safe, we can force re-watermark from registry -> dishes
                    # effectively resetting the dishes image to a watermarked version of the Clean Registry one.
                    # This handles cases where we might have accidentally overwritten the dishes one with a clean one again.
                    # BUT, doing this every time is expensive.
                    # Let's check file modification times or just skip if we want speed.
                    # For now, let's skip unless forced (or maybe logic: if they are identical bytes, it means dishes is clean)

                    # Simple check: Compare file sizes? No.
                    # Let's just trust that if it's in registry, we made the dishes one watermarked before.
                    # OPTIONAL: Uncomment to force sync
                    # add_watermark(registry_image_path, current_image_path, LOGO_PATH)
                    pass

    print(f"\n✨ Workflow Complete.")
    print(f"   - New Clean Images Archived: {count_new_raw}")
    print(f"   - Images Watermarked: {count_processed}")

if __name__ == "__main__":
    process_images()
