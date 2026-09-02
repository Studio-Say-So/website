# Plan — retire wp-inline.css

`wp-inline.css` is the last WordPress artefact in the build. It loads on all 17
pages, and almost none of it applies to them.

## What is actually in it (measured, not guessed)

Every selector was extracted and tested against every built page with
`querySelectorAll` in a real browser. 58 selectors, of which:

| Scope | Selectors | Applies to |
|---|---|---|
| `/lead-form/` | 33 | one page |
| `/privacy-policy/` | 7 | one page |
| `/thankyou-page/` | 5 | one page |
| Site-wide | 2 | `body` margin/padding only |
| Genuinely dead | 6 | nothing |

So ~10 KB ships to 14 pages that use two lines of it.

Pseudo-selectors (`:hover`, `:after`) cannot be detected by `querySelectorAll`
and were checked by hand against their base selector rather than assumed dead.

## Two defects found while measuring

**A stray `*/` at line 113**, with no opening `/*`. CSS error recovery discards
the rule that follows, so `.page-id-1243 …pt-16 { background: #D9D9D9 }` has
never applied. The probe surfaced it as a bogus selector literally beginning
`*/`, matching on every page.

**Brittle selectors.** Rules are keyed to long Tailwind class chains, e.g.
`.page-id-1243 section.custom-container.grid.grid-cols-1.lg\:grid-cols-2.gap-12.mb-32`.
Any markup edit silently unhooks them — no error, no build failure. This is
exactly how `/lead-form/`'s hero broke: a heading promoted from `h2` to `h1`
stopped matching `h2.banner-section-head`, and an "empty" section that was
actually the header spacer got deleted.

## Approach

Split by page, load per page, delete the original.

1. `src/assets/css/lead-form.css` — the 33 lead-form rules.
2. `src/assets/css/privacy-policy.css` — `div#ppolicyi`, `.paddress`, `ul.ulvl2`.
3. `src/assets/css/thankyou-page.css` — `.page-id-1392`, `.thanku-cont-info`,
   `.aligncenter`.
4. The two `body` rules move into `style.css` beside the other base rules.
5. Each page loads its own file through the `extraStyles` front matter hook that
   `/lead-form/` already uses for `form.css`.
6. Drop the six dead rules and fix the stray `*/`.
7. Remove the `wp-inline.css` link from `base.njk` and delete the file.

**Selectors are moved verbatim, `.page-id-*` prefixes included.** Stripping them
would change specificity and could flip which rule wins against Tailwind. The
prefixes stay for now, so `bodyClass` stays too; simplifying them is a separate
change with its own verification.

## Verification

Screenshots of `/lead-form/`, `/privacy-policy/`, `/thankyou-page/` plus two
control pages captured before the change, compared after. The three affected
pages must be pixel-identical apart from the `#D9D9D9` background that the
stray `*/` was suppressing — that one is a deliberate, visible fix and needs
looking at rather than waving through.

Controls (`/`, `/contact-us/`) must be byte-identical, proving the 14 pages that
never used this file are unaffected.
