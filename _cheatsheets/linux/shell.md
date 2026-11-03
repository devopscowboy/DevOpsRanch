---
title: Shell
description: Arguments, tests, redirection, and the exit status of a short RHEL script.
tags:
  - Linux
  - Bash
  - RHCSA
updated: 2026-11-03
section: linux
parent: linux
order: 12
---

## Arguments, tests, and redirection

These are the pieces a short RHEL script actually uses. Quoting, a test, and where the output goes.

```bash
printf 'first %s\n' "$1"
printf 'count %s\n' "$#"
printf 'arg %s\n' "$@"
```

`"$1"` is the first argument. `"$#"` is how many arguments there were. `"$@"` is every argument, each as its own word. The quotes matter when an argument contains a space.

```bash
[[ -d /path ]]
[[ -f /path ]]
[[ -n "${1:-}" ]]
name=$(whoami)
```

`[[ -d ]]` is true when the path is a directory. `[[ -f ]]` is true when it is a regular file. `$(whoami)` runs the command and keeps what it printed. `${1:-}` is an empty string when `$1` was not set.

```bash
cmd > out.txt
cmd >> out.txt
cmd 2> err.txt
cmd > all.txt 2>&1
printf '%s\n' "$?"
```

`>` writes standard output to a file and replaces that file. `>>` appends. `2>` is standard error. `2>&1` sends standard error to the same place as standard output, and it has to come after the `>` that sets that place. `$?` is the exit status of the last command. `0` means it worked.

```bash
set -euo pipefail
```

At the top of a script, `-e` exits when a command fails, `-u` errors when a variable is unset, and `pipefail` makes a pipeline fail if any stage fails. `-e` does not fire inside an `if` test.

On RHEL 7, 8, 9, and 10, `sed` is GNU sed. `sed -i 's/old/new/' file` edits the file in place. `sed -i.bak` keeps a copy named `file.bak`.
