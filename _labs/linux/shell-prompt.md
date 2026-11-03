---
title: "Lab: A shell prompt and the first commands"
description: On a RHEL VM, use whoami, pwd, ls, and cd without guessing which directory you are in.
slug: shell-prompt
parent: linux
section: linux
order: 2
module: Basics
number: "02"
tags:
  - Linux
  - RHCSA
updated: 2026-11-03
---

Do this on your own RHEL virtual machine, as a normal user. Use your username anywhere the example says `devopscowboy`. Stay in the shell. The `$` on your screen is the prompt. Do not type it.

This lab practices the commands from [A shell prompt and the first commands](/lessons/linux/shell-prompt/). Paths work the way [the filesystem lesson](/lessons/linux/filesystem/) describes.

{% include demo.html alt="Walking through whoami, pwd, ls, and cd on a RHEL virtual machine" %}

## The task

1. Print the user the shell is running as.
2. Print the absolute path of the current directory before you move.
3. Long-list `/tmp`. Find a line that starts with `d`. That character is how you know the name is a directory. Say the name out loud or write it down.
4. Change into `/tmp` with an absolute path. Print the working directory.
5. Without leaving `/tmp`, list the hidden names in your home directory.
6. Go up one directory with a relative path. Print the working directory. From `/tmp`, up one is `/`.
7. Go to your home directory using `~`. Then run `cd -` and print the working directory. You should be back on `/`, because that was the previous directory.
8. From `/`, go home by running `cd` with no path. Long-list that directory. Do not add `-h`. Sizes stay in bytes.

## Check your work

Run this after step 8. You should be in your home directory.

```bash
whoami
pwd
ls -ld /tmp / /home
```

A correct result looks like this:

- `whoami` prints your username, not `root`, unless you logged in as root on purpose.
- `pwd` is `/home/` plus that username.
- `ls -ld /tmp` starts with `d`.
- `ls -ld /` starts with `d` and the name is `/`.
- `ls -ld /home` starts with `d`.
- None of the `ls` commands in the lab used `-h`.

If step 7 left you somewhere else, `cd -` returned to whatever directory you were in before `cd ~`. Repeat step 6 so the previous directory is `/`, then do step 7 again.

<details class="solution" markdown="block">
<summary>Solution</summary>

Who you are, and where you are before any `cd`.

```bash
whoami
pwd
```

Long-list `/tmp` and read the first character. `d` is a directory. Then go there with an absolute path.

```bash
ls -l /tmp
cd /tmp
pwd
```

`pwd` prints `/tmp`.

Hidden names in home, while you are still in `/tmp`. `~` is your home, so this path does not depend on the working directory.

```bash
ls -a ~
```

You should see `.` and `..`, and names such as `.bashrc`.

Up one level. The path `..` is relative.

```bash
cd ..
pwd
```

`pwd` prints `/`.

Home, then back to the previous directory, which is `/`.

```bash
cd ~
cd -
pwd
```

`cd -` prints `/` and `pwd` prints `/`.

Go home again and long-list it. No `-h`.

```bash
cd
ls -l
```

The check:

```bash
whoami
pwd
ls -ld /tmp / /home
```

</details>
