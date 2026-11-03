---
title: Shell
description: Quoting, exit status, and the bash habits that keep a script from deleting the wrong path.
tags:
  - Linux
  - Bash
  - RHCSA
updated: 2026-11-02
section: linux
parent: linux
order: 12
---

## Shell habits

```bash
set -euo pipefail
```

In a script, `-e` exits on a failed command, `-u` errors on an unset variable, and `pipefail` makes a pipeline fail when any stage fails. `-e` does not fire inside an `if` test, which is what you want.

```bash
printf 'count %s\n' "$#"
printf 'first %s\n' "$1"
printf 'arg %s\n' "$@"
[[ -d /path ]]
[[ -n "${1:-}" ]]
out=$(cmd)
while IFS= read -r line; do
  printf '%s\n' "$line"
done < file
tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
```

`"$#"` is how many arguments you got, `"$1"` is the first, and `"$@"` is every argument as its own word. Quoting matters once an argument contains a space. `[[ -d /path ]]` is the test for a directory. `$(cmd)` captures stdout and strips trailing newlines.

```bash
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
```

That is the directory the script lives in, which is not the same as the directory you launched it from.

```bash
while getopts "hv" opt; do
  case "$opt" in
    h) printf 'usage: %s [-h] [-v]\n' "$0"; exit 0 ;;
    v) verbose=1 ;;
    *) exit 1 ;;
  esac
done
shift $((OPTIND - 1))
```

`getopts` is the short-option parser. After the loop, `shift` drops the options so `"$@"` is the remaining operands.

```bash
cmd > out.txt
cmd >> out.txt
cmd 2> err.txt
cmd > all.txt 2>&1
cmd | tee all.txt
echo $?
```

`$?` is the exit status of the last command. `0` is success. `2>&1` sends stderr to wherever stdout is going, and the order is the meaning: `> all.txt 2>&1` sends both to the file. `tee` copies stdout to a file and to the screen.

```bash
export AWS_PROFILE=dev
```

On macOS, in-place `sed` needs a backup suffix argument, and an empty suffix still has to be present: `sed -i '' 's/foo/bar/' file`. GNU sed on Linux accepts `sed -i 's/foo/bar/' file`.
