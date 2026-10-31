# DevOps Ranch

DevOps Ranch is a collection of DevOps cheat sheets and notes. The site is at [https://devopsranch.com](https://devopsranch.com).

## What's here

- Cheat sheets for commands and day-to-day reference
- Notes for checklists and write-ups

## Add a cheat sheet

Cheat sheets are Markdown files. Front matter sits between the `---` lines at the top of the file:

| Field | Required | What it does |
| --- | --- | --- |
| `title` | yes | Page heading and card title |
| `description` | yes | Card text, and it is part of search |
| `tags` | yes | YAML list. Every tag is a filter chip, and a tag may contain spaces |
| `updated` | no | Date (`2026-10-30`) shown on the page |

`tags` has to be a YAML list. A bare string will not filter correctly.

```yaml
---
title: Ansible
description: Playbooks, ad-hoc commands, and inventory.
tags:
  - Ansible
---
```

Notes use the same kind of front matter: `title`, `description`, and optional `tags` and `updated`.
