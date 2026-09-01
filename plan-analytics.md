# Consolidating analytics into GTM-WVD5RK3

Three containers exist. Two load on every page; the third is the one we have
access to and it is empty.

| Container | State | Contents |
|---|---|---|
| `GTM-WCVH3JXN` | live, version 8 | everything that matters — read in full below |
| `GTM-MTNM6RS` | live, version 2 | a GA4 config for a **second** property `G-LCVD8TQRX1`, and one **paused** Universal Analytics tag |
| `GTM-WVD5RK3` | version 1, empty | 0 tags, 0 triggers, only GTM's 5 built-in variables |

Plus a **Meta Pixel `688292446778861`** hardcoded into `partials/tracking-head.njk`,
outside any container. Neither live container contains a Meta pixel, so it is
not double-firing today.

## What GTM-WCVH3JXN actually contains

Read from its published `gtm.js`, so this is the live configuration, not a draft.

**Tags**

| # | Type | Configuration |
|---|---|---|
| 1 | Google tag (GA4) | `G-WE6C2KE9YP` |
| 2 | Conversion Linker | cookie prefix `_gcl`, cross-domain off, URL passthrough off |
| 3 | Google Ads Remarketing | conversion ID `11469008061`, dynamic remarketing off, user ID on |
| 4 | GA4 event | event name `Form Submit`, measurement ID override `G-WE6C2KE9YP` |
| 5 | GA4 event | event name `Click_to_Call_4078396452`, same override |
| 6 | Google Ads Conversion | ID `11469008061`, label `yKi-CPmXhrMZEL3Z7Nwq` |
| 7 | Click listener | (built-in, enables the click trigger) |

**Triggers**

| Fires | Condition |
|---|---|
| tags 1, 2, 3, 7 | All Pages (`gtm.js`) |
| tag 4 — `Form Submit` | dataLayer event `form_submit` **AND** Page Path equals `/contact-us/` |
| tag 5 — `Click_to_Call` | Click URL equals `tel:407-839-6452` **AND** event is `gtm.click` |
| tag 6 — Ads conversion | All Pages **AND** Page URL contains `/thankyou-page` |

## Two things that are broken and must be fixed with the move

**The Ads conversion never fires.** It is gated on landing at `/thankyou-page`,
but the form handler posts by `fetch` and shows an inline status message — it
never navigates. This predates today's work; the handler has behaved this way
since the port. Nothing has been lost yet only because `FORM_ENDPOINT` is unset
and no form has ever submitted. It would start costing conversions the moment
the worker goes live.

**The GA4 `Form Submit` event never fires.** It needs a `form_submit` dataLayer
push on `/contact-us/`. There are zero `dataLayer.push` calls in the entire
built site — Gravity Forms' JavaScript presumably did this before the port
removed it.

## How to build WVD5RK3

**Do not hand-build it.** Ask the client to export `GTM-WCVH3JXN`
(Admin → Export Container, pick the published version) and import that JSON into
`WVD5RK3` (Admin → Import Container, "Overwrite", since it is empty). GTM remaps
account and container ids on import, so a foreign export is the supported path.
The table above is then the checklist to verify the import against — every tag,
id and trigger condition should match it.

Hand-building is the fallback, and the tables above are complete enough for it.

**Decisions to make while building:**

- **`G-LCVD8TQRX1` (from MTNM6RS) — recreate it or drop it?** It is a second GA4
  property receiving duplicate pageviews behind a paused Universal Analytics
  tag, which stopped processing in 2023. Nobody appears to have looked at it
  since. Recommend dropping, but that is the client's data to lose.
- **Meta Pixel — move it in or leave it hardcoded?** Moving it makes the
  container the single place tracking lives. Leaving it hardcoded means it
  keeps working if GTM is blocked, which on this evidence is common — the
  containers are DNS-blackholed on at least one developer machine already.

## Repo changes

1. `partials/tracking-head.njk`: one container snippet, `GTM-WVD5RK3`, replacing
   two. Same for the `<noscript>` iframes in `base.njk` — two become one.
2. `partials/forms.njk`: on a successful submit, push
   `{ event: "form_submit" }` to the dataLayer, then send the browser to
   `/thankyou-page/`. That restores both the GA4 event and the Ads conversion
   without needing any change inside the container.
3. Meta Pixel: remove from `tracking-head.njk` only if it moves into the
   container.

## Sequencing

The site is not live — production is still WordPress and the preview is
noindex — so there is no window where analytics goes dark. Still, build and
publish `WVD5RK3` before the repo change ships, or the preview loads a container
with nothing in it.
