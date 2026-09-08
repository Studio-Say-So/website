# Plan — publish the whitepaper as an indexable page

Client approved turning the "Ways to Save Money on Video Production" PDF into a
real page with the PDF as a download from it, rather than gating it behind the
form.

**Why this and not a gate:** the site's diagnosed problem is that it has almost
nothing worth indexing — 11 pages indexed, 8 `/work/` film pages rejected as
thin. The whitepaper is ~1,160 words of original prose, roughly 3.4× the unique
content of all eight rejected pages combined. Behind a form it is invisible to
both Google and AI assistants. See `HANDOFF` notes and the GSC audit.

---

## Target

| | |
|---|---|
| URL | `/save-money-on-video-production/` |
| Title | Ways to Save Money on Video Production |
| Layout | `layouts/base.njk` (prose page, same shape as `/privacy-policy/`) |
| PDF | `/assets/docs/ways-to-save-money-on-video-production.pdf` (already committed, `cd11c02`) |

**Flat URL, not `/guides/…`.** A `/guides/` index holding one item is precisely
the thin page Google is already refusing to index elsewhere on this site. Revisit
when there are three or more guides.

## Source content

`pdftotext -layout` of the committed PDF. Structure is an intro, four numbered
tips, and a closing note:

1. A perfect video might not be YOUR perfect video
2. Find a Production Company That Speaks Your Language
3. Think Launch…and What Comes After
4. Work Within Your Budget!

Section 2 carries a four-question checklist (a–d) that should stay a list.

### Defects in the source, to fix on the page

- **Section 01 repeats itself.** The first two sentences of paragraph 1 appear
  verbatim again at the start of paragraph 2 ("There is a video that will work
  for you and your needs… maximum bang for your buck."). A copy-paste error in
  the original InDesign file. Deduplicate — do not ship a page that repeats a
  sentence, Google reads that as padding.
- `"Collaboration"` is capitalised mid-sentence in section 02.
- `"16+ years of running a video production"` is missing its noun — should read
  "a video production company".

Fix all three on the page. Leave the PDF as-is; it is the client's artwork and
re-exporting it is out of scope.

## Work

1. **`lib/jsonld.js` — add an `articleNode`.** Mirrors the existing
   `serviceNode` / `workNode` builders: emits an `Article` with `headline`,
   `author`/`publisher` pointing at `#organization`, `datePublished`,
   `mainEntityOfPage`, and `associatedMedia` describing the PDF as a
   `DigitalDocument`. Triggered by `schema.article` in front matter, matching how
   `schema.service` and `schema.work` already work. The page node stays
   `WebPage` — this adds a node, it does not change the existing contract.
2. **`src/save-money-on-video-production.njk`** — the page. Front matter follows
   `privacy-policy.njk` exactly (layout, permalink, title, description,
   canonical, robots, extraStyles, schema with breadcrumb + image).
3. **`src/assets/css/whitepaper.css`** — page-scoped styles, id-scoped the way
   `privacy-policy.css` is scoped to `#ppolicyi`. Needed for the numbered tip
   headings, the download button, and the a–d checklist.
4. **Cover image** — render page 1 of the PDF with Ghostscript to
   `src/assets/img/whitepaper-cover.webp` (on-page) and
   `whitepaper-cover.meta.jpg` (og:image). Matches the existing `.meta.jpg`
   naming convention.
5. **Footer link** — add to "Footer Navigation 2" in `base.njk` alongside Work /
   About Us / Privacy Policy. This is the point: a sitewide inbound link. The
   audit showed pages with a single inbound link do not get indexed on this site.
6. **Sitemap** — automatic. `sitemap.njk` walks `collections.all` and includes
   anything with a `canonical` and no `noindex`, so the page appears once it has
   front matter. No change needed.

## Constraints to respect

- **Tailwind is prebuilt, no build step.** A class not already in
  `assets/css/style.css` generates no CSS. Verified available and safe to use:
  `custom-container`, `heading-underline`, `text-colorText-body`, `font-display`,
  `py-28`, `max-w-[52ch]`, `max-w-[30ch]`, `text-4xl/2xl/xl`, `mb-6`, `mb-4`,
  `mt-12`, `mt-16`, `font-bold`, `inline-block`, `px-5`, `py-4`, `space-y-6`,
  `text-colorAccent-400`, `bg-colorAccent-700`, `uppercase`. Anything else must
  be checked against `style.css` first or written into `whitepaper.css`.
- `studio-custom` has **no CSS rule anywhere**. It is an inert WordPress
  leftover used as a wrapper on nine pages. Keep it for consistency; do not
  expect it to do anything.
- Do not put node definitions in `src/_data/` — a file there becomes a global
  data key and collides with per-page `schema` front matter. That is why the
  builders live in `lib/`.

## Verify

- `npm run build`
- `node tools/validate-schema.mjs` — expect 26 pages, all `@id` refs resolve
- `node tools/diff-meta.mjs` — confirm no existing page's tags moved
- Render the page in the browser and read it. This site has hidden two carousel
  bugs behind correct-looking config; trust the rendered result.
- Confirm the PDF link downloads and the sitemap gained exactly one URL.

## Follow-up, not in this change

- **Redirect the dead PDF URL.** `/wp-content/uploads/2024/06/save-money-on-video-production-whitepaper.pdf`
  currently 404s and Google crawled it on 5 Sep. Now that there is a destination,
  point it at the new page. Cloudflare free plan: 6 of 10 Single Redirects used,
  so there is room. Albert's call, in the Cloudflare dashboard.
- Nothing here touches the eight thin film pages. That still needs client copy.
