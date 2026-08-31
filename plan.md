# studiosayso.com → Eleventy on GitHub Pages

Port the 15-page WordPress site to a static Eleventy build, commit a faithful
baseline, then land the audit fixes as individual reviewable commits.

**Decisions taken:** custom domain (`pathPrefix: "/"`, `CNAME` in repo root);
forms replaced by a Cloudflare Worker, wired after the baseline lands.

**Not in scope:** pushing. Remote creation and `git push` are Albert's call.

---

## What the exploration found

The current build is carrying a lot that never runs. Established by reading the
rendered HTML of all 15 pages, not by assumption:

| Library | Rendered instances | Notes |
|---|---|---|
| **Flickity** (unpkg CDN) | **1** — `/work/` | `data-flickity` fade carousel, 4 cells. The only real carousel on the site. |
| Smart Slider 3 | 1 — `/lead-form/` | `#n2-ss-9`; loads 5 JS + 1 CSS file |
| Slick (Slider by webxapp) | **0** | CSS + JS on all 15 pages, never initialised |
| MetaSlider | **0** | leaks an *admin* `editor-block.css` to the front end, plus dead CSS scoped to `page-id-1243` |
| Soliloquy Lite | **0** | not referenced in any page's output at all |

Also dead or duplicated:

- `themes/studio-say-so/dist/js/scripts.js` **returns 404**. Every page requests
  it. All real theme JS is a 6.5 KB inline block (nav toggle, scroll header,
  popup video) — vanilla DOM, no dependencies.
- **jQuery is loaded twice** on all 15 pages — `code.jquery.com/jquery-3.6.0.min.js`
  *and* `wp-includes/js/jquery/jquery.min.js`, plus migrate and underscore. The
  only consumers are WP Cerber's spam-field injector and Gravity Forms.
- GSAP and ScrollTrigger are **commented out** in the template, so they never
  load. (An earlier pass counted them as live dependencies; the `<script>` tags
  are inside HTML comments.)
- **Responsive Lightbox**: 5 JS files + 1 CSS on every page.
- **Three trackers**: `GTM-MTNM6RS`, `GTM-WCVH3JXN`, and a direct Facebook Pixel
  (`688292446778861`). The audit found two; the third was inline.
- **Marker.io** — client-feedback QA tool from the build, still live in production.
- Header and footer markup is **byte-identical across all 15 pages** (verified by
  hash), so layout extraction is lossless.

### Slider decision

