import re

with open('.github/dependabot.yml', 'r') as f:
    content = f.read()

# Change interval to weekly
content = content.replace('interval: "monthly"', 'interval: "weekly"')

# Change open-pull-requests-limit to 5
content = content.replace('open-pull-requests-limit: 2', 'open-pull-requests-limit: 5')

# Group minor/patch updates in all dependencies
content = re.sub(
    r'(all-dependencies:\n\s+applies-to: version-updates\n\s+patterns:\n\s+- "\*")',
    r'\1\n        update-types:\n          - "minor"\n          - "patch"',
    content
)

# Add pip ecosystem block at the end
pip_block = """
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    labels:
      - "dependencies"
    groups:
      all-dependencies:
        applies-to: version-updates
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"
      security-dependencies:
        applies-to: security-updates
        patterns:
          - "*"
"""

content += pip_block

with open('.github/dependabot.yml', 'w') as f:
    f.write(content)
