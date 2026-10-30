---
title: Ansible
description: Navigator, ad-hoc commands, playbooks, inventory, vault, and the checks to run when a play fails.
tags:
  - Ansible
  - Automation
  - RHCE
updated: 2026-10-30
---

EX294 on RHEL 9 is Ansible automation of the RHCSA tasks: packages, services, firewalld, filesystems, users, and scheduled jobs. Run playbooks with `ansible-navigator` and with `ansible-playbook`. Use fully qualified module names (`ansible.builtin.copy`). The Linux commands those modules replace are on the [Linux sheet](/cheatsheets/linux/). Clone and commit, which the exam also asks for, are on the [Git sheet](/cheatsheets/git/).

Verified against ansible-core 2.16.3 (`ansible-playbook -J`, `ansible-config init --disabled`, `ansible-inventory --graph`), the current ansible-navigator and `ansible.builtin.default` callback docs, and the RHEL 7, 8, and 9 package-manager docs for `yum` and `dnf`. Navigator's own subcommands were checked from those docs.

## Check your setup

```bash
ansible --version
ansible-config dump --only-changed
ansible-config init --disabled > ansible.cfg
ansible-inventory -i inventory --graph
ansible-inventory -i inventory --host web1
ansible all -i inventory -m ansible.builtin.ping
```

`ansible --version` prints the core version and the config file it loaded. `dump --only-changed` is the settings that differ from the defaults. `init --disabled` writes a starter `ansible.cfg` with every option commented out. `--graph` is the group tree. `--host web1` is the variables that one host ends up with, after group vars and host vars merge.

`ansible.builtin.ping` is not ICMP. It connects over SSH and runs a tiny Python module. Success means the inventory, the user, and the remote Python all work.

Config is read from `ANSIBLE_CONFIG`, then `./ansible.cfg`, then `~/.ansible.cfg`, then `/etc/ansible/ansible.cfg`. The first one found wins.

> Ansible ignores `./ansible.cfg` when the working directory is world-writable. The warning is easy to miss, and the run then uses `~/.ansible.cfg` or the system file instead.

## ansible-navigator

Navigator runs the playbook inside an execution environment container. That is the EX294 path. `-m stdout` prints a normal playbook log instead of the text UI. Interactive mode is the default.

```bash
ansible-navigator run site.yml -i inventory -m stdout
ansible-navigator run site.yml -i inventory -m stdout --check --diff --limit web1
ansible-navigator collections
ansible-navigator doc ansible.posix.firewalld -m stdout
ansible-navigator inventory -i inventory --graph -m stdout
ansible-navigator images
ansible-navigator settings --effective
```

`run` accepts the same `-i`, `-e`, `--limit`, `--tags`, `--check`, and `--diff` flags as `ansible-playbook`. `doc` reads module documentation from inside the execution environment, which is the copy you should trust when the controller and the image disagree. `images` lists execution environment images on the local container engine. `settings --effective` merges the defaults, `ansible-navigator.yml`, the environment, and the command line.

Navigator looks for `./ansible-navigator.yml` (no leading dot) and `~/.ansible-navigator.yml` (with a leading dot). A playbook run writes a `site-artifact-*.json` file next to the playbook unless artifact creation is turned off. `ansible-navigator replay <artifact>` opens that file later.

A play that prompts (`vars_prompt`, `pause`, `--ask-pass`) hangs in the default mode. Add `--enable-prompts`, which forces stdout mode and turns artifact creation off:

```bash
ansible-navigator run site.yml -i inventory --enable-prompts --ask-pass
```

> The exam image expects the execution environment. `--execution-environment false` runs with the controller's own Ansible, which is the wrong tool when the task says to use navigator.

## Inventory

An INI inventory is enough for a static lab.

```ini
[web]
web1 ansible_host=10.0.0.11 ansible_user=deploy
web[01:03].example.com

[prod:children]
web
```

`web[01:03].example.com` expands to three hosts. `[prod:children]` is a group of groups. Connection variables can live on the host line or in files next to the inventory: `group_vars/web.yml` and `host_vars/web1.yml`.

RHEL 8 and 9 have no `/usr/bin/python`. Point the interpreter at Python 3:

```ini
ansible_python_interpreter=/usr/bin/python3
```

RHEL 7's platform Python is `/usr/bin/python` (2.7). Leave the variable unset there when the controller still accepts it. ansible-core 2.16 deprecates Python 2.7 on targets, and 2.17 removes it. A newer controller needs Python 3 installed on the RHEL 7 host and this variable pointed at that binary.

## Ad-hoc commands

```bash
ansible web -i inventory -a 'uptime'
ansible web -i inventory -m ansible.builtin.shell -a 'df -h | grep /var'
ansible web -i inventory -b -m ansible.builtin.dnf -a 'name=httpd state=present'
ansible web -i inventory -b -m ansible.builtin.yum -a 'name=httpd state=present'
ansible web -i inventory -b -m ansible.builtin.service -a 'name=httpd state=started enabled=true'
ansible web -i inventory -b -m ansible.builtin.copy -a 'src=motd dest=/etc/motd'
ansible web -i inventory -m ansible.builtin.setup -a 'filter=ansible_distribution*'
```

