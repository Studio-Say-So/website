# Collapsing wp-content

`wp-content/` is 99 files and 16 MB in a WordPress-shaped tree: media filed by
upload month, the Tailwind build buried five levels down, and a plugin's assets.
None of that structure means anything now.

```
src/wp-content/uploads/2023/02/adventhealth.webp
src/wp-content/themes/studio-say-so/dist/css/style.css
src/wp-content/plugins/gravityforms/...
```

## What is actually there

| Path | Files | Notes |
|---|---|---|
| `uploads/2022/12` … `uploads/2024/05` | 84 | 55 webp, 22 svg, 11 jpg, 3 png, 1 mp4 (11 MB) |
| `themes/studio-say-so/dist/css/style.css` | 1 | the prebuilt Tailwind, 52 KB |
| `plugins/gravityforms/` | 14 | CSS + icon fonts — deleted by plan-forms.md, not here |

123 references across 17 templates, one stylesheet and two data files.

**Two filenames collide when flattened.** `case-study-disney.webp` and
`case-study-rollins.webp` each exist in both `2023/01` and `2024/01`, with
different bytes, and *both* versions are referenced — four references to the
2023 pair, one each to the 2024 pair. Flattening needs the newer two renamed
rather than silently overwriting.

**Two files are unreferenced:** `2023/01/svg-mask.svg` and
`2023/02/IMG_9473.meta.jpg`, the latter orphaned by the earlier case-study
image fix.

**One commented-out rule** in `wp-inline.css` points at
`2024/01/section-bg-2.png`, which does not exist. Dead comment, worth deleting
with the rest.

## Target

```
src/assets/img/      84 media files, flat
src/assets/video/    SSSreel.mp4
src/assets/css/      style.css joins carousel.css, form.css, lightbox.css, wp-inline.css
```

`src/wp-content/` then holds only `plugins/gravityforms/`, which plan-forms.md
deletes — at which point the folder and its passthrough copy rule go too.

## The decision this hangs on

Eleven `*.meta.jpg` files are the social card images, referenced by **absolute**
URL in `og:image`, `og:image:secure_url`, `twitter:image` and the JSON-LD
`ImageObject` nodes. Those URLs have been served by the live WordPress site for
years, so Facebook, LinkedIn and any third-party embeds hold
`studiosayso.com/wp-content/uploads/...` in cache.

Nothing breaks today — production is still WordPress and this build is only on
the noindex preview. It breaks at DNS cutover, when those paths stop existing.

1. **Move everything, add redirects at cutover.** Cleanest result. Needs
   something that can 301, which GitHub Pages cannot do — but Cloudflare is
   already the likely answer for the forms Worker, and `README.md`'s cutover
   steps are the natural home for a `/wp-content/uploads/* -> /assets/img/*`
   rule.
2. **Move everything, accept the breakage.** Old shared links lose their card
   image; any third-party hotlink 404s. Cheap, irreversible in practice.
3. **Move everything except the eleven `.meta.jpg`.** No external breakage, but
   `wp-content/uploads/2023/02/` survives for eleven files, so the folder does
   not actually collapse.

## Steps

1. Move `uploads/**` to `assets/img/` (mp4 to `assets/video/`), renaming the two
   2024 collisions.
2. Move the theme stylesheet to `assets/css/style.css`.
3. Rewrite the 123 references across templates, `wp-inline.css`, `lib/site.js`
   and `_data/caseStudies.js`.
4. Delete the two unreferenced files and the dead commented rule.
5. Drop the `wp-content` passthrough from `eleventy.config.js` once only
   gravityforms remains, and add an `assets` rule if the existing one does not
   already cover it.
6. Verify: rendered HTML differs only in these paths, every referenced asset
   resolves, and `tools/validate-schema.mjs` still passes.

## Not in scope

- `wp-includes/` is already gone.
- Gravity Forms assets belong to plan-forms.md.
- The 11 MB `SSSreel.mp4` still belongs on R2 rather than in the repo; moving it
  to `assets/video/` does not change that.
