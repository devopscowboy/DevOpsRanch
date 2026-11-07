# Deployment outputs

The site is still Jekyll. `jekyll build` is unchanged and still writes the full site to `_site`. Coming Soon is a second command and a second directory. This branch does not change the `dev` branch.

`dev` is frozen at `c7d03df862f53d203ec99db4cb529c9cb443a95e`. Leave it there. Its Pages settings stay:

| | Dev (do not change) |
| --- | --- |
| Branch | `dev` |
| Build command | `jekyll build` |
| Build output directory | `_site` |

## Production Coming Soon

Use these two settings for the production Pages project (`devopsranch`, hostname `devopsranch.com`) only when the commit Pages builds contains `script/build-coming-soon`. That script is on this branch. It is not on `main` or `dev` at `c7d03df`. Switching the live production command while Pages is still building `c7d03df` will fail the build, because the script is not in that commit.

| | Production |
| --- | --- |
| Build command | `./script/build-coming-soon` |
| Build output directory | `_site-coming-soon` |

```bash
./script/build-coming-soon
```

The command takes no arguments. The directory is always `_site-coming-soon`. It does not run Jekyll, does not write `_site`, and does not edit source files. A symlink at that path is rejected.

Publish that directory only. It contains:

- `index.html` and `404.html`, the same Coming Soon page
- `assets/css/site.css`
- the splash logos and favicons

It does not contain lessons, labs, cheat sheets, notes, search, `search.json`, or the lesson diagram. `/lessons/linux/filesystem/` and the other learning paths are absent, so Pages serves `404.html`. That file is the Coming Soon page and has no links to those paths.

Do not set the production build command to `jekyll build` or `bundle exec jekyll build`, and do not set the production output directory to `_site`. That is the full site.

## Full site

Local default, and the command the dev deployment already uses:

```bash
bundle exec jekyll build
```

Output directory: `_site`.

`jekyll build` on the Pages dev project writes the same directory. Lessons, labs, cheat sheets, and search stay in that output. The dev hostname stays behind Cloudflare Access.

## Local check

```bash
./script/test-outputs
```