The default module is `ansible.builtin.command`, which does not pass the line through a shell. Pipes and redirects need `ansible.builtin.shell`. `-b` is become (sudo on RHEL). `ansible.builtin.dnf` is the RHEL 8 and 9 package module. `ansible.builtin.yum` is the RHEL 7 module. `ansible.builtin.package` picks the manager for the host if you would rather not name it. `setup` with a filter returns a slice of facts instead of the whole tree.

> `command` and `shell` are the last resort. They report `changed` on every run unless you set `changed_when`. A module knows when the system was already in the requested state.

## Run a playbook

Navigator is the command above. These are the same flags on `ansible-playbook`, which the exam also accepts.

```bash
ansible-playbook site.yml -i inventory --syntax-check
ansible-playbook site.yml -i inventory --check --diff --limit web1
ansible-playbook site.yml -i inventory --list-hosts --list-tasks
ansible-playbook site.yml -i inventory -e 'app_version=1.4.2'
ansible-playbook site.yml -i inventory -e @vars/prod.yml
ansible-playbook site.yml -i inventory --tags config --skip-tags restart
ansible-playbook site.yml -i inventory --start-at-task 'Install packages'
ansible-playbook site.yml -i inventory --step
ansible-playbook site.yml -i inventory -b -K
ansible-playbook site.yml -i inventory -vvv -f 20
```

`--syntax-check` parses the playbook and does not connect. `--check` is a dry run and `--diff` prints the file changes it would have made. `--limit web1` restricts the hosts. Check the limit with `--list-hosts` before a real run.

`-e` sets extra vars, which beat every other source. `-e @file` reads them from a file. `--tags` and `--skip-tags` select tasks. `--start-at-task` begins at a task name and skips earlier tasks in that play, so a task that registered a variable earlier will not have it. `--step` asks before each task. `-K` prompts for the become password. `-f 20` is twenty forks. `-vvv` shows the SSH command and the module arguments.

> Check mode cannot see the future. A task that decides `when` from a `register` of an earlier task in the same run will not behave the way it does for real. Run the playbook twice after a change. A second run that still reports `changed` is not idempotent.

## Modules by task

