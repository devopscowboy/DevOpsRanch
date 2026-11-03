---
title: Logs and the Journal
description: journalctl and the text logs RHEL keeps under /var/log.
tags:
  - Linux
  - Bash
  - RHCSA
updated: 2026-11-03
section: linux
parent: linux
order: 11
---

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

> A host that has never had `/var/log/journal` loses this boot's journal on the next reboot. `tail -f /var/log/secure` is the text copy of SSH and sudo on RHEL.
