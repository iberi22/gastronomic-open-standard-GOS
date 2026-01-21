import os
import re

def get_image_prompt(recipe_path):
    with open(recipe_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract Title
    title_match = re.search(r'title: "(.*?)"', content)
    title = title_match.group(1) if title_match else "Unknown Dish"

    # Extract Region
    region_match = re.search(r'region: "(.*?)"', content)
    region = region_match.group(1) if region_match else "Cuisine"

    prompt = f"Professional food photography of {title}, {region} style. High resolution, delicious, restaurant lighting."
    return prompt

if __name__ == "__main__":
    # Test with Curry Crab
    target = r"e:\scripts-python\gastronomic-open-standard-GOS\dishes\china\mariscos\咖喱炒蟹\咖喱炒蟹.md"
    if os.path.exists(target):
        print(get_image_prompt(target))
    else:
        print("Target not found.")
