---
title: Git
description: Status, commits, branches, history, and the safe ways to undo work.
tags:
  - Git
---

Commands assume Git 2.23 or newer, so `git switch` and `git restore` are available. `git checkout` still works if that is what your fingers know.

## Identity

Set the name and email recorded on commits for this machine.

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

See every value Git is actually using, and which file it came from.

```bash
git config --show-origin --show-scope --list
```

## See what changed

```bash
git status
git diff
git diff --staged
git diff --stat
```

`git diff` is the unstaged work. `git diff --staged` is what the next commit will contain.

Compare the current branch with the point it diverged from `main`. Three dots means "since the merge base," which is the diff a pull request shows.

```bash
git diff main...HEAD
git log main..HEAD --oneline
```

## Stage and commit

```bash
git add path/to/file
git add -p
git restore --staged path/to/file
git commit -m "Explain why this change exists"
```

`git add -p` walks the diff hunk by hunk. `git restore --staged` takes a file back out of the index and leaves the working copy alone.

`git add -A` stages every change in the repository, including deletions and files outside the current directory. `git add .` only stages the current directory and below.

```bash
git commit --amend --no-edit
```

> `--amend` rewrites the latest commit. Do not amend a commit that is already on a shared branch unless the people using that branch expect a force-push.

## Branches

```bash
git switch -c feature/short-name
git switch main
git switch -
git branch -vv
git branch -d feature/short-name
```

`git switch -` jumps back to the previous branch. `git branch -vv` shows the upstream and whether the branch is ahead or behind. `-d` refuses to delete a branch that is not merged; `-D` deletes it anyway.

The older spellings are `git checkout -b feature/short-name` and `git checkout main`.

## Remotes

```bash
git remote -v
git fetch origin
git pull --ff-only
git push -u origin HEAD
```

`--ff-only` refuses to create a merge commit when the branches have diverged. Fetch and rebase when you want your local commits replayed on top of the remote branch.

```bash
git fetch origin
git rebase origin/main
```

> Do not rebase commits that other people have already based work on. After rebasing a branch you already pushed, update the remote with `--force-with-lease`, not `--force`. The lease aborts if someone else pushed commits you have not fetched.

```bash
git push --force-with-lease
```

## History

```bash
git log --oneline --graph --decorate -20
git show HEAD
git blame path/to/file
git log -S 'functionName' --oneline -- path/to/file
```

`-S` is the pickaxe: it lists commits that changed the number of times that string appears. Useful when you know the identifier and not the date.

## Undo

```bash
git restore path/to/file
git revert HEAD
git reset --soft HEAD~1
```

`git restore` throws away unstaged edits in that file. It does not touch commits.

`git revert` writes a new commit that undoes an older one. That is the safe undo on a branch other people use.

`git reset` moves the branch pointer:

- `--soft` keeps the changes staged.
- `--mixed` (the default) keeps the changes unstaged.
- `--hard` drops the uncommitted work and the commits you step back over.

> `--hard` and `reset` of commits that are already pushed are history rewrites. Prefer `git revert` on shared branches.

## Stash

```bash
git stash push -m "WIP: parser edge case"
git stash list
git stash apply
git stash pop
```

`apply` keeps the stash entry. `pop` applies it and deletes the entry. `git stash save` is the old form of `push`; use `push`.

## Tags

```bash
git tag -a v1.4.0 -m "Release 1.4.0"
git push origin v1.4.0
git tag -d v1.4.0
```

Push the tag you mean to publish. `git push origin --tags` pushes every local tag, including ones you did not intend to share.
