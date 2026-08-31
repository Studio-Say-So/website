# Formatting and de-duplicating the templates

The port carried WordPress's minified output straight into the templates. Every
page is a handful of enormous lines, and a lot of what's in them is the same
bytes repeated fifteen times.

## What the analysis found

**Front matter — 364 KB of exact duplication**

| Block | Pages | Variants | Total | Identical? |
|---|---|---|---|---|
| `inlineStyles` | 15 | 1 | **349 KB** | yes — 23 KB × 15 |
| `headScripts` | 15 | 1 | 14 KB | yes |
| `extraStyles` / `extraScripts` | 2 | 1 | 2 KB | yes (both form pages) |
| `jsonld` / `ogTags` / `twitterTags` | 15–16 | per page | 82 KB | no — correctly unique |

**Body — SVG is 84% duplicate**

| Fragment | Occurrences | Size | Wasted |
|---|---|---|---|
| CTA arrow (`Group_7`) | 44 | 465 B | 19.5 KB |
| Decorative blob (`Union_5`) | 33 | 590 B | 18.4 KB |
| CTA arrow, hover variant | 9 | 527 B | 4.1 KB |
| Circular play/scroll icon | 5 | 482 B | 1.9 KB |
| **Total** | | 53.9 KB present | **45.4 KB duplicated** |

Plus 15 byte-identical "Let's Talk" CTA anchors (663 B each), the case-study
"More of Our Work" cards (4 pages × 3 cards, same structure and different
content), and the `#case-study` scroll link on all four case studies.

## Formatting hazards

A naive HTML prettifier would silently change what the page renders:

- **25 elements carry `whitespace-pre-line`.** The `\r\n` inside headings like
  "Some of the emotions\r\nwe've instilled." are deliberate line breaks. Re-indent
  inside one and the break moves.
- **2 `<textarea>`** elements, where every character between the tags is content.
- **SVG** — reformatting path data and `<g>` nesting risks nothing visually but
  produces enormous diffs for no gain; these are being extracted anyway.

So the formatter must treat `pre`, `textarea`, `svg`, and any element whose class
matches `whitespace-pre*` as opaque, and must not introduce or remove whitespace
inside a text node.

## Order of work

Formatting first, as asked, so the blocks that get extracted afterwards are
already readable when they land in an include.

### 1. Format

Write a small structural formatter rather than reaching for Prettier, which does
not understand Nunjucks tags and would reflow the protected elements above.

It only inserts newlines and indentation *between* elements, and never touches
the inside of a protected element or the text within a text node.

**Verification:** parse both the before and after builds and assert the DOM is
equivalent — same tag sequence, same attributes, same text content — with the
protected subtrees compared byte-for-byte.

### 2. Extract the front matter

- `inlineStyles` → `src/assets/css/wp-inline.css`, linked once from the layout.
  Also a real improvement: 23 KB stops being re-sent inline with every page and
  becomes one cacheable file.
- `headScripts` → the layout, since all fifteen pages carry the same list.
- `extraStyles` / `extraScripts` → `_includes/partials/forms-assets.njk`.

### 3. Extract the body components

Nunjucks macros in `_includes/macros/ui.njk`:

- `arrow()` / `arrowHover()` — the two CTA arrow variants
- `blob()` — the decorative Union_5 shape
- `cta(href, label)` — button plus arrow, the 15 identical anchors
- `caseStudyCard(...)` — the related-work card used across the case studies

Macros rather than includes: these take parameters, and `{% import %}` keeps them
callable without repeating `{% with %}` blocks at each site.

**Verification after each step:** rebuild and diff the rendered HTML against the
previous build. Extraction must be byte-identical output; formatting is checked
by DOM equivalence.
