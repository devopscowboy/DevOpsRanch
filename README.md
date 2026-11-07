# DevOps Ranch

DevOps Ranch is a Linux learning site for people working toward the RHCSA (Red Hat Certified System Administrator, EX200), with cheat sheets beside the lessons. The live site is Linux only. Other cheat sheets and the notes are still in the repo, unpublished, so they can come back one at a time.

The site is at [https://devopsranch.com](https://devopsranch.com).

## What is published

- Splash page, with one track: Linux. Lessons, Labs, and Cheat Sheets.
- Linux lessons at `/lessons/linux/`, in module order, following Red Hat's published EX200 objectives for Red Hat Enterprise Linux 10.
- Linux labs at `/labs/linux/`. One lab page per lesson.
- Linux cheat sheets at `/cheatsheets/linux/`.

A row on a lesson or lab page that says "Coming soon" is an objective that does not have a page yet. It is not a link.

## Order

Every list of tracks or cheat sheets sorts by the `order` field, not by title. Linux is `order: 1` on the lesson track, the lab track, and the Linux cheat sheet. Anything you publish later gets `2` or higher, so Linux stays first on the splash page, the lesson list, the lab list, the cheat sheet list, and in search results that tie.

Topic pages inside the Linux cheat sheet already have their own `order`. That number is the order inside Linux, not the order of Linux against other subjects.

## Hide, and bring one page back

`published: false` in a file's front matter keeps the Markdown and stops Jekyll from building the page. The page is then absent from listings, navigation, the search index, and the sitemap.

### A cheat sheet

Non-Linux sheets (`git`, `ansible`, `docker`, `kubectl`, `openshift`, `terraform`, `aws-cli`, `python`) are `published: false`, with `order` set so Linux remains first.

To publish one of them:

1. In that file, delete the line `published: false` (or set `published: true`).
2. Leave `order` at `2` or higher. Do not use `1`.
3. Build. The sheet shows up on `/cheatsheets/` after Linux, and in search. No other file has to change.

`_cheatsheets/test.md` is an old dev page. It stays unpublished. The first lessons were written from it. Do not publish it.

### A note

`_notes/change-checklist.md` is `published: false`. The notes index, `notes.html`, is also `published: false`, and the header has no Notes link. Search still loops `site.notes`, so a published note is indexed automatically.

To publish one note:

1. Remove `published: false` from that note.
2. Remove `published: false` from `notes.html` so `/notes/` exists again.
3. Add the Notes link back to `_includes/header.html`, next to Sheets:

```html
<a href="{{ '/notes/' | relative_url }}" {% if page.url == "/notes/" or page.collection == "notes" %}aria-current="page"{% endif %}>Notes</a>
```

## Publish the next lesson

The whole exam outline lives in `_data/linux.yml`. Order in that file is the order on the landing pages. A lesson becomes a real page only when both of these exist and are published (the default):

- `_lessons/linux/<slug>.md`
- `_labs/linux/<slug>.md`

Use the `slug` and `order` from `_data/linux.yml`. Front matter that matters:

```yaml
slug: grep
parent: linux
section: linux
order: 5
module: "Files & text"
number: "05"
```

The lesson and the lab share `slug`, `order`, `module`, and `number`. The lesson layout links to the lab with that slug. The lab links back to the lesson, and links onward to the next published lesson. Previous and Next on a lesson walk the published lessons in `order`.

Leave the `_data/linux.yml` row in place. The landing page links the row when the file exists, and shows "Coming soon" with no URL when it does not.

To hold a draft in the repo without putting it on the site, set `published: false` on both the lesson and the lab.

Commands in lessons are RHEL 9 and 10. When RHEL 7 or 8 differs, label that release. Do not add a full Ubuntu or Debian version of the command.

## Lab demos

The owner adds a GIF or a short looped video per lab. Put the file in `assets/demos/`. In the lab Markdown, include it where the walkthrough should sit:

```liquid
{% include demo.html src="/assets/demos/filesystem.mp4" alt="What the clip shows" %}
```

- `.mp4` and `.webm` render as a video: autoplay, muted, loop, playsinline, with controls.
- `.gif` renders as an image.
- Omit `src`, or pass anything that is not one of those, and the lab shows a placeholder instead of a broken file.

```liquid
{% include demo.html %}
{% include demo.html src="/assets/demos/filesystem.gif" alt="What the clip shows" caption="Optional caption" %}
```

An optional `caption` is the text under the media. Paths start with `/assets/demos/` so they match the site root.

## Build

The default build is the full site. It is the output for the protected dev and test host:

```bash
bundle install
bundle exec jekyll build
bundle exec jekyll serve
```

That writes `_site/`. Nothing about the Coming Soon page changes this command or this directory.

Production is a second command with its own directory:

```bash
./script/build-coming-soon
```

That writes `_site-coming-soon/` and does not run Jekyll. The two commands can be run in either order. See `DEPLOYMENT.md` for which directory each host publishes.

The stack is the `github-pages` gem, so the local full-site build matches the Jekyll site this repo already ships. No extra plugins.
