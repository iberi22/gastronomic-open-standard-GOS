
import yaml
from pathlib import Path
from typing import Tuple, Optional
from .schemas import RecipeFrontmatter, SensoryProfile, Nutrition

def load_recipe(path: Path) -> Tuple[Optional[RecipeFrontmatter], list[str], str]:
    """
    Parses a recipe markdown file.
    Returns: (FrontmatterObj, ErrorsList, RawContent)
    """
    errors = []
    frontmatter_obj = None

    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        # Split Frontmatter
        if not content.startswith("---"):
            errors.append("Missing Frontmatter (--- check)")
            return None, errors, content

        parts = content.split("---", 2)
        if len(parts) < 3:
            errors.append("Malformed Frontmatter structure")
            return None, errors, content

        yaml_text = parts[1]
        markdown_body = parts[2]

        # Parse YAML
        try:
            data = yaml.safe_load(yaml_text)
        except yaml.YAMLError as e:
            errors.append(f"YAML Syntax Error: {e}")
            return None, errors, content

        # Validate with Pydantic
        try:
            frontmatter_obj = RecipeFrontmatter(**data)
        except Exception as e:
            errors.append(f"Schema Validation Error: {e}")

        return frontmatter_obj, errors, markdown_body

    except Exception as e:
        errors.append(f"File Read Error: {e}")
        return None, errors, ""