Install `ansible.posix` and `community.general` before the modules that are not in `ansible.builtin`. The install commands are under [Roles and collections](#roles-and-collections).

- Packages and repos: `ansible.builtin.dnf` on RHEL 8 and 9, `ansible.builtin.yum` on RHEL 7, `ansible.builtin.package` when the play targets both. `ansible.builtin.yum_repository` writes the repo file on either generation.
- Services: `ansible.builtin.service` follows the host's service manager, which is systemd on RHEL 7, 8, and 9. `ansible.builtin.systemd_service` is the systemd module (`ansible.builtin.systemd` is the old name).
- Firewall: `ansible.posix.firewalld` on RHEL 7, 8, and 9, with `permanent: true` and `immediate: true`. Permanent without immediate is the same trap as `firewall-cmd --permanent` without a reload. `ansible.builtin.iptables` matches the older `iptables` service. Do not manage the same host with both.
- Users, groups, keys: `ansible.builtin.user`, `ansible.builtin.group`, `ansible.posix.authorized_key`.
- Files: `ansible.builtin.copy` and `ansible.builtin.template` for a Jinja file. `ansible.builtin.lineinfile` edits one line. `ansible.builtin.blockinfile` edits a marked block. `ansible.builtin.file` creates directories (`state: directory`), symlinks, and deletions (`state: absent`).
- Storage: `community.general.parted`, `community.general.lvg`, `community.general.lvol`, `community.general.filesystem`, and `ansible.posix.mount` for fstab.
- Time: `ansible.builtin.cron`.
- Archives: `community.general.archive` and `ansible.builtin.unarchive`.
- SELinux: `ansible.posix.selinux`, `ansible.posix.seboolean`, `community.general.sefcontext`.
- HTTP and waits: `ansible.builtin.get_url`, `ansible.builtin.uri`, `ansible.builtin.stat`, `ansible.builtin.wait_for`.
- Last resort: `ansible.builtin.command` or `ansible.builtin.shell`, with `changed_when`.

`ansible-navigator doc <module> -m stdout` prints the arguments for whichever of these you have not used in a while. `ansible-doc -s ansible.builtin.user` prints a snippet you can paste.

## Variables, facts, loops, conditions

{% raw %}
```yaml
- ansible.builtin.debug:
    msg: "{{ ansible_facts['distribution'] }}"
  when: ansible_facts['os_family'] == 'RedHat'
- ansible.builtin.command: hostname
  register: out
  changed_when: false
- ansible.builtin.debug:
    var: out.stdout_lines
- ansible.builtin.user:
    name: "{{ item.name }}"
    groups: "{{ item.groups | default([]) }}"
  loop: "{{ users }}"
```
{% endraw %}

`ansible_facts['distribution']` is a fact from the setup module, which runs automatically at the start of a play unless `gather_facts: false`. `register` saves the module result. `when` skips the task. `loop` runs the task once per item. `default` supplies a value when the variable is undefined. Quote any YAML value that starts with {% raw %}`{{`{% endraw %}.

{% raw %}
```yaml
"{{ hostvars['db1']['ansible_facts']['default_ipv4']['address'] }}"
"{{ groups['web'] }}"
"{{ inventory_hostname }}"
```
{% endraw %}

`hostvars` reads another host's facts. `groups` and `inventory_hostname` are magic variables.

> A bare {% raw %}`msg: {{ ansible_facts['distribution'] }}`{% endraw %} is a YAML parse error. The brace starts a flow mapping. Quote it.

## Errors and debugging

```yaml
- name: Try the deploy
  block:
    - ansible.builtin.command: /usr/local/bin/deploy
      register: out
      changed_when: "'updated' in out.stdout"
      failed_when: "'ERROR' in out.stdout"
  rescue:
    - ansible.builtin.debug:
        msg: deploy failed
  always:
    - ansible.builtin.debug:
        msg: deploy finished
```

`block` / `rescue` / `always` is try, catch, and finally for a group of tasks. `failed_when` defines failure yourself. `changed_when: false` marks a read-only command as ok. `ignore_errors: true` continues past a failure and hides it from the play recap's failed count, which makes it a poor default. Prefer `failed_when` or `rescue`.

```yaml
debugger: on_failed
```

That task keyword drops into the debugger when the task fails.

```bash
ANSIBLE_CALLBACK_RESULT_FORMAT=yaml ansible-playbook site.yml -i inventory
ansible-doc -s ansible.builtin.user
ansible-lint site.yml
```

`ANSIBLE_CALLBACK_RESULT_FORMAT` is read by `ansible.builtin.default` on ansible-core 2.13 and newer. `yaml` is easier to read than the JSON blob. It is not a machine-readable YAML stream. The old `community.general.yaml` callback is deprecated in favor of this setting. `ansible-lint` is a separate package. It flags tasks that will never be idempotent.

## Vault

```bash
ansible-vault create secrets.yml
ansible-vault edit secrets.yml
ansible-vault view secrets.yml
ansible-vault encrypt vars.yml
ansible-vault decrypt vars.yml
ansible-vault rekey secrets.yml
ansible-vault encrypt_string 's3cret' --name 'db_password'
ansible-playbook site.yml -i inventory -J
ansible-playbook site.yml -i inventory --vault-password-file ~/.vault_pass
```

`create` and `edit` open an editor. `encrypt_string` prints one YAML key you can paste into a vars file. `-J` is `--ask-vault-pass`. `--vault-password-file` is the non-interactive form for CI. The file is a password, so keep it out of the repository. `rekey` changes the password on an existing file.

Navigator takes the same vault flags on `run`. A prompt needs `--enable-prompts` as well, or the run hangs.

## Roles and collections

```bash
ansible-galaxy role init roles/webserver
ansible-galaxy collection install ansible.posix community.general
ansible-galaxy collection install -r collections/requirements.yml
ansible-galaxy role install -r roles/requirements.yml -p roles
ansible-galaxy collection list
```

`role init` writes the standard skeleton: `tasks`, `handlers`, `templates`, `files`, `defaults`, `vars`, and `meta`. `collection install` without `-p` uses the collections path from `ansible.cfg`, or `~/.ansible/collections`. `ansible-navigator collections` shows what the execution environment can see, which can differ from `ansible-galaxy collection list` on the controller.

> Role `defaults/main.yml` is the easiest variable to override. Role `vars/main.yml` is hard to override. Put the knobs a caller should set in `defaults/`.

## A playbook fails

```bash
ansible all -i inventory -m ansible.builtin.ping
ansible-inventory -i inventory --graph
ansible-playbook site.yml -i inventory --syntax-check
ansible-playbook site.yml -i inventory -vvv --limit web1
```

`UNREACHABLE` is SSH, DNS, or the inventory. It is not a task failure. `--graph` shows whether the host is in the group the play targets. `--syntax-check` catches indentation and quoting. `-vvv` shows the SSH command and the module arguments.

Permission denied from a module that edits the system means the task needs `become: true` or the command needs `-b`. Add `-K` when sudo asks for a password. `/usr/bin/python: not found` on RHEL 8 or 9 means `ansible_python_interpreter=/usr/bin/python3` on that host. On RHEL 7 that path is the Python 2.7 interpreter, and the error means the controller no longer accepts it.

```bash
ansible-playbook site.yml -i inventory --start-at-task 'Install packages' --limit web1
ansible-playbook site.yml -i inventory --check --diff --limit web1
```

`--start-at-task` resumes at a named task. Finish with `--check --diff` so the fix changes only what you expect. Then run it once for real and once again. The second run should report `ok` and `skipped`, not `changed`.
