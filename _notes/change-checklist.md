---
title: Change checklist
description: What to confirm before, during, and after a production change.
tags:
  - notes
---

This is a note, not a cheat sheet. The sheets are the commands. This is the order to use them in when something in production is about to change.

## Before

Name the change in one sentence, including what "done" means and how you would know it failed. If you cannot write the rollback, you are not ready to start.

Confirm you are pointed at the right place. The copy button on the block below pastes all three checks.

```bash
kubectl config current-context
aws sts get-caller-identity
git status
```

`git status` should be clean, or the dirty files should be ones you mean to ship. `get-caller-identity` is the account and role, which matters more than which profile name you think you exported.

- The pull request or plan is the thing you are about to apply, not a stale one.
- Someone else can see the change, or you have written down that you are doing it alone.
- You know which dashboard or log group will show the effect.

## During

Change one thing. If you are also "while I'm here" editing a second system, you will not know which one broke.

For Terraform, save the plan and apply that file so the apply cannot drift from what you read:

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

For Kubernetes, `kubectl diff -f` before `kubectl apply -f`. Watch `kubectl rollout status` until it finishes, and do not start the next change while a rollout is still in progress.

## After

Look at the signal you named before you started, not at a new one you found afterward. If it is bad, roll back before investigating the interesting part.

- Terraform: `terraform apply -replace` is for a broken resource. A bad apply of a config change is a revert of the config and another plan, not a hand edit in the console.
- Kubernetes: `kubectl rollout undo deploy/NAME -n prod` returns to the previous revision.
- Leave a line in the note for next time: what surprised you, and which command answered it.
