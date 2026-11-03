---
title: Linux and Bash
description: Files, users, storage, systemd, and the RHEL admin tasks that keep a host understandable.
tags:
  - Linux
  - Bash
  - RHCSA
updated: 2026-11-02
layout: section
section: linux
short_title: Linux
---

These are GNU/Linux commands for RHEL 7, 8, and 9. Where a release differs, the RHEL 9 command is labeled and the older one sits under it. macOS and Debian differ on a few flags; those differences are called out next to the command. The same jobs done with a playbook are on the [Ansible sheet](/cheatsheets/ansible/).

Verified against the RHEL 7 System Administrator's Guide (yum, networking, chrony, ntpd, systemd) and Security Guide (iptables), the RHEL 8 basic system settings and firewalld docs, and the RHEL 9 product documentation for firewalld, SELinux, parted, LVM, and basic system settings. `nc -zv` was checked against the netcat-openbsd man page on Ubuntu 24.04.
