# flowpro.dev — static site

Static HTML for FlowPro: a free Chrome extension that checks whether AI assistants
can read a website, and a fixed-price service that implements the fixes. English is
the primary language at the root; Polish copies live under `/pl/`. Auto-deploys on
every push to `main`.

## Structure

```
public/
  index.html                      ← Home (EN)
  pl/index.html                   ← Home (PL)
  ai-visibility/index.html        ← AI Visibility Checker (EN)
  pl/ai-visibility/index.html     ← AI Visibility Checker (PL)
  ai-visibility/fix/index.html    ← AI Readiness Fix service (EN)
  pl/ai-visibility/fix/index.html ← AI Readiness Fix service (PL)
  ai-visibility/privacy/          ← Extension privacy policy
  ai-visibility/welcome/          ← Opened by Chrome on install (noindex)
  ai-visibility/goodbye/          ← Opened by Chrome on uninstall (noindex)
  about/index.html                ← About Ivan Karabeinikau
  privacy/index.html              ← Site privacy policy (EN)
  pl/privacy/index.html           ← Site privacy policy (PL)
  automatyzacja/index.html        ← Legacy automation offer (PL), formerly the home page
  by.html                         ← flowpro.by landing, served by nginx/flowpro.by.conf
  robots.txt  sitemap.xml  llms.txt
```

Each page is one self-contained HTML file with its stylesheet inline, which is how
this repo has always worked. Two stylesheets are in use: the marketing one (home,
fix, about, legacy) and the checker one (extension pages). Keep them in sync by
copying rules, not by inventing new components.

## Analytics

Every page carries one line, immediately before `</head>`:

```html
<script defer src="https://analytics.flowpro.dev/script.js" data-website-id="2bc8b095-99f7-4343-a61c-1fcff09681de"></script>
```

Umami is self-hosted, cookieless, and the only tracker on the site. There is no
template engine here, so that line is repeated in each file; `tests/site.test.mjs`
fails the build if any page carries a different src or id, a second copy, or a
second analytics vendor. CTAs are tagged with `data-umami-event`:
`install-extension`, `view-checker`, `view-fix-service`, `request-fix`,
`submit-fix-request`, `submit-waitlist`, `submit-uninstall-feedback`.

`by.html` is the flowpro.by landing and is deliberately left out, so its traffic
does not land in the flowpro.dev property.

## External services

All wired to real endpoints:

| Form | Endpoint | Fallback |
|---|---|---|
| Fix request (`/ai-visibility/fix/`, `/pl/…`) | `POST https://api.flowpro.dev/v1/site/audit-request` | prefilled `mailto:ivan@flowpro.dev` shown on any network error or non-2xx |
| Live-check waitlist (checker pages, install page) | `POST https://api.flowpro.dev/v1/site/waitlist` | same |
| Uninstall feedback (`/ai-visibility/goodbye/`) | `POST https://api.flowpro.dev/v1/site/feedback` | same |

Each form posts JSON, carries `src`, `ref`, `lang` and `page` (plus `score` on the
fix page, read from `?src=&score=&ref=` in the extension's deep link), and hides a
`company` honeypot field that silently drops bot submissions.

## Open Graph images

`node tools/og/build.mjs` re-renders the three 1200×630 images into
`public/assets/` from [tools/og/template.html](tools/og/template.html) using
headless Chrome. No npm install; set `CHROME=` if Chrome is not in the default
location. `og-image-automatyzacja.png` is the original automation artwork, kept
for the legacy page, and is not regenerated.

## Tests

```
node tests/site.test.mjs          # every page against the checker's own rules
node tests/aeo.test.mjs           # robots.txt, sitemap.xml, llms.txt, nginx, home pages
node tests/ai-visibility.test.mjs # extension pages, fix service, privacy policies
```

All three run in CI before the deploy step.

## Deploy

Push to `main` → GitHub Actions → scp of `public/` to `/srv/apps/flowpro-dev/`.
The deploy copies files; it does not delete removed ones. If a page is renamed or
dropped, remove it on the server by hand.

## Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | IP address of the VPS |
| `SERVER_USER` | SSH user (e.g. `root` or `ubuntu`) |
| `SERVER_SSH_KEY` | Private SSH key (see setup guide) |

## nginx

The site is served by the `reverse-proxy` container (nginx:1.25) on the VPS, which
mounts `/srv/infrastructure/nginx/conf.d` at `/etc/nginx/conf.d`. `nginx/flowpro.conf`
in this repo is a copy of `/srv/infrastructure/nginx/conf.d/flowpro.conf` as deployed,
kept here so the config is reviewable; **CI does not deploy it**. After changing it:

```bash
scp nginx/flowpro.conf ubuntu@146.59.92.14:/tmp/
ssh ubuntu@146.59.92.14 'cp /tmp/flowpro.conf /srv/infrastructure/nginx/conf.d/flowpro.conf   && docker exec reverse-proxy nginx -t && docker exec reverse-proxy nginx -s reload'
```

A missing path returns 404 rather than falling back to the home page. That matters
here: a soft 404 serves a copy of the home page under every mistyped URL, which is
exactly the "files that lie" failure the home page sells the fix for.
