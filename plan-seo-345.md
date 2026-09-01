# Plan — SEO items 3, 4, 5

Three small, independently verifiable fixes from the post-audit review. One
commit each. No content invented: every caption below was written after looking
at the image, and every thumbnail URL was checked for a 200 before being used.

---

## 3. Organization logo is the favicon

`lib/site.js` points `logo` at `/assets/img/favicon.png` (192×192). Plan item 15
replaced `primaryImageOfPage` with a real image but never touched the logo node,
so the `Organization` graph still advertises a favicon.

**Snag:** the repo has no raster logo above 192px. The real mark is
`footer-logo.svg` (47.937×51.062) — and it is `fill="#fff"` throughout, drawn for
a dark background. Rasterising it on transparency would be invisible on Google's
white surfaces.

**Fix:** render `footer-logo.svg` to `src/assets/img/logo-512.png` at 512×512,
white mark centred on `#081421` — the site's own `bg-siteBackground`
(`rgb(8 20 33)`, `style.css:1729`), which is exactly how the logo appears in the
header and footer. Faithful, not invented. Then point `site.logo` at it with
`width`/`height` 512.

Rendered with headless Chrome (no ImageMagick/rsvg on this machine); the command
is recorded in the commit message so it is reproducible.

## 4. VideoObject thumbnails are too small

Five `VideoObject` nodes, all carrying WordPress-era thumbnail URLs. Each
candidate replacement was fetched and its JPEG dimensions read from the SOF
header before being adopted:

| Page | Current | Verified replacement |
|---|---|---|
| `index.njk` | Vimeo `_295x166` | `_1280x720` — 200, 50 KB |
| `work/wiley-campbellsville.njk` | Vimeo `_295x166` | `_1280x720` — 200, 79 KB |
| `work/adventhealth.njk` | `hqdefault.jpg` 480×360 | `maxresdefault.jpg` — 200, 1280×720 |
| `work/321-the-agency-shopdisney.njk` | `hqdefault.jpg` 480×360 | `maxresdefault.jpg` — 200, 1280×720 |
| `work/rollins-college.njk` | `hqdefault.jpg` 480×360 | `sddefault.jpg` — 200, 640×480 |

**Rollins is the trap.** `maxresdefault.jpg` for `AU7Kb1nqnA4` returns 404 (with a
120×90 placeholder body, so a naive fetch looks like it worked). It gets
`sddefault` at 640×480 instead. A blind find-and-replace across the four YouTube
entries would have pointed one page at a dead image.

Vimeo also serves `_1920x1080`, but the source reel is 720p, so `_1280x720` is
the honest native size.

## 5. og:image:alt on 4 of 16 pages, no twitter:site

`meta.njk` gates `og:image:alt` on `schema.image.caption`. Only the four case
studies set one, so twelve pages ship an `og:image` with no alt.

**Fix:** add `caption` to the twelve. Captions written from looking at each
image, matching the vocabulary of the existing alt text:

| Image | Pages | Caption |
|---|---|---|
| `danny-directing-blue-2` | index, blog, contact-us, lead-form, privacy-policy, work, thankyou-page | A Studio Say So director guiding talent on a kitchen set |
| `IPCTV` | about-us | Studio Say So crew filming a multi-camera studio production *(reuses the in-page alt)* |
| `Healthcare-e1675869287402` | industries/healthcare | Clinician in scrubs filmed on a studio set for a healthcare video |
| `sss-edu-02-scaled-…` | industries/education | Studio Say So crew lining up a dolly shot on a green screen set |
| `sss-financial-03` | industries/finance | Interview set lit on location for a financial services shoot |
| `home-story` | industries/index | Studio Say So filming an on-location interview, framed on the camera monitor |

Also add `twitter:site` to `meta.njk`, from a new `site.twitter` constant
(`@studiosayso`, derived from the handle already in `site.sameAs`).
`twitter:creator` is deliberately skipped — it names a content author, and these
are company pages with no bylined author.

---

## Verification

After each commit:

```bash
npm run build
node tools/validate-schema.mjs      # expect: 18 pages, all @id references resolve
node tools/diff-meta.mjs            # confirm only the intended meta tags moved
```

Plus, for item 4, re-fetch each thumbnail URL as built and assert a 200 with the
expected dimensions — the whole point of the change is the pixel size.

Not in scope: pushing, and the video compression work (item 1), which is a
separate and much larger change.
