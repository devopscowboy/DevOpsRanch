# DevOps Ranch

Personal cheat sheets and notes for [devopsranch.com](https://devopsranch.com). Every cheat sheet and every note is a Markdown file. GitHub Pages builds the site with Jekyll. Adding a page is copying a template, editing it, and pushing. There is no index file to update.

## Why Jekyll

GitHub Pages compiles a Jekyll site on its own. No Actions workflow and no paid host.

Cheat sheets live in `_cheatsheets/`. Notes live in `_notes/`. Jekyll treats each folder as a collection and turns every Markdown file into a page. The home page loops over those collections, and the search index is regenerated from the same files at build time. A new file shows up in the list, the tag filters, and search on the next build.

`templates/` is the only place a Markdown file is not published. It is excluded in `_config.yml`.

## Add a cheat sheet

Copy the template and edit it. The filename is the URL slug.

```bash
cp templates/cheatsheet.md _cheatsheets/ansible.md
```

That file becomes `/cheatsheets/ansible/`. Use lowercase words and hyphens. Do not start the filename with `_` or `.`. Jekyll skips those.

Front matter sits between the `---` lines at the top:

| Field | Required | What it does |
| --- | --- | --- |
| `title` | yes | Page heading and card title |
| `description` | yes | Card text, and it is part of search |
| `tags` | yes | YAML list. Every tag is a filter chip. Sheets are ordered by the first tag, so sheets that share a first tag sit together. Write the tag the way it should read: `AWS`, `kubectl`, `Bash` |
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

The body is Markdown. Use `##` for sections. Put commands in fenced code blocks with no `$` prompt, so the copy button pastes something you can run. A following fence or a short paragraph is the example. Blockquotes are for the warning that should stay next to the command.

````markdown
## Ad-hoc

Run a module against a group.

```bash
ansible web -m ping
```

> Limit `-m shell` to the cases the module cannot cover. A shell command skips the idempotence the module would have given you.
````

No layout line is required. `_config.yml` assigns the cheat sheet layout to everything in `_cheatsheets/`.

## Add a note

Notes are the same idea, for prose, checklists, and write-ups that are not command sheets.

```bash
cp templates/note.md _notes/postmortem-2026-10-30.md
```

That file becomes `/notes/postmortem-2026-10-30/`. Front matter is `title`, `description`, and optional `tags` and `updated`. Fenced code on a note gets the same copy button. The notes index and the home page pick up the file on the next build.

## Run locally

You need Ruby 3.2 or newer and Bundler. The `Gemfile` installs the `github-pages` gem, which is the Jekyll stack GitHub Pages uses, plus `webrick` so Ruby 3 can serve the site.

```bash
gem install bundler
bundle install
bundle exec jekyll serve
```

Open http://127.0.0.1:4000

Search is the field in the header. Press `/` to focus it. Tag chips filter the cards. Each code block has a Copy button. The theme toggle follows the system theme until you pick one; the choice is stored in the browser.

## Publish on GitHub Pages

The site is served from the `main` branch. Merge the change that adds the site, then turn Pages on.

1. Open the repository **Settings → Pages**: https://github.com/devopscowboy/DevOpsRanch/settings/pages
2. Under **Build and deployment**, set **Source** to **Deploy from a branch**. Do not choose GitHub Actions. This repo has no Pages workflow. Jekyll runs inside GitHub's branch build.
3. Set **Branch** to `main` and the folder to **`/ (root)`**. Save.
4. Custom domain should already read `devopsranch.com`, because the repo contains a `CNAME` file with that name. If the field is empty, enter `devopsranch.com` and save.
5. Wait for the build. The log is the **pages-build-deployment** workflow under the Actions tab. A red build usually means invalid YAML front matter in a file you just added.

The `Gemfile` is for local preview. GitHub Pages still builds with its own allowed Jekyll set. Do not add Jekyll plugins that are not in that set, or the Pages build will fail.

## Custom domain DNS

At the registrar for `devopsranch.com`, point the apex at GitHub Pages and point `www` at the GitHub user site. Remove any parking-page or old `A`/`AAAA` records on the apex, and do not add a wildcard (`*`) record. Extra records are a common reason the HTTPS certificate never appears.

Apex (`@`, or the bare domain `devopsranch.com`):

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

`www`:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `www` | `devopscowboy.github.io` |

Some registrars want the CNAME target with a trailing dot (`devopscowboy.github.io.`). That is the same record. Do not put `https://` in it. If the DNS host proxies traffic (Cloudflare's orange cloud, for example), turn the proxy off for these records until GitHub has issued the certificate.

Check from a terminal:

```bash
dig devopsranch.com +noall +answer -t A
dig devopsranch.com +noall +answer -t AAAA
dig www.devopsranch.com +noall +answer -t CNAME
```

The `A` and `AAAA` answers should be the eight addresses above, and only those. The `www` answer should be `devopscowboy.github.io`.

GitHub's current list is documented at [Managing a custom domain for your GitHub Pages site](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## Enforce HTTPS

DNS has to match before a certificate can be issued. On **Settings → Pages**, **Enforce HTTPS** stays disabled until GitHub finishes provisioning the certificate. That often takes minutes and can take up to 24 hours after the records are correct. When the checkbox is available, turn it on.

Recommended while you are in that screen: verify the domain for the `devopscowboy` account so another repo cannot claim it. GitHub shows a `TXT` record. The value is unique to the account, so it is not listed in this file. Add the record GitHub displays, then click verify.
