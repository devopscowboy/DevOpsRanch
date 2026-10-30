---
title: Linux and Bash
description: Files, users, storage, systemd, and the RHEL admin tasks that keep a host understandable.
tags:
  - Linux
  - Bash
  - RHCSA
updated: 2026-10-30
---

These are GNU/Linux commands for RHEL 7, 8, and 9. Where a release differs, the RHEL 9 command is labeled and the older one sits under it. macOS and Debian differ on a few flags; those differences are called out next to the command. The same jobs done with a playbook are on the [Ansible sheet](/cheatsheets/ansible/).

Verified against the RHEL 7 System Administrator's Guide (yum, networking, chrony, ntpd, systemd) and Security Guide (iptables), the RHEL 8 basic system settings and firewalld docs, and the RHEL 9 product documentation for firewalld, SELinux, parted, LVM, and basic system settings.

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

`ls -lah` is long form, including dotfiles, with human sizes. `cd -` returns to the previous directory. `id` shows the uid, the primary group, and every supplementary group.

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

On RHEL, general system messages go to `/var/log/messages` and SSH and sudo go to `/var/log/secure`. Debian uses `/var/log/syslog` and `/var/log/auth.log` for those. `less` is the pager: `/pattern` searches, `n` finds the next hit, `q` quits. `tail -f` follows new lines. Add `--retry` (`tail -F`) when the file is rotated and recreated. The journal, which is the other half of RHEL logging, is in [Logs and the journal](#logs-and-the-journal).

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

## Permissions

```bash
chmod 644 file.txt
chmod 755 script.sh
chmod -R u=rwX,go=rX directory
chmod g+s shared/
chmod +t /shared
chown user:group file
umask
umask 022
setfacl -m u:alice:rwx file
getfacl file
find dir -type d -exec chmod 755 {} +
```

The digits are read=4, write=2, execute=1, summed for owner, group, and everyone else. `644` is `rw-r--r--`. `755` is `rwxr-xr-x`.

Capital `X` adds execute only on directories and on files that are already executable, which is what you want for a recursive grant. `chmod -R u=rwX,go=rX` sets that in one pass. `chown` needs root or the capability to change ownership.

`chmod g+s` on a directory is setgid: new files and directories inherit the directory's group. `chmod +t` is the sticky bit: on a shared directory, only the file owner (or root) can delete a file. `umask` prints the mask subtracted from new files and directories. `022` produces `644` for files and `755` for directories. `002` produces `664` and `775`, which is the usual choice for a shared group.

`setfacl` and `getfacl` come from the `acl` package. `-m u:alice:rwx` grants one user without changing the unix mode everyone else sees. A default ACL, `setfacl -d -m u:alice:rwx dir`, copies onto new files created in that directory.

> `usermod -G` without `-a` replaces supplementary groups. That belongs with users, and it is the same kind of surprise as a recursive `chmod` that adds execute to every file. Prefer the capital `X` form above when the tree mixes files and directories.

## Processes and ports

```bash
ps aux
ps aux --sort=-%mem | head
ps aux --sort=-%cpu | head
ss -lntp
ss -tulpn
pgrep -a nginx
lsof -i :8080
top
kill PID
```

`ss -lntp` lists listening TCP ports and, when you have permission, the process that owns each one. `ss -tulpn` adds UDP. Run either with `sudo` if the process column is blank. `pgrep -a` prints the pid and the full command line. `lsof -i :8080` answers which process has that port open. In `top`, `P` sorts by CPU and `M` sorts by memory.

`kill` sends `SIGTERM`, which lets the process shut down. `kill -9 PID` sends `SIGKILL`, which cannot be caught. Try `SIGTERM` first.

## Disk and memory

```bash
df -h
df -i
du -xh -d 1 / | sort -h
lsblk -f
free -h
```

`df -h` is free space by filesystem. `df -i` is free inodes. A disk that is out of inodes looks full while `df -h` still shows free space, which happens when something has created millions of tiny files. `du -xh -d 1 /` is the size of each top-level directory, staying on one filesystem, and `sort -h` orders the human-readable sizes. `lsblk -f` adds filesystem type and UUID, which is what you copy into `/etc/fstab`. `free -h` is memory; the `available` column is the one that answers "can this box take more work?"

## Archives

```bash
tar -czf archive.tar.gz directory
tar -cjf archive.tar.bz2 directory
tar -cJf archive.tar.xz directory
tar -tzf archive.tar.gz
tar -xzf archive.tar.gz -C /opt
```

`-c` creates, `-x` extracts, `-t` lists, `-f` is the archive name and must be followed by that name. `-z` is gzip, `-j` is bzip2, `-J` is xz. `-C /opt` extracts into that directory instead of the current one.

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

## Networking

```bash
ip -br addr
nmcli device status
nmcli connection show
sudo nmcli connection modify "Wired connection 1" ipv4.method manual ipv4.addresses 10.0.0.20/24 ipv4.gateway 10.0.0.1 ipv4.dns 10.0.0.1
sudo nmcli connection up "Wired connection 1"
getent hosts api.internal
dig +short example.com
timeout 3 bash -c 'echo >/dev/tcp/db.internal/5432'
curl -fsSL https://example.com
curl -I https://example.com
curl -sS -o /dev/null -w '%{http_code}\n' https://example.com
```

`ip -br addr` is one line per interface. `nmcli` works on RHEL 7, 8, and 9 and stores the connection so it survives reboot. Replace the connection name with one from `nmcli connection show`. On RHEL 9, `nmcli` writes a keyfile under `/etc/NetworkManager/system-connections/`. `getent hosts` looks up a name the way an application does, including `/etc/hosts`. `dig` asks DNS only.

RHEL 7 and RHEL 8 also read ifcfg files. This is `/etc/sysconfig/network-scripts/ifcfg-enp1s0`. It is a file, not a shell command. The keys match the RHEL 7 networking guide, plus `GATEWAY` and `DNS1` from `nm-settings-ifcfg-rh(5)`, which that guide points at.

```text
DEVICE=enp1s0
BOOTPROTO=none
ONBOOT=yes
IPADDR=10.0.0.20
PREFIX=24
GATEWAY=10.0.0.1
DNS1=10.0.0.1
```

```bash
sudo ifup enp1s0
```

`ifup` and `ifdown` are the network-scripts commands. On RHEL 9 the ifcfg format is deprecated. Use `nmcli` there.

The `bash -c` line is a TCP port check that needs no extra package. RHEL 7, 8, and 9 ship `nc` as `ncat` from `nmap-ncat`, and that `ncat` has no `-z` scan flag, so `nc -zv host port` fails on all three. A successful `/dev/tcp` open exits 0. `timeout` keeps a filtered port from hanging the shell.

`curl -f` fails on HTTP errors, `-sS` stays quiet except for real errors, and `-L` follows redirects. `-I` fetches headers only. The `-w` form prints only the status code.

## systemd

```bash
systemctl status nginx
sudo systemctl enable --now nginx
sudo systemctl reload nginx
sudo systemctl restart nginx
sudo systemctl daemon-reload
systemctl --failed
sudo systemctl edit nginx
journalctl -u nginx -n 100 --no-pager
journalctl -u nginx -f
```

`enable --now` starts the unit and starts it again on the next boot. `reload` tells the process to reread its config when the unit supports `ExecReload`. `restart` tears the process down. `systemctl --failed` lists units that did not come up.

`systemctl edit nginx` writes a drop-in under `/etc/systemd/system/nginx.service.d/` and runs `daemon-reload` for you. A unit file you edited by hand still needs `sudo systemctl daemon-reload` before a restart will see it. `status` shows whether the unit is running and the last few log lines. `journalctl -u` is the full log for that unit. `--no-pager` matters in scripts, where an interactive pager would hang.

`enable --now` is the combined form. RHEL 7's System Administrator's Guide shows start and enable as two commands. `service` and `chkconfig` are the RHEL 6 wrappers. RHEL 7 still ships them, and they call systemctl. Prefer `systemctl` on RHEL 7, 8, and 9.

```bash
sudo systemctl start nginx
sudo systemctl enable nginx
service nginx status
sudo chkconfig nginx on
```

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

## Users, groups, and sudo

Creating the account is `useradd`. The same change as a playbook task is `ansible.builtin.user` on the [Ansible sheet](/cheatsheets/ansible/).

```bash
sudo useradd -m -s /bin/bash alice
sudo passwd alice
sudo usermod -aG wheel alice
sudo groupadd devs
sudo usermod -aG devs alice
sudo chage -M 90 -W 7 alice
sudo chage -l alice
```

`-m` creates the home directory and `-s` sets the login shell. On RHEL, membership in `wheel` is what `/etc/sudoers` turns into sudo. `-aG` appends a supplementary group.

`chage -M 90` sets the password lifetime to 90 days and `-W 7` warns 7 days ahead. `chage -l` prints the aging without changing it.

```bash
echo 'alice ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/alice
sudo chmod 440 /etc/sudoers.d/alice
sudo visudo -c -f /etc/sudoers.d/alice
```

A drop-in under `/etc/sudoers.d` beats editing `/etc/sudoers`. `visudo -c -f` parses that file before you log out. `NOPASSWD: ALL` is a lab grant. On a real host, replace `ALL` with the commands that account should run.

> `usermod -G devs alice` without `-a` removes alice from every other supplementary group, including `wheel`. sudo ignores files in `/etc/sudoers.d` whose names contain a `.` or end in `~`.

## SSH keys, tunnels, and file transfer

```bash
ssh-keygen -t ed25519 -C 'jesse@laptop'
ssh-copy-id alice@web01
ssh -J bastion alice@10.0.1.20
ssh -N -L 8443:localhost:443 alice@web01
scp app.tar.gz alice@web01:/tmp/
rsync -avz --progress site/ alice@web01:/var/www/site/
```

`ssh-keygen -t ed25519` writes `~/.ssh/id_ed25519` and the `.pub` file. `ssh-copy-id` appends the public key to `authorized_keys` on the host. `-J bastion` is `ProxyJump`: the connection goes through that host first. `-L 8443:localhost:443` opens port 8443 on your machine and forwards it to port 443 on the SSH server. `localhost` in that option is resolved on the server. `-N` does not start a remote shell, which is what you want for a tunnel you leave running.

`scp` copies one file. `rsync -a` preserves permissions and times, `-z` compresses, and `--progress` shows each file. The trailing slash on `site/` copies the contents of the directory. Without it, rsync copies the directory itself and you get `/var/www/site/site/`.

> sshd refuses the key when `~/.ssh` is not mode `700`, `authorized_keys` is not mode `600`, or the home directory is writable by the group. `StrictModes` checks all three.

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

`sed -n '10,20p'` prints that line range and nothing else. `sed -i.bak` edits in place and keeps `file.bak`. GNU sed allows `-i` with no suffix; macOS sed does not, as noted under shell habits.

`awk -F:` splits on colons, so `$1` of `/etc/passwd` is the username. In a combined access log the status code is field 9 only when the request line is three words (`GET /path HTTP/1.1`). The regex keeps real 5xx codes and skips a misaligned field. `sort | uniq -c | sort -rn` counts repeated lines and puts the most common first. `cut -d, -f2` is the second comma-separated field.

`grep -Ev` drops blank lines and lines whose first non-space character is `#`. It does not strip a comment that follows a setting.

```bash
jq -r '.items[].metadata.name'
```

`jq` is not in a minimal RHEL install. `sudo dnf install -y jq` adds it. `-r` prints raw strings instead of JSON quotes. That filter walks a Kubernetes list and prints each object's name. Pipe a file or `oc get pods -o json` into it.

> `cut` does not understand quotes. A CSV field that contains a comma splits in the wrong place. Use a real parser for those files.

## Logs and the journal

```bash
journalctl -b -p err
journalctl -u sshd --since '1 hour ago'
journalctl -xe
journalctl --list-boots
journalctl -b -1
sudo tail -f /var/log/secure
```

`-b` is this boot. `-p err` is priority err and everything more severe (crit, alert, emerg), not err alone. `-u sshd` is one unit, and `--since` takes phrases like `1 hour ago` and `yesterday`. `-x` adds the short explanation catalog and `-e` jumps to the newest entries, which is an interactive view. `--list-boots` shows the boots the journal still has, and `-b -1` is the previous one.

```bash
sudo mkdir -p /var/log/journal
sudo systemd-tmpfiles --create --prefix /var/log/journal
sudo systemctl restart systemd-journald
```

The default `Storage=auto` in `/etc/systemd/journald.conf` keeps the journal under `/run/log/journal`, which is gone after reboot, unless `/var/log/journal` exists. Creating that directory and restarting `systemd-journald` makes `auto` persist. Setting `Storage=persistent` in the config file does the same thing even if someone later removes the directory. Confirm with `journalctl -b -1` after the next reboot.

> A host that has never had `/var/log/journal` loses this boot's journal on the next reboot. `tail -f /var/log/secure` is the text copy of SSH and sudo on RHEL. Debian writes that stream to `/var/log/auth.log`.

## Scheduling and time

```bash
crontab -e
crontab -l
systemctl list-timers
timedatectl
timedatectl list-timezones
sudo timedatectl set-timezone America/Chicago
sudo timedatectl set-ntp true
chronyc sources -v
chronyc tracking
```

`crontab -e` edits the current user's crontab. The five fields are minute, hour, day of month, month, and day of week.

This crontab line runs the script every five minutes. It is a file line, not a shell command. cron's `PATH` is minimal, so the command and everything it calls should be absolute paths.

```text
*/5 * * * * /usr/local/bin/backup.sh
```

```bash
echo '/usr/local/bin/report.sh' | at now + 10 minutes
atq
```

`at` runs a command once. It comes from the `at` package, and `atd` has to be running. `atq` lists the queue. `systemctl list-timers` is the systemd equivalent of "what is scheduled", including the next run time.

`timedatectl` shows the clock, the timezone, and whether NTP is on. `set-ntp true` enables `chronyd`. `chronyd` is the default NTP client on RHEL 7, 8, and 9. In `chronyc sources`, the line marked `^*` is the source the clock is following. `chronyc tracking` shows the current offset.

RHEL 7 can run `ntpd` from the `ntp` package instead. RHEL 8 and 9 removed that package. Stop `chronyd` first, or both daemons fight over the clock. `ntpstat` is the status command in the RHEL 7 ntp chapter. `ntpq -p` is the peer list from `ntpq(8)`, which that chapter references. RHEL 8's migration table maps `ntpd` to `chronyd` and `ntpq` to `chronyc`.

```bash
sudo systemctl stop chronyd
sudo systemctl disable chronyd
sudo yum install -y ntp
sudo systemctl enable ntpd
sudo systemctl start ntpd
ntpstat
ntpq -p
```

> In a crontab, an unescaped `%` is a newline and the rest of the line becomes stdin for the command. Write `\%` when the command itself needs a percent sign.

## Firewall (firewalld)

```bash
sudo firewall-cmd --list-all
sudo firewall-cmd --get-services
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-all --permanent
```

`--list-all` is the running zone: services, ports, and rich rules. `--get-services` prints the names `--add-service` accepts, including `http` and `https`. `--permanent` writes the on-disk config and does not change the running firewall. `--reload` replaces the running config with the permanent one.

The other order is to test a runtime change and then save it:

```bash
sudo firewall-cmd --add-service=http
sudo firewall-cmd --runtime-to-permanent
```

`firewalld` is the default firewall on RHEL 7, 8, and 9. The commands above are the same on all three.

RHEL 7's other firewall is the `iptables` service from `iptables-services`. RHEL 8 still has that package, and its docs say to run only one of `firewalld`, `nftables`, or `iptables`. The rules file is `/etc/sysconfig/iptables`.

```bash
sudo systemctl disable firewalld
sudo systemctl stop firewalld
sudo yum install -y iptables-services
sudo systemctl enable iptables
sudo systemctl start iptables
sudo iptables -L -n -v
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables-save | sudo tee /etc/sysconfig/iptables
sudo service iptables save
```

`service iptables save` is the RHEL 7 service action. It writes the same `/etc/sysconfig/iptables` file. `dnf install iptables-services` is the RHEL 8 package command.

On Ubuntu the matching tool is `ufw`:

```bash
sudo ufw allow 80/tcp
```

> A firewalld rule without `--permanent` disappears at the next reload. A `--permanent` rule does nothing to current traffic until you reload. After either change, check `--list-all` and a connection from outside the host, not only from localhost. Do not run the `iptables` service and `firewalld` on the same host. RHEL 8 says the firewall services influence each other, so run only one.

## SELinux

Install `semanage` before the `semanage` lines. RHEL 8 and 9: `policycoreutils-python-utils`. RHEL 7: `policycoreutils-python`.

```bash
getenforce
sudo setenforce 0
sudo setenforce 1
ls -Z /var/www/html
ps -eZ | grep httpd
sudo semanage fcontext -a -t httpd_sys_content_t '/web(/.*)?'
sudo restorecon -Rv /web
sudo semanage port -a -t http_port_t -p tcp 8081
sudo setsebool -P httpd_can_network_connect on
sudo ausearch -m AVC -ts recent
```

`getenforce` prints `Enforcing`, `Permissive`, or `Disabled`. `setenforce 0` is permissive until reboot, and only while SELinux is enabled. It does not turn a disabled system on. The lasting switch is `SELINUX=` in `/etc/selinux/config`, and moving between `disabled` and `enforcing` needs a reboot.

`ls -Z` is the file context. `ps -eZ` is the process context. `semanage fcontext -a` records the default label for a path. The `(/.*)?` regex is the directory and everything under it. `restorecon` applies that record to the files. If the path already has a record, `-a` fails and `-m` updates it. The same rule applies to `semanage port`.

`setsebool -P` flips a boolean and keeps it across reboot. `-P` rebuilds policy, so it takes longer than a plain `setsebool`. `ausearch -m AVC -ts recent` shows denials from the last 10 minutes. Fix the denial with `semanage` and `restorecon`, then turn enforcing back on.

> `chcon` labels a file immediately and is forgotten the next time the filesystem is relabeled. `mv` keeps the source file's context, so a file moved into `/var/www/html` can still be `user_home_t`. `cp` creates a new inode and picks up the destination's default. Record the label with `semanage fcontext`, then run `restorecon`.

## Storage, LVM, and mounts

`lsblk -f` is the map of disks, filesystems, and UUIDs. `parted` below destroys what is already on `/dev/sdb`.

RHEL 9, and any GPT disk. The partition needs a name. `mkpart` does not format anything. `mkfs.xfs` does.

```bash
lsblk -f
sudo parted --script /dev/sdb mklabel gpt mkpart data xfs 1MiB 100%
sudo udevadm settle
```

Older hosts, and any MBR disk. `primary` is the MBR partition type. RHEL's parted rejects it as the type on GPT, on RHEL 7, 8, and 9 alike. Use it only after `mklabel msdos`.

```bash
sudo parted --script /dev/sdb mklabel msdos mkpart primary xfs 1MiB 10GiB
sudo udevadm settle
```

```bash
sudo pvcreate /dev/sdb1
sudo vgcreate vgdata /dev/sdb1
sudo lvcreate -n lvapp -L 5G vgdata
sudo mkfs.xfs /dev/vgdata/lvapp
sudo blkid /dev/vgdata/lvapp
```

`udevadm settle` waits until `/dev/sdb1` exists. A whole disk can be a physical volume with `pvcreate /dev/sdb` when you do not need a partition table. RHEL's LVM guide uses that form.

Paste this into `/etc/fstab`. It is a file line, not a shell command. The UUID comes from `blkid`. The last two fields are dump and fsck pass. XFS uses `0 0`.

```text
UUID=11111111-2222-3333-4444-555555555555 /app xfs defaults 0 0
```

```bash
sudo systemctl daemon-reload
sudo findmnt --verify --verbose
sudo mount -a
sudo lvextend -r -L +2G /dev/vgdata/lvapp
```

`daemon-reload` rebuilds the mount units from fstab. On RHEL 8 and 9, `findmnt --verify` checks the file before a reboot. The RHEL 7 storage guide does not document that flag. Use `sudo mount -fav` there: `-f` fakes the mount, `-a` reads fstab, `-v` prints what it would do. `mount -a` mounts what is not mounted yet. `lvextend -r` grows the logical volume and the filesystem together. `+2G` adds two gigabytes. Without the plus sign, `-L 2G` sets the size to two gigabytes. XFS can grow only while it is mounted, which `lvextend -r` requires.

Swap is a logical volume plus an fstab line. `swapon -a` enables only the swap devices listed in fstab, so the device has to be turned on by path until that line exists.

```bash
sudo lvcreate -n lvswap -L 2G vgdata
sudo mkswap /dev/vgdata/lvswap
sudo swapon /dev/vgdata/lvswap
```

The matching `/etc/fstab` line, after you replace the UUID from `blkid`:

```text
UUID=11111111-2222-3333-4444-555555555555 none swap defaults 0 0
```

NFS needs `nfs-utils`. `_netdev` tells boot to wait until the network is up.

```bash
sudo dnf install -y nfs-utils
sudo mount -t nfs nfs01:/exports/share /mnt/share
```

The matching `/etc/fstab` line:

```text
nfs01:/exports/share /mnt/share nfs defaults,_netdev 0 0
```

> XFS grows and never shrinks. A bad fstab line drops the host into emergency mode on the next boot. On RHEL 8 and 9 run `findmnt --verify` first. On RHEL 7 run `mount -fav`.

## Boot targets and recovery

```bash
systemctl get-default
sudo systemctl set-default multi-user.target
sudo systemctl isolate rescue.target
sudo grubby --default-kernel
sudo grubby --update-kernel=ALL --args='console=ttyS0'
sudo grubby --update-kernel=ALL --remove-args='console=ttyS0'
```

`get-default` prints the target the host boots to. `multi-user.target` is text mode. `graphical.target` is the desktop. `isolate rescue.target` switches the running system to rescue, and it asks for the root password. `grubby --default-kernel` is the kernel that boots next. `--args` appends a kernel argument on every installed kernel. `--remove-args` takes it back off.

Resetting a forgotten root password is a GRUB edit, then the same shell on every release. `passwd` with no user sets the root password inside the chroot. `/.autorelabel` makes SELinux relabel on the next boot, which restores the context on `/etc/shadow`. The relabel can take a long time and the host reboots itself when it finishes.

RHEL 7 and RHEL 8: on the GRUB menu, press `e` on the default kernel. Append `rd.break` to the end of the kernel line. On RHEL 7 that line starts with `linux16`. On RHEL 8 it starts with `linux`. Press `Ctrl+x`. The prompt is `switch_root`.

```bash
mount -o remount,rw /sysroot
chroot /sysroot
passwd
touch /.autorelabel
exit
exit
```

RHEL 8's kernel documentation also remounts `/` read-only before you leave the chroot: `mount -o remount,ro /`, then the two exits. RHEL 7's procedure stops at `touch /.autorelabel` and the exits.

RHEL 9: the default kernel entry often asks for the root password you do not have (the `rd.break` break asks for maintenance credentials). Select the rescue kernel, the menu line with `rescue` in the name, press `e`, append `rd.break` to the line that starts with `linux`, and press `Ctrl+x`. If a maintenance prompt appears, press Enter. Then run the same four commands and the two exits.

## Performance and tuning

```bash
uptime
vmstat 1 5
ps aux --sort=-%mem | head
nice -n 10 ./batch.sh
sudo renice -n 5 -p 4321
pkill -f 'python worker.py'
tuned-adm active
sudo tuned-adm recommend
sudo tuned-adm profile throughput-performance
```

`uptime` prints load averages over 1, 5, and 15 minutes. Load is a count of runnable work, not a percentage. A load of 4 on a 4-CPU host is a busy machine, not a 4% one. `vmstat 1 5` samples CPU, memory, swap, and IO once a second, five times. The first line is the average since boot. Read the lines after it.

`nice -n 10` starts a process with nice 10. The range is -20 (most CPU) to 19 (least). On RHEL, `renice -n 5 -p 4321` sets that process's nice value to 5. It does not add 5 to the current value. Only root can lower a nice value. `pkill -f` matches the full command line, so make the pattern specific enough that it does not match the shell you typed it in.

`tuned` is the RHEL tuning daemon. `active` is the profile in use, `recommend` is the one tuned would pick for this hardware, and `profile` applies one. Common names are `throughput-performance`, `latency-performance`, and `virtual-guest`.

## Find it yourself

```bash
man -k partition
man 5 crontab
man 8 firewall-cmd
ls /usr/share/doc
systemctl --help
```

`man -k` searches page titles and summaries. Section 1 is user commands, section 5 is file formats (`man 5 crontab`, `man 5 fstab`, `man 5 sudoers`), and section 8 is administration commands. `/usr/share/doc` is the documentation installed with packages. Any command's `--help` is the short flag list. `tldr tar` is example-first help, and it is not part of RHEL. Install it only on a machine where you are allowed to add tools.

> Red Hat exams allow the product documentation on the system and disallow personal notes. `man -k`, `man 5`, and `/usr/share/doc` are the habit those exams grade.

## A service will not start

Work down the list. Stop at the first answer that names the fault.

```bash
systemctl status app
journalctl -u app -b -n 50 --no-pager
```

`status` has the exit code and the last log lines. `journalctl -u` is the rest of this boot.

```bash
nginx -t
sshd -t
httpd -t
sudo ss -tulpn | grep ':80'
sudo ausearch -m AVC -ts recent
sudo firewall-cmd --list-all
sudo systemctl daemon-reload
sudo systemctl restart app
```

Use the daemon's own config test when it has one. `ss` shows whether another process already has the port. An AVC on a new path or a new port is an SELinux label or port type, which `semanage` and `restorecon` fix. A service that is running on the host and unreachable from outside is usually the firewall. `daemon-reload` belongs after a unit file edit, before the restart.
