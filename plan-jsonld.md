# Moving JSON-LD out of per-page front matter

The port carried Rank Math's rendered `@graph` into each template's front
matter verbatim. It works, and it is byte-for-byte what production serves — but
it is a rendered artifact checked in as source, and it has already drifted.

**Verdict:** keep JSON-LD per page, but not *authored* per page. Split by scope:
site-constant nodes move to `_data`, page nodes are derived from front matter
that already exists, and only genuinely unique content (FAQ, video, service,
case-study) stays declared per page.

---

## What the analysis found

**Half of every template is pasted structured data**

Across the 16 templates carrying `jsonld:`, **2,727 of 5,834 total lines** are
the JSON-LD block — 47%. Blocks run 103–256 lines each.

| Pages | `jsonld` lines |
|---|---|
| `industries/{education,finance,healthcare}` | 256 each |
| `work/*` (4 case studies) | 195 each |
| `index`, `about-us`, `work`, `contact-us`, `lead-form`, `privacy-policy`, `thankyou-page` | 136–137 each |
| `blog`, `industries/index` | 123 / 103 |

**Most of it is the same bytes.** Hashing the shared nodes across all 16 pages:

| Node | Identical across |
|---|---|
| `#place` | 14 of 16 (absent on `industries/index`) |
| `#organization` | 14 of 16 (degraded on `industries/index`) |
| `#website` | 13 of 16 (`index` adds a `SearchAction`; `industries/index` differs) |

That is ~1,500 lines of exact duplication, and the two exceptions are not
intentional variation — they are drift.

**The unique part is small, and most of it is already in front matter.** Per
page, everything outside the three shared nodes is one of:

| Node | Where it comes from |
|---|---|
| `WebPage` / `AboutPage` / `ContactPage` / `CollectionPage` | `title`, `canonical`, dates — all already in front matter or `ogTags` |
| `BreadcrumbList` | derivable from `permalink` + a label map |
| `ImageObject` | already in `ogTags` as `og:image` on the 4 case studies |
| `FAQPage` | 9 Q&A per industry page — **also in the visible body** |
| `Service` | 3 industry pages, genuinely unique (name, serviceType, description) |
| `CreativeWork` | 4 case studies, genuinely unique |
| `VideoObject` | `index` + 4 case studies, genuinely unique |

`dateModified` in the graph equals `og:updated_time` in `ogTags` on **every**
page that has both — so one front matter field can drive both.

**The FAQ is duplicated but not yet stale.** All 27 Q&A pairs across the three
industry pages match the visible markup exactly once tags are stripped
(verified by normalised comparison). Schema answers are plain text; the body
has one inline `<a href="/contact-us/">` in the education pricing answer. A
single source with an HTML answer and a tag-stripped `text` for schema
reproduces both. This is the one part of the refactor with real upside beyond
line count: right now nothing stops the two copies diverging.

---

## Bugs this fixes

All verified against the current templates, not assumed.

1. **`industries/index.njk` has a degraded Organization node.** Missing `name`,
   `url`, `logo`, `address`, `location`; no `#place` node at all. Every other
   page has them. Google gets a weaker entity on that URL for no reason.
2. **`hasMap` is HTML-escaped inside JSON** — `?api=1&amp;query=...` on all 15
   pages that carry it, so the URL string is literally malformed.
   `work/rollins-college.njk` has a second instance of the same artifact.
3. **All four case studies claim the wrong primary image.** `og:image` is the
   page's own hero, but `primaryImageOfPage` points at the generic
   `danny-directing-blue-2.meta.jpg` (`IMG_9473` on campbellsville) — and the
   page's own `ImageObject` node is defined but referenced by nothing. Rank
   Math default-image artifact.
4. **`blog` and `industries/index` define an `ImageObject` and never reference
   it** — those pages end up with no `primaryImageOfPage` at all.
5. **`blog`'s breadcrumb is `Home` only** — missing its own trailing crumb.
   Every other non-home page has one.
6. **`index` is the only page with the WebSite `SearchAction`.** Google retired
   the sitelinks search box, so it is inert — make it site-wide or drop it, but
   one-page-only is noise.
7. **Home breadcrumb `@id` is inconsistent** — `https://studiosayso.com` on 14
   pages, `https://studiosayso.com/` on `industries/index`.

8. **`work/rollins-college` carries the wrong caption.** Its hero
   `ImageObject` and its `og:image:alt` both read "Wiley Campbellsville" —
   the neighbouring case study's name. Found during phase 1.

Not bugs, but normalise while we are in here: `position`, `latitude`,
`longitude`, `width`, `height` are all emitted as strings rather than numbers.
`industries/index` was the sole page emitting real integers for `position`;
phase 1 made it match the other 15 (strings), so step 10 now normalises all
sixteen to numbers rather than leaving one page different. `lastmod` in front
matter also duplicates `schema.dateModified` on every page — fold it in.

---

## Target shape

```
src/_data/site.js              constants: name, url, phone, address, geo, sameAs, logo
src/_data/schema.js            the shared nodes: #place, #organization, #website, #logo
src/_data/eleventyComputed.js  assembles page.jsonld from site + front matter
src/_data/faq.js               the 27 Q&A, keyed by industry (body + schema read this)
```

`base.njk` is unchanged — it still does `{{ jsonld | safe }}`.

Per-page front matter shrinks to what is actually unique:

