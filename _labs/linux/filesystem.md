---
title: "Lab: The filesystem and absolute paths"
description: On a RHEL VM, prove you can read an absolute path and move with both absolute and relative paths.
slug: filesystem
parent: linux
section: linux
order: 1
module: Basics
number: "01"
tags:
  - Linux
  - RHCSA
updated: 2026-11-03
---

Do this on your own RHEL virtual machine, logged in as a normal user. The examples use the account `devopscowboy`. Wherever a path contains that name, use your username instead. Do not use a file manager.

{% include demo.html alt="Walking through absolute and relative paths on a RHEL virtual machine" %}

## The task

1. Print the absolute path of the directory you are in.
2. Change to `/etc` with an absolute path. Print the working directory again. The result has to be `/etc` no matter where you started.
3. Go to your home directory. Create the directory `projects/notes` there, including the parent `projects` if it does not exist yet. `mkdir -p` creates missing parents and is safe to run twice.
4. Move into `projects/notes` with a relative path. Print the absolute path of where you landed.
5. From there, change to `/var/log` with an absolute path, then return with `cd -`. Print the working directory. It has to be the `projects/notes` directory again.
6. Show that `/` and `/root` are two different directories. If listing `/root` says permission denied, that is the right result for a normal user. You still have to run the command.

## Check your work

Run these from the `projects/notes` directory. Read the output. Do not skip a line that errors. An error is part of the check for `/root`.

```bash
pwd
ls -ld / /root /etc ~/projects/notes
```

A correct result looks like this:

- `pwd` starts with `/home/` and ends with `/projects/notes`.
- `ls -ld /` starts with `d`, and the name at the end of the line is `/`.
- `ls -ld /etc` starts with `d`.
- `ls -ld /root` starts with `d` when you are allowed to see it, or prints `Permission denied` when you are a normal user.
- `ls -ld ~/projects/notes` starts with `d`. `~` here is your home, so this is the directory you created.

If `pwd` prints `/etc` or `/var/log`, `cd -` did not bring you back. Do step 5 again.

<details class="solution" markdown="block">
<summary>Solution</summary>

Use your own username. The commands below use `devopscowboy`.

Print the starting directory, then go to `/etc` by an absolute path and prove it.

```bash
pwd
cd /etc
pwd
```

The second `pwd` prints `/etc`.

Go home, create the directory, and enter it with a relative path. `cd` with no argument is home. `projects/notes` has no leading `/`, so it starts from home.

```bash
cd
mkdir -p projects/notes
cd projects/notes
pwd
```

`pwd` prints `/home/devopscowboy/projects/notes`.

Leave by an absolute path and come back. `cd -` returns to the directory you just left, and it prints that path.

```bash
cd /var/log
cd -
pwd
```

Show `/` and `/root` as different directories.

```bash
ls -ld / /root
```

`/` lists. `/root` lists only if you are root. As `devopscowboy` you should see `Permission denied` for `/root`, and a line starting with `d` for `/`.

The check from inside `projects/notes`:

```bash
pwd
ls -ld / /root /etc ~/projects/notes
```

</details>
