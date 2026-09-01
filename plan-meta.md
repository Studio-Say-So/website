# Deriving the Open Graph and Twitter tags

`plan-jsonld.md` scoped this out deliberately: `ogTags` and `twitterTags` carry
the same wholesale duplication the JSON-LD did, and `dateModified` already
proved the fields overlap. The JSON-LD work is done, so this is next.

## What the analysis found

**Everything in both blocks already exists elsewhere in front matter.**

| Tag | Source |
|---|---|
| `og:locale`, `og:site_name`, `twitter:card` | constants (`en_US`, `Studio Say So`, `summary_large_image`) |
| `og:title`, `twitter:title` | `title` |
| `og:description`, `twitter:description` | `description` |
| `og:url` | `canonical` |
| `og:updated_time` | `schema.dateModified` |
| `og:image*`, `twitter:image` | `schema.image` — url, width, height, and `caption` for the alt |
| `og:type` | a constant — see below; it was `article` on 13 pages and `website` on three |
| `twitter:label1`/`data1` | not derivable — a reading time, 13× "Less than a minute", 1× "3 minutes" |

Only two fields are genuinely per-page. Everything else is a restatement.

**Three bugs and a gap, all verified in the built output:**

1. **`og:image` ships as a relative URL** — `/wp-content/uploads/.../adventhealth.meta.jpg`.
   Open Graph requires an absolute URL, and `HtmlBasePlugin` rewrites `href`
   and `src`, not `meta content`, so nothing corrects it downstream. Affects
   all four pages that have an image.
2. **`og:image:type` claims `image/png`** on all four, for files `file(1)`
   confirms are JPEG.
3. **12 of 16 pages have no `og:image` at all** — only the case studies do.
   Sharing the home page, About, Work or any industry page yields a card with
   no image, even though every one of those pages already declares a
   `schema.image` that `primaryImageOfPage` points at.
4. `industries/index` has no `twitterTags` block at all; `lead-form` and
   `thankyou-page` omit both description tags despite having a `description`.
   `industries/index` also had a shorter `og:description` than its own
   `<meta name="description">`; deriving both from `description` settles it.

## Target shape

A `src/_includes/partials/meta.njk` partial — the `partials/` convention
already exists for `head-scripts.njk` and `tracking-head.njk` — rendering both
blocks from `title`, `description`, `canonical`, `schema`, and two new
per-page fields:

```yaml
readingTime: "3 minutes"   # omitted where the page has none
```

`og:type` started as a per-page `ogType` field and ended up a constant. Thirteen
pages declared `article` while supplying no `article:*` property, and the site
has no articles — no posts anywhere in the repo, and `/blog/` is a noindex
placeholder. The case studies were the only arguable ones, and the schema
already calls them `CreativeWork` rather than `Article`; declaring `article` in
Open Graph would put the two vocabularies in disagreement about the same page.
Nothing renders differently either way, so this is correctness, not traffic.

`ogTags` and `twitterTags` come out of front matter entirely.

`lastmod` is not quite the pure duplicate it looked like. It equals
`schema.dateModified` on all 14 pages that have both, but `blog`,
`industries/index` and the `contact` stub carry a standalone `lastmod` with a
port-era timestamp and no schema date at all. `sitemap.njk` reads it, so it
falls back — `schema.dateModified or lastmod` — and only the 14 duplicates go.

## Steps

Output changes on purpose here, so the byte-identical check does not apply.
Instead, `tools/diff-meta.mjs` extracts every `og:`/`twitter:` tag from each
built page as a name→value map and diffs it against a pre-change snapshot. Each
commit below should show exactly its own intended additions and no others.

1. Snapshot the current tag maps.
2. Add the partial and the two front matter fields; render both blocks from it.
   At this step the only intended diffs are the four bugs above.
3. `refactor(meta): render the social tags from page data` — steps 4 and 5
   below collapsed into this one. Reproducing the bugs first would have meant
   writing code to strip the origin off an already-absolute URL and to hardcode
   the wrong mime type; the per-tag diff gives the same visibility the split
   was for.
4. ~~`fix(meta): use absolute URLs and the real mime type for og:image`~~
5. ~~`feat(meta): give every page a social card image`~~
6. `refactor: fold lastmod into schema.dateModified`

## Not in scope

- **`twitter:label1`/`data1`.** The other Rank Math leftover: X stopped
  rendering the label/data pair in cards years ago, so the 14 reading-time
  strings are inert. Same class of decision as `og:type`, but removing them
  deletes content rather than correcting it, so it needs its own call.
- **Inventing reading times or dates.** `blog` and `industries/index` have
  neither; they keep neither.
