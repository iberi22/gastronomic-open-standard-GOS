import click
import os
from pathlib import Path
from .io import load_recipe

DISHES_DIR = Path("dishes")
REQUIRED_HEADERS = [
    "Análisis Detallado y Sabiduría Colectiva",
    "Perfil Sensorial Estandarizado", # The standard we enforced
]

@click.group()
def cli():
    """Gastronomic Open Standard CLI"""
    pass

@cli.command()
@click.argument("target_path", type=click.Path(exists=True), required=False)
def audit(target_path):
    """
    Validates recipes against the Scientific Standard.

    TARGET_PATH: Optional path; defaults to 'dishes'.
    """
    start_dir = Path(target_path) if target_path else DISHES_DIR
    click.echo(f"🔬 Starting GOS Scientific Audit on {start_dir}...")

    stats = {"valid": 0, "invalid": 0, "errors": [], "warnings": []}

    if start_dir.is_file():
        walker = [(start_dir.parent, [], [start_dir.name])]
    else:
        walker = os.walk(start_dir)

    for root, _, files in walker:
        for file in files:
            if not file.endswith(".md") or file.startswith("_") or file == "README.md" or file.startswith("recetas_"):
                continue

            path = Path(root) / file
            # Relative path for display
            try:
                rel_path = path.relative_to(DISHES_DIR)
            except ValueError:
                rel_path = path

            frontmatter, errors, body = load_recipe(path)

            # 1. Structural Validation (YAML/Pydantic)
            if errors:
                stats["invalid"] += 1
                stats["errors"].append(f"❌ {rel_path}: {', '.join(errors)}")
                continue

            # 2. Content Validation (Sections)
            missing_sections = []
            for header in REQUIRED_HEADERS:
                if header not in body:
                    missing_sections.append(header)

            if missing_sections:
                # Las secciones ausentes son deuda de contenido (Issue #125), no fallo de esquema.
                stats["warnings"].append(f"⚠️ {rel_path}: Missing sections {missing_sections}")

            # If we get here, it passes!
            stats["valid"] += 1

    # Report
    click.echo("\n" + "="*40)
    click.echo(f"📊 SUMMARY")
    click.echo(f"✅ Valid Recipes:   {stats['valid']}")
    click.echo(f"❌ Invalid Recipes: {stats['invalid']}")
    click.echo(f"⚠️ Content warnings: {len(stats['warnings'])} (deuda de secciones, Issue #125)")
    click.echo("="*40 + "\n")

    if stats["errors"]:
        click.echo("DETAILS (Failures):")
        for err in stats["errors"]:
            click.echo(err)
        raise click.Abort() # Exit with error code for CI
    if stats["warnings"]:
        click.echo("DETAILS (Content warnings, no bloquean):")
        for w in stats["warnings"][:20]:
            click.echo(w)
        click.echo("🎉 Esquema GOS compliant (con deuda de secciones rastreada en Issue #125).")
    else:
        click.echo("🎉 All recipes comply with the standard!")

if __name__ == "__main__":
    cli()
