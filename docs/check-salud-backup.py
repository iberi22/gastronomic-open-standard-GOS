#!/usr/bin/env python3
"""
Checks that the backup SHAs for salud/* branches are valid commits
and are ancestors of HEAD.
"""

import pathlib
import subprocess
import sys

def run_command(cmd: list) -> bool:
    try:
        subprocess.run(
            cmd,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return True
    except subprocess.CalledProcessError:
        return False

def check_commit(sha: str) -> bool:
    # Check if object is a commit
    try:
        res = subprocess.run(
            ['git', 'cat-file', '-t', sha],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        if res.stdout.strip() != 'commit':
            return False
    except subprocess.CalledProcessError:
        return False

    # Check if it is an ancestor of HEAD
    if not run_command(['git', 'merge-base', '--is-ancestor', sha, 'HEAD']):
        return False

    return True

def main():
    md_path = pathlib.Path('docs/salud-branch-backup.md')
    if not md_path.exists():
        print("docs/salud-branch-backup.md not found", file=sys.stderr)
        sys.exit(1)

    content = md_path.read_text(encoding='utf-8')

    shas = [
        'aea52b35655b7a5c1a293fafaec1d1788b9ba4f7',
        '3b6d0df4a1fea9d5577bf9c20dcfb3123136410f',
        '72efac4ff6b8b1501b3bc15a29ee96037c238f4b',
        '66a4ca779b8bafcafdfce77163c0f54320d47568',
        '32a3ceee36432e01a6947821a604ccfc2fa79a2b',
        'dcd5f97a644ba978a235c784147e1bdc4dc09491',
        '78cfc1432e44bf98b78b73b1b22c549c5f4d86f2',
        'd97d9d4f283e46f63ae0c82b4661764bb5a29301',
    ]

    # Ensure they are present in the markdown
    for sha in shas:
        if sha not in content:
            print(f"SHA {sha} missing from docs/salud-branch-backup.md", file=sys.stderr)
            sys.exit(1)

    # Verify each SHA
    failed = False
    for sha in shas:
        if check_commit(sha):
            print(f"{sha} ancestor=yes")
        else:
            print(f"{sha} ancestor=no", file=sys.stderr)
            failed = True

    if failed:
        sys.exit(1)

if __name__ == '__main__':
    main()
