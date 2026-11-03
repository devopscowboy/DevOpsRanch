---
title: Networking
description: Addresses, NetworkManager, firewalld, and port checks.
tags:
  - Linux
  - Bash
  - RHCSA
updated: 2026-11-02
section: linux
parent: linux
order: 7
---

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
nc -zv db.internal 5432
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

The `bash -c` line is the RHEL port check. It needs no extra package. A successful `/dev/tcp` open exits 0, and `timeout` keeps a filtered port from hanging the shell. `nc -zv` is the Ubuntu and Debian check. Their `nc` is netcat-openbsd, and `-z` only scans for a listening daemon without sending data (`-v` prints the result). RHEL's `nc` is nmap-ncat and has no `-z`.

`curl -f` fails on HTTP errors, `-sS` stays quiet except for real errors, and `-L` follows redirects. `-I` fetches headers only. The `-w` form prints only the status code.

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