```yaml
schema:
  type: WebPage              # or AboutPage / ContactPage / CollectionPage
  datePublished: 2023-02-10T16:29:55-05:00
  dateModified: 2023-03-27T21:42:14-04:00
  breadcrumb: [Work, AdventHealth]
  image: /wp-content/uploads/2023/02/adventhealth.meta.jpg
  video: { ... }
  work: { ... }
```

`site.js` also absorbs the phone number, which `_data/forms.js` already holds a
second copy of (`407-839-6452` there, `+1-407-839-6452` in the graph).

---

## Steps

Two phases, deliberately. Phase 1 changes **no output**; phase 2 changes output
on purpose, one fix per commit. That keeps the "diff rendered output between
builds" check meaningful — it is the habit that caught three regressions during
the port.

### Phase 1 — mechanical extraction, byte-identical output — **DONE**

Two things the plan got wrong, both found by building:

- **`_data/schema.js` cannot hold the shared nodes.** A file in `_data` becomes
  a global data key, so `schema` collided with the per-page `schema` front
  matter and every page silently lost its graph. The node definitions and the
  builder live in `lib/` instead; only real data belongs in `_data`.
- **`_data/eleventyComputed.js` is not picked up here.** Eleventy loads and
  calls it during dependency resolution, but the computed values never reach
  the template. Registering the same object with
  `eleventyConfig.addGlobalData("eleventyComputed", ...)` works.

Actual layout: `lib/site.js` (constants), `lib/schema.js` (shared nodes),
`lib/jsonld.js` (builder + the computed export), registered from the config.
Result: **2,743 lines deleted, 326 added** across the 16 templates, against 251
lines of new `lib/`.


1. `npm run build`, snapshot `_site` to compare against.
2. Add `src/_data/site.js` and `src/_data/schema.js` with the shared nodes,
   reproducing today's bytes exactly — including the `&amp;` and the
   string-typed numbers. Bugs get fixed in phase 2, not here.
3. Add `src/_data/eleventyComputed.js` assembling the graph in **today's node
   order per page** (it varies — case studies lead with the OG `ImageObject`,
   `industries/index` puts `CollectionPage` before `BreadcrumbList`).
   `JSON.stringify(graph, null, 2)` matches the current 2-space indent.
4. Convert templates one at a time, rebuilding and diffing `_site` after each.
   Order: simplest first (`privacy-policy`, `thankyou-page`), then the shared
   group, then case studies, then the three industry pages.
5. `industries/index.njk` cannot be byte-identical — it is bug #1. Convert it
   last and let its diff be exactly the missing Organization fields. Its actual
   diff was larger than predicted: the Place node, the Organization fields, the
   **WebSite** fields (it carried only `@type` and `@id`), node reordering, and
   the home-crumb `@id`. It also needed `hasPart` support, which no other page
   uses.
6. Commit: `refactor(schema): assemble JSON-LD from shared data`.

### Phase 2 — the fixes, one commit each

7. `fix(schema): unescape the hasMap URL`
8. `fix(schema): point case studies at their own hero image`
9. `fix(schema): give blog and industries their primary image and breadcrumb`
10. `fix(schema): normalise the home breadcrumb @id and numeric fields`
11. `chore(schema): drop the retired sitelinks SearchAction` — **ask Albert
    first**; dropping vs. making it site-wide is a judgment call, not a bug fix.

### Phase 3 — single-source the FAQ

12. `src/_data/faq.js` holds the 27 Q&A with HTML answers; the industry
    templates render the body from it and the graph derives `text` by stripping
    tags. Verify the rendered `_site` is byte-identical to phase 2's output —
    it should be, since the two copies match today.
13. Commit: `refactor(schema): single-source the industry FAQs`.

---

## Verification

- `tools/check-build.sh` rebuilds and diffs every page against a snapshot of
  the pre-refactor `_site`. Run after **every** template conversion, not at the
  end — it caught the two mistakes above immediately.
- `tools/validate-schema.mjs` parses the JSON-LD out of every built page and
  reports unresolved `@id` references (breadcrumb `item` URLs excepted) plus
  unreferenced `ImageObject` nodes. It currently lists exactly the six known
  orphans from bugs #3 and #4, which is how phase 2 will be checked off.
- The converter validated each page before writing: it rebuilt the graph from
  the derived front matter and refused to touch the file unless the result was
  string-identical to the original. That is what caught `/blog/`.
- Spot-check two pages in Google's Rich Results Test before the DNS cutover.
  Do not open a browser from a tool — paste the URLs manually.

## Not in scope

- **`ogTags` / `twitterTags` consolidation.** They have the same duplication
  problem and `dateModified` already proves the fields overlap, but folding
  them in doubles the diff surface. Separate plan, after this lands.
- **New markup.** `VideoObject` for the dozen further portfolio videos on
  `/work/` needs those pages restructured — that is the content item already
  logged in `HANDOFF-2026-08-31.md`, not this refactor.
- **Missing Organization fields** (email, founding date, price range, opening
  hours). Still blocked on Studio Say So; `site.js` gives them one obvious home
  when they arrive.

## Open question

The `index` VideoObject's `thumbnailUrl` is a 295×166 Vimeo CDN URL with a
`?region=us` query. That is under Google's preferred size for video rich
results and looks expiry-prone. Worth replacing with a self-hosted still, but
that needs an asset — flagging, not fixing.
