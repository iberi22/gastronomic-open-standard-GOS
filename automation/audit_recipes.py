import os
import glob
import frontmatter
import csv

def audit_recipes(base_dir="dishes"):
    print(f"Auditing recipes in {base_dir}...")

    files = glob.glob(os.path.join(base_dir, "**/*.md"), recursive=True)
    report = []

    for f in files:
        if f.endswith("README.md") or "_template" in f:
            continue

        try:
            post = frontmatter.load(f)
            fm = post.metadata

            status = "COMPLETE"
            missing = []

            if 'ingredients_detailed' not in fm:
                status = "NEEDS_UPDATE"
                missing.append("ingredients_detailed")

            if 'nutrition_per_serving' not in fm:
                status = "NEEDS_UPDATE"
                missing.append("nutrition_per_serving")

            if 'sensory_profile' not in fm:
                status = "NEEDS_UPDATE" # strict check
                missing.append("sensory_profile")

            report.append({
                'file': f,
                'status': status,
                'missing_fields': ", ".join(missing)
            })

        except Exception as e:
            report.append({
                'file': f,
                'status': "ERROR",
                'missing_fields': str(e)
            })

    # Sort report: Needs update first
    report.sort(key=lambda x: x['status'] == "COMPLETE")

    # Print summary
    print(f"\nAudit Complete. Analyzed {len(report)} files.")
    needs_update = [r for r in report if r['status'] == "NEEDS_UPDATE"]
    print(f"Recipes needing update: {len(needs_update)}")

    # Write detailed CSV
    with open("automation/recipe_audit_report.csv", "w", newline="") as csvfile:
        fieldnames = ['file', 'status', 'missing_fields']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for r in report:
            writer.writerow(r)

    print("Detailed report saved to automation/recipe_audit_report.csv")

if __name__ == "__main__":
    audit_recipes()
