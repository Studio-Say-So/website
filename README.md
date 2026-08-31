# studiosayso.com

Static [Eleventy](https://www.11ty.dev/) build of studiosayso.com, ported from
WordPress. Deploys to GitHub Pages via Actions on push to `main`.

**Currently a preview deploy** at `studio-say-so.github.io/website/`, served
under a subpath and marked `noindex` so it cannot compete with the live
WordPress site.

### Cutting over to studiosayso.com

1. Drop the `PATH_PREFIX` env block from `.github/workflows/deploy.yml`.
2. Add `src/CNAME` containing `studiosayso.com`.
3. Point DNS at GitHub Pages (A/AAAA records, or CNAME to
   `studio-say-so.github.io`).

The sources are written root-relative for the real domain; `HtmlBasePlugin`
rewrites them for the subpath preview, so nothing in `src/` changes between the
two modes.

```bash
npm install
npm run serve     # local dev at http://localhost:8080
npm run build     # writes ./_site
```

## Layout

```
src/
├── robots.txt
├── _includes/
│   ├── layouts/base.njk           doctype, head, header, footer, theme JS
│   └── partials/tracking-head.njk analytics snippets
├── wp-content/                    media and vendored assets (see below)
├── index.njk                      /
├── about-us.njk                   /about-us/
├── work.njk  work/*.njk           /work/ and four case studies
├── industries/*.njk               healthcare, education, finance
├── contact-us.njk  lead-form.njk  thankyou-page.njk
├── privacy-policy.njk
└── blog.njk
```

Each page carries its own `title`, `description`, `canonical`, `robots`,
Open Graph tags and JSON-LD in front matter; `base.njk` renders them.

### Why paths still say `wp-content`

Media kept its original WordPress URLs on purpose. Social platforms cache OG
images by URL, and changing them would break every share card and any external
hotlink. The directory is just a folder of files now — nothing WordPress runs.

## Porting notes

The baseline commit reproduces the WordPress output as faithfully as static
hosting allows: all 15 pages verified structurally identical to the live site
(title, description, canonical, headings, image count, word count, schema types).

Five things could not carry over, all WordPress plumbing with no static equivalent:

1. **Forms are inert.** Gravity Forms needs PHP. The markup is preserved exactly;
   a Cloudflare Worker endpoint replaces the backend in a later commit.
2. **WP Cerber's spam-field injector** dropped — it defended a POST endpoint that
   no longer exists.
3. **WordPress emoji loader, `wp-json` links, `xmlrpc.php` RSD, speculation rules
   and the Cloudflare challenge iframe** dropped.
4. **`themes/studio-say-so/dist/js/scripts.js` not reproduced** — it returns 404
   on the live site. The real theme JS is inline and was carried over intact.
5. **Sitemap** is not yet generated; Rank Math produced the old one.

## Known debt

- `SSSreel.mp4` is 11 MB in-repo. Fine against the 1 GB limit, but it belongs on
  R2 or a CDN before the media library grows.
- Dead front-end libraries carried over in the baseline so their removal is a
  reviewable diff: three unused slider plugins, a duplicate jQuery, and the
  Responsive Lightbox bundle. See `plan.md`.
- No sitemap generation, no linter.

`plan.md` holds the full migration plan and the ordered list of remaining fixes,
each traced to a finding in the SEO audit.
