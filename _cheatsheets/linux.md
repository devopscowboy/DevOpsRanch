---
title: Linux and Bash
description: Files, processes, disks, systemd, and the shell habits that keep a host understandable.
tags:
  - Linux
  - Bash
---

These are GNU/Linux commands, the set you get on most servers. macOS uses different flags for a few of them; the one that bites people is called out below.

## Where you are

```bash
pwd
ls -lah
cd -
whoami
id
uname -a
cat /etc/os-release
```

`ls -lah` is long form, including dotfiles, with human sizes. `cd -` returns to the previous directory.

## Files and directories

```bash
mkdir -p project/src
cp -a source dest
mv oldpath newpath
rm file
rm -r directory
```

`cp -a` preserves permissions, times, and links. `mkdir -p` creates parents and does not complain if the directory exists.

> `rm` does not go to a trash directory. In a script, refuse an empty path so a blank variable cannot turn the command into a delete of `/`: `rm -rf -- "${dir:?}/subdir"`. The `:?` stops the shell when `dir` is unset or empty.

## Read a file

```bash
less /var/log/syslog
head -n 20 file
tail -n 50 -f /var/log/syslog
wc -l file
```

`less` is the pager: `/pattern` searches, `n` finds the next hit, `q` quits. `tail -f` follows new lines. Add `--retry` (`tail -F`) when the file is rotated and recreated.

## Search

```bash
grep -RIn --exclude-dir=.git "pattern" .
find . -name '*.log' -mtime -1
```

`grep -RIn` is recursive, skips binary files, and prints line numbers. `find -mtime -1` matches files modified in the last day.

```bash
find . -name '*.txt' -print0 | xargs -0 grep -l TODO
```

`-print0` and `xargs -0` keep filenames that contain spaces in one piece.

## Permissions

```bash
chmod 644 file.txt
chmod 755 script.sh
chmod -R g+rX directory
chown user:group file
```

The digits are read=4, write=2, execute=1, summed for owner, group, and everyone else. `644` is `rw-r--r--`. `755` is `rwxr-xr-x`.

Capital `X` adds execute only on directories and on files that are already executable, which is what you want for a recursive group grant. `chown` needs root or the capability to change ownership.

## Processes and ports

```bash
ps aux
ss -lntp
kill PID
```

`ss -lntp` lists listening TCP ports and, when you have permission, the process that owns each one. Run it with `sudo` if the process column is blank.

`kill` sends `SIGTERM`, which lets the process shut down. `kill -9 PID` sends `SIGKILL`, which cannot be caught. Try `SIGTERM` first.

## Disk and memory

```bash
df -h
du -xh -d 1 .
free -h
```

`df -h` is free space by filesystem. `du -xh -d 1 .` is the size of each child of the current directory, staying on one filesystem. `free -h` is memory; the `available` column is the one that answers "can this box take more work?"

## Archives

```bash
tar -czf archive.tar.gz directory
tar -tzf archive.tar.gz
tar -xzf archive.tar.gz
```

`-c` creates, `-x` extracts, `-t` lists, `-z` is gzip, `-f` is the archive name and must be followed by that name.

## Packages

```bash
sudo apt-get update && sudo apt-get install -y nginx
sudo dnf install -y nginx
```

Debian and Ubuntu use `apt-get`. Fedora, RHEL, and Amazon Linux 2023 use `dnf`. Amazon Linux 2 still uses `yum`.

## Networking

```bash
ip -br addr
curl -fsSL https://example.com
curl -I https://example.com
dig +short example.com
```

`curl -f` fails on HTTP errors, `-sS` stays quiet except for real errors, and `-L` follows redirects. `-I` fetches headers only.

## systemd

```bash
systemctl status nginx
sudo systemctl restart nginx
journalctl -u nginx -n 100 --no-pager
journalctl -u nginx -f
```

`status` shows whether the unit is running and the last few log lines. `journalctl -u` is the full log for that unit. `--no-pager` matters in scripts, where an interactive pager would hang.

## Shell habits

```bash
set -euo pipefail
```

In a script, `-e` exits on a failed command, `-u` errors on an unset variable, and `pipefail` makes a pipeline fail when any stage fails. `-e` does not fire inside an `if` test, which is what you want.

```bash
cmd > out.txt
cmd >> out.txt
cmd 2> err.txt
cmd > all.txt 2>&1
cmd | tee all.txt
echo $?
```

`$?` is the exit status of the last command. `0` is success.

```bash
export AWS_PROFILE=dev
```

On macOS, in-place `sed` needs a backup suffix argument, and an empty suffix still has to be present: `sed -i '' 's/foo/bar/' file`. GNU sed on Linux accepts `sed -i 's/foo/bar/' file`.
