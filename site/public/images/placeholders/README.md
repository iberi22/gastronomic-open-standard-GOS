# Placeholder Images

This directory contains SVG placeholder images for the GOS knowledge graph visualization.

## Files

| File | Description | Size |
|------|-------------|------|
| `recipe.svg` | Generic food/dish placeholder | 64x64 |
| `ingredient.svg` | Generic ingredient placeholder | 64x64 |

## Usage

These placeholders are used when:
- A recipe doesn't have an image assigned
- An ingredient doesn't have a photo

### Replacing with Real Images

1. **For Recipe Images:**
   - Add image URLs to the recipe's frontmatter `images[]` field
   - Supported formats: JPG, PNG, WebP, SVG
   - Recommended size: 800x600px or larger
   - Example frontmatter:
     ```yaml
     images:
       - url: "/images/recipes/my-dish.jpg"
         description: "Plated dish showing presentation"
     ```

2. **For Ingredient Images:**
   - Add ingredient images to `ingredients/<category>/<name>/images/` 
   - Supported formats: JPG, PNG, WebP, SVG
   - Recommended size: 400x400px or larger
   - The image should show the ingredient in a recognizable form

3. **Graph Integration:**
   - The graph visualization uses the `image` property on recipe/ingredient nodes
   - If `image` is `null` or missing, the placeholder is displayed
   - To enable real images, update `generate_graph.py` to read image paths from frontmatter

## CSS/Emoji Fallback

The visualization also supports emoji fallbacks:
- Recipes: 🍲 (or emoji specified in frontmatter)
- Ingredients: 🥕 (or emoji specified in frontmatter)

## Regenerating Placeholders

If you need to modify these SVGs:
1. Edit the SVG files directly
2. Ensure they remain valid SVG 1.1
3. Test at multiple sizes (the viewBox scales automatically)
