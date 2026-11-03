---
title: Files and Directories
description: Create, copy, read, search, and archive files and directories.
tags:
  - Linux
  - Bash
  - RHCSA
updated: 2026-11-02
section: linux
parent: linux
order: 2
---

## Create, copy, and remove

`mkdir` - Creates a directory. Use it when you need a new folder for a project. `-p` creates any missing parent directories along the path, and it does not complain if the directory already exists.

```bash
mkdir -p /home/devopscowboy/projects/ansible-lab/playbooks
```

`touch` - Creates an empty file, or updates the timestamp if that file already exists. Use it when a file has to exist before you edit it, or when a program only checks that the name is there.

```bash
touch notes.md
```

`cat` - Prints a whole file to the screen. Use it for a short file, such as `/etc/hosts`. On a long file the text scrolls past. Use `less` for those.

```bash
cat /etc/hosts
```

`less` - Opens a file one screen at a time. Use it for logs and anything longer than a page. The space bar moves forward, `q` quits, and `/pattern` searches. On RHEL, general system messages are in `/var/log/messages`.

```bash
less /var/log/messages
```

`cp` - Copies a file. The first path is the original and the second is the copy. Use it to keep a backup before you edit. `-r` copies a directory and everything inside it. `-a` does that and also keeps permissions, ownership, and times.

```bash
cp notes.md notes.md.bak
cp -r playbooks playbooks-copy
```

`mv` - Moves a file or directory. That is also how you rename one: the original name is gone, and nothing is left in the old place. Use it to change a name or to put a file in a different folder. If the destination name already exists, `mv` replaces that file.

```bash
mv web.yml site.yml
mv notes.md docs/notes.md
```

`rm` - Deletes a file. There is no trash folder, and you cannot undo it. `-r` deletes a directory and everything inside it. Run `ls` on the path first so you can see the names you are about to remove.

```bash
rm notes.md
rm -r old-playbooks
```

> `rm -rf` means recursive and force. It does not ask, and it deletes a whole tree. Do not point it at `/`, and do not run it on a path you have not read back to yourself. RHEL's root shell is often set up to ask before `rm`, `cp`, and `mv`. A normal user's shell is not. Do not count on the question. Prefer `rm -r` without `-f` while you are learning.

## Files and directories

```bash
mkdir -p project/src
cp -a source dest
mv oldpath newpath
rm file
rm -r directory
ln -s /opt/app/releases/v2 /opt/app/current
readlink -f /opt/app/current
stat file
```

`cp -a` preserves permissions, times, and links. `mkdir -p` creates parents and does not complain if the directory exists. `ln -s` creates a symbolic link; the first path is the target, the second is the link name. `readlink -f` prints the canonical path with every symlink resolved. `stat` shows mode, owner, size, and timestamps in one place.

> `rm` does not go to a trash directory. In a script, refuse an empty path so a blank variable cannot turn the command into a delete of `/`: `rm -rf -- "${dir:?}/subdir"`. The `:?` stops the shell when `dir` is unset or empty.

## Read a file

```bash
less /var/log/messages
head -n 20 file
tail -n 50 -f /var/log/secure
wc -l file
```

On RHEL, general system messages go to `/var/log/messages` and SSH and sudo go to `/var/log/secure`. Debian uses `/var/log/syslog` and `/var/log/auth.log` for those. `less` is the pager: `/pattern` searches, `n` finds the next hit, `q` quits. `tail -f` follows new lines. Add `--retry` (`tail -F`) when the file is rotated and recreated. The journal, which is the other half of RHEL logging, is in [Logs and the journal](/cheatsheets/linux/logs-and-the-journal/).

## Search

```bash
grep -RInw --exclude-dir=.git "pattern" .
grep -rl 'pattern' .
find . -name '*.log' -mtime -1
find . -type f -size +100M
find / -name 'sshd_config' 2>/dev/null
find . -path ./node_modules -prune -o -name '*.js' -print
```

`grep -RInw` is recursive, skips binary files, prints line numbers, and matches a whole word. `grep -rl` prints only the paths that contain a match. `find -mtime -1` matches files modified in the last day. `+100M` means larger than 100 MiB. `2>/dev/null` hides the permission errors that `find /` prints for directories you cannot read.

The `-prune` expression skips a directory. The `-print` has to sit on the right side of `-o`. Without it, `find` also prints the directory you meant to skip.

```bash
find . -name '*.txt' -print0 | xargs -0 grep -l TODO
```

`-print0` and `xargs -0` keep filenames that contain spaces in one piece.

## Archives

```bash
tar -czf archive.tar.gz directory
tar -cjf archive.tar.bz2 directory
tar -cJf archive.tar.xz directory
tar -tzf archive.tar.gz
tar -xzf archive.tar.gz -C /opt
```

`-c` creates, `-x` extracts, `-t` lists, `-f` is the archive name and must be followed by that name. `-z` is gzip, `-j` is bzip2, `-J` is xz. `-C /opt` extracts into that directory instead of the current one.

## Slice and count text

```bash
sed -n '10,20p' file
sed -i.bak 's/old/new/g' file
awk -F: '{print $1}' /etc/passwd
awk '$9 ~ /^5[0-9][0-9]$/' access.log | wc -l
sort access.log | uniq -c | sort -rn | head
cut -d, -f2 data.csv
grep -Ev '^\s*(#|$)' /etc/ssh/sshd_config
```

`sed -n '10,20p'` prints that line range and nothing else. `sed -i.bak` edits in place and keeps `file.bak`. GNU sed allows `-i` with no suffix; macOS sed does not, as noted under [shell habits](/cheatsheets/linux/shell/).

`awk -F:` splits on colons, so `$1` of `/etc/passwd` is the username. In a combined access log the status code is field 9 only when the request line is three words (`GET /path HTTP/1.1`). The regex keeps real 5xx codes and skips a misaligned field. `sort | uniq -c | sort -rn` counts repeated lines and puts the most common first. `cut -d, -f2` is the second comma-separated field.

`grep -Ev` drops blank lines and lines whose first non-space character is `#`. It does not strip a comment that follows a setting.

```bash
jq -r '.items[].metadata.name'
```

`jq` is not in a minimal RHEL install. `sudo dnf install -y jq` adds it. `-r` prints raw strings instead of JSON quotes. That filter walks a Kubernetes list and prints each object's name. Pipe a file or `oc get pods -o json` into it.

> `cut` does not understand quotes. A CSV field that contains a comma splits in the wrong place. Use a real parser for those files.