**Standardise on Flickity.** It is already the only library doing real work, it
auto-initialises from a `data-flickity` attribute so there is no init code to
maintain, it has no jQuery dependency, and unifying means porting exactly one
instance (`/lead-form/`'s Smart Slider) rather than rewriting the site's main
carousel. Vendor it locally rather than hotlinking unpkg.

Removing Slick, MetaSlider, Soliloquy and Smart Slider costs nothing — three of
them render no markup at all.

---

## Phase 1 — Scaffold

```
.
├── .eleventy.js
├── package.json
├── .github/workflows/deploy.yml
├── plan.md
├── README.md
└── src/
    ├── CNAME                        studiosayso.com
    ├── _data/site.json              nav, NAP, socials, tracking ids
    ├── _includes/layouts/base.njk   head + header + footer
    ├── assets/
    │   ├── css/                     theme style.css + vendored plugin CSS
    │   ├── js/                      inline theme JS extracted to a file
    │   ├── img/                     66 files from wp-content/uploads
    │   └── video/SSSreel.mp4        11 MB
    └── *.njk                        15 pages
```

Eleventy 3.x, Nunjucks, `src` → `_site`. Node 26 is installed; the workflow
pins Node 22 LTS.

**GitHub Pages note:** 11 MB of video plus 22 MB of uploads is fine for the
1 GB repo limit, but `SSSreel.mp4` should move to a CDN or Cloudflare R2 before
this gets much bigger. Flagged in the README, not solved here.

## Phase 2 — Baseline commit (faithful copy)

Reproduce the current output as closely as static hosting allows. **Everything
stays**, including the dead libraries — they are what the later commits remove,
and keeping them makes each fix a legible diff.

Deliberate, unavoidable departures from a byte-exact copy, recorded in the
commit message:

1. Gravity Forms markup preserved, submit inert (no PHP). Wired in Phase 4.
2. WP Cerber's random hidden-field injector dropped — it defends a POST endpoint
   that no longer exists.
3. WordPress emoji loader, `wp-json` links, `xmlrpc.php` RSD link, speculation
   rules and the Cloudflare challenge iframe all dropped — WordPress plumbing
   with no static equivalent.
4. `dist/js/scripts.js` is not reproduced, because it 404s today.

Everything else — all four slider plugins' assets, GSAP, jQuery, Responsive
Lightbox, all three trackers, Marker.io — is carried over verbatim.

## Phase 3 — The slider commit

`refactor(assets): standardise carousels on Flickity`

Remove Slick, MetaSlider, Soliloquy and Smart Slider assets; port the
`/lead-form/` slider to a `data-flickity` carousel; vendor Flickity locally.

## Phase 4 — Audit fixes, one commit each

Ordered by the audit's impact ÷ effort ranking, so the log reads as the
remediation plan:

| # | Commit | Status |
|---|---|---|
| 1 | `feat(industries): add /industries/ hub page` | done |
| 2 | `fix(schema): point breadcrumbs at the live hub URL` | done |
| 3 | `feat(nav): add Industries to primary navigation` | done |
| 4 | `feat(schema): add FAQPage markup to industry pages` | done |
| 5 | `fix(schema): remove the boldist author entity` | done |
| 6 | `fix(schema): type the business as ProfessionalService` | done |
| 7 | `fix(a11y): add alt text to every image` | done |
| 8 | `chore: remove the Marker.io QA snippet` | done |
| 9 | `perf: remove the duplicate third-party jQuery` | done |
| 10 | `fix(seo): noindex the lead form and thank-you pages` | done |
| 11 | `fix(seo): replace the placeholder privacy description` | done |
| 12 | `fix(nav): link the footer straight to /contact-us/` | done |
| 13 | `fix(seo): keep /contact reachable after the migration` | done |
| 14 | `fix(content): correct heading hierarchy` | done |
| 15 | `fix(schema): use a real primary image, not the favicon` | **open** |
| 16 | `fix(analytics): consolidate tag containers` | **blocked** |
| 17 | `feat(forms): wire contact forms to the Cloudflare Worker` | **open** |

### Open items and why

**15 — primary image.** Every page still declares the 192x192 favicon as
`primaryImageOfPage` and as the Article `image`, which disqualifies all of them
from image-bearing rich results. Fixing it needs a real representative image
chosen per page; the case-study pages have obvious candidates, the service
pages do not.

**16 — analytics.** Blocked on a decision, not on work. Two GTM containers
(`GTM-MTNM6RS`, `GTM-WCVH3JXN`) plus a direct Facebook Pixel
(`688292446778861`) fire on every page. Removing the wrong container would
silently break whatever reporting is live, so this needs someone to confirm
which is current before anything is deleted.

**17 — forms.** Contact and lead-form markup is intact but inert. Needs the
Worker endpoint plus Turnstile.

### Also outstanding, needs Studio Say So

- **Flickity licensing.** Dual-licensed GPLv3-or-commercial and used on a
  commercial site. Currently loaded from unpkg, so nothing GPL is redistributed
  in this repo, but the site is using it either way. Either buy the commercial
  licence from Metafizzy or swap the two carousels for an MIT library.
- **awards-2.svg** — an unidentified award emblem, currently described
  generically in alt text.
- **Organization facts** — email, founding date, price range and opening hours
  were left out of schema rather than invented. All four are worth adding once
  confirmed.
- Content work from the audit: service pages, `VideoObject` markup and
  transcripts, naming the founders on About.


## Verification, per Albert's loop

After each commit: `npx @11ty/eleventy --dry-run` for build integrity, and a
diff of the rendered `_site` HTML against the corresponding mirrored page to
confirm the change is the only change. No linter is configured yet; Prettier
gets added in Phase 1 if it earns its place.

## Order of work

1. Scaffold, `git init`, verify the build.
2. Baseline commit.
3. Slider commit.
4. Fix commits 1–15, verifying between each.
5. Stop. Report. Push is Albert's call.
