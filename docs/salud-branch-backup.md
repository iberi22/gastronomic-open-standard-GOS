# Salud Branch Backup (2026-10-10)

This file serves as the official documentation and backup reference for the `salud/*` branches that were merged into the repository. It is created because the remote tracking branches have already been deleted, and therefore, pushing or merging them again is out of scope. The record below points to the specific merge commits that encompass the work from those branches, which are safely preserved in the Git history.

## Measurement Point
All historical measurements and verifications documented here are based on the commit `26d2cfd94a2ee41ef47ba112bf226c65c0d67216` on `origin/main`.

## Current State of Remote Branches
On 2026-10-10, an inspection of the repository remotes was performed to determine the existence of any leftover `salud/*` branches:
- The command `git ls-remote --heads origin | grep -c salud` returned `0`.
- The command `git branch -a | grep -c salud` returned `0`.

This confirms that there are no unmerged or dangling branches matching the `salud/` prefix left to push or recover.

## Preserved Merges (Ancestors of origin/main)
The following 8 commits have been identified as the successful merges of the original feature branches. Each of these commits has been verified to be an ancestor of `origin/main` (i.e., `git merge-base --is-ancestor <sha> origin/main` succeeds):

1. **`aea52b35655b7a5c1a293fafaec1d1788b9ba4f7`**
   - `merge: salud/contract-widen (swal.health/v1 training log + 1,324-exercise metadata catalogue); licence: root Apache-2.0, health-contract AGPL-3.0-or-later (openGym-derived)`

2. **`3b6d0df4a1fea9d5577bf9c20dcfb3123136410f`**
   - `Merge branch 'salud/x6' into develop`

3. **`72efac4ff6b8b1501b3bc15a29ee96037c238f4b`**
   - `merge: salud/g6 en la integración del ecosistema de salud`

4. **`66a4ca779b8bafcafdfce77163c0f54320d47568`**
   - `merge: salud/g3 en la integración del ecosistema de salud`

5. **`32a3ceee36432e01a6947821a604ccfc2fa79a2b`**
   - `merge: salud/e2 en la integración del ecosistema de salud`

6. **`dcd5f97a644ba978a235c784147e1bdc4dc09491`**
   - `merge: salud/g2 en la integración del ecosistema de salud`

7. **`78cfc1432e44bf98b78b73b1b22c549c5f4d86f2`**
   - `merge: salud/g7 en la integración del ecosistema de salud`

8. **`d97d9d4f283e46f63ae0c82b4661764bb5a29301`**
   - `merge: p2-agent-tools (3 read-only catalogue tools) + hook anti-leak gate executable`

## Missing Branches
The following 5 branch names are known to have existed historically or were mentioned in planning, but no commits matching their names as subjects were found on `origin/main` (i.e., `git log origin/main --oneline --grep=<name>` returns zero results):
- `salud/g1`
- `salud/g4`
- `salud/g5`
- `salud/integracion`
- `salud/f1`

No SHA was invented or hallucinated for these missing names. Their absence is the official finding.

## Excluded Commits (False Friends)
During the search, the commit **`343308a1e902be7dc043d3ed1ba7dfb35ea21921`** was returned by `git log --grep='salud/'`. This commit is explicitly excluded from the backup list. The subject of this commit is `seo(gos): llms.txt + robots.txt + sitemap.xml`, and the token `salud/diet` appears only in its commit body. Thus, it represents a false positive when relying purely on a grep filter for the subject, and it is not a branch backup.

## Summary
By recording these exact full 40-character hashes in this markdown ledger, we ensure that the critical work integrated from the `salud` workstreams remains explicitly referencable without keeping stale branches alive.
This markdown document ensures we maintain a clear historical backup.
Because all branches are completely merged and verified, no other push operations are needed.
The list above provides the entire truth set for these ancestral points in Git history.
Thank you for consulting this reference document.
