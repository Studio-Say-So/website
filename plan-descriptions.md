# Plan — rewrite the meta descriptions

The last code-only item from the post-audit review. Every description is a
WordPress/Yoast leftover; nine of sixteen overflow what Google renders and
several are broken sentences.

`description` also feeds `og:description`, `twitter:description`, and the
`CreativeWork.description` on case studies, so this changes four surfaces at
once. Nothing here invents a claim: each line is grounded in the page's own
H1 and opening copy, read from the build.

## What is actually wrong

| Page | Now | Problem |
|---|---|---|
| `/` | 189 | ends "Call us today at 407-839-6452!!" |
| `/about-us/` | 202 | overflows; describes a process the page opens by not leading with |
| `/contact-us/` | 162 | "we can help your thoughts into a video production reality" — not a sentence |
| `/industries/education/` | 238 | overflows *and* is itself cut mid-phrase: "...for your next education" |
| `/industries/finance/` | 178 | overflows |
| `/industries/healthcare/` | 170 | overflows; opens by repeating the H1 verbatim |
| `/work/` | 145 | ends "what Studio Say So is up to!!" |
| `/work/adventhealth/` | 181 | overflows |
| `/work/rollins-college/` | 237 | overflows badly |
| `/work/wiley-campbellsville/` | 188 | overflows; "See how we didi it!" |
| `/work/321-the-agency-shopdisney/` | 160 | describes the clients, never the work |

## Deliberately left alone

- `/industries/` (152) and `/privacy-policy/` (158) were written after the
  audit. They are the right length and read correctly.
- `/404.html` (85) is noindex and its text is fine.
- `/lead-form/`, `/thankyou-page/` and `/contact/` have no description and
  should keep none — all three are noindex, and `/contact/` is a redirect stub.

## Targets

Under 160 characters so nothing truncates, unique per page, leading with the
service and sector rather than the brand, and no exclamation-mark shouting.
Case studies switch to "How Studio Say So …" so the result reads as work
performed rather than a client encyclopaedia entry.

Figures used are the pages' own: Rollins' "over 135 years", shopDisney's
"over 40 videos / 15+ talent / two days". No new numbers introduced.

## Verification

```bash
npm run build
node tools/validate-schema.mjs
node tools/diff-meta.mjs <baseline>   # description, og: and twitter: move together
```

Plus a length assertion: every description <= 160, none empty on an indexable
page.
