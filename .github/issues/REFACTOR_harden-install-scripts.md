---
title: "Audit and harden installation scripts"
labels:
  - refactor
  - security
  - installation
assignees: []
---

## Description
Audit the `install.sh` and `install.ps1` scripts for security anomalies and robustness issues.
The user requested an audit of the `curl | bash` and `irm | iex` instructions.

## Tareas
- [ ] Add explicit dependency checks (git, curl).
- [ ] Improve error handling (trap/try-catch).
- [ ] Verify variable expansion safety.
- [ ] Add version/checksum validation logic (if feasible without breaking one-liner simplicity).
- [ ] Standardize console output colors and formatting.
