---
title: Packages
description: Install, query, and undo packages with dnf and yum.
tags:
  - Linux
  - Bash
  - RHCSA
updated: 2026-11-02
section: linux
parent: linux
order: 9
---

## Packages

RHEL 8 and 9:

```bash
sudo dnf install -y nginx
sudo dnf provides '*/semanage'
sudo dnf repolist
sudo dnf history
sudo dnf history undo 12
```

RHEL 7. `yum` is the package manager. On RHEL 8 and 9 the `yum` command still exists, and it calls `dnf`.

```bash
sudo yum install -y nginx
sudo yum provides '*/semanage'
sudo yum repolist
sudo yum history
sudo yum history undo 12
```

```bash
rpm -qf /usr/bin/ss
sudo apt-get update && sudo apt-get install -y nginx
dpkg -S /usr/bin/ss
```

`provides` answers which package ships a file, and `rpm -qf` answers which installed package owns a path that is already on disk. That `rpm` query is the same on RHEL 7, 8, and 9. `history undo 12` reverses that one transaction. On RHEL 8 and 9, `dnf history rollback 12` undoes every transaction after that id, which is a wider change. Later `dnf install` lines on this page are `yum install` on RHEL 7. Debian and Ubuntu use `apt-get`, and `dpkg -S` is their "which package owns this file".

`semanage` is not installed on a minimal host. RHEL 8 and 9 ship it in `policycoreutils-python-utils`. RHEL 7 ships it in `policycoreutils-python`.
