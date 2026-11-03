---
title: Users and Groups
description: Accounts, groups, sudo, and SSH keys.
tags:
  - Linux
  - Bash
  - RHCSA
updated: 2026-11-02
section: linux
parent: linux
order: 3
---

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
ssh-keygen -t ed25519 -C 'devopscowboy@laptop'
ssh-copy-id alice@web01
ssh -J bastion alice@10.0.1.20
ssh -N -L 8443:localhost:443 alice@web01
scp app.tar.gz alice@web01:/tmp/
rsync -avz --progress site/ alice@web01:/var/www/site/
```

`ssh-keygen -t ed25519` writes `~/.ssh/id_ed25519` and the `.pub` file. `ssh-copy-id` appends the public key to `authorized_keys` on the host. `-J bastion` is `ProxyJump`: the connection goes through that host first. `-L 8443:localhost:443` opens port 8443 on your machine and forwards it to port 443 on the SSH server. `localhost` in that option is resolved on the server. `-N` does not start a remote shell, which is what you want for a tunnel you leave running.

`scp` copies one file. `rsync -a` preserves permissions and times, `-z` compresses, and `--progress` shows each file. The trailing slash on `site/` copies the contents of the directory. Without it, rsync copies the directory itself and you get `/var/www/site/site/`.

> sshd refuses the key when `~/.ssh` is not mode `700`, `authorized_keys` is not mode `600`, or the home directory is writable by the group. `StrictModes` checks all three.
