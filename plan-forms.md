# Replacing the Gravity Forms markup

`worker/` already implements the backend: validation, honeypot, Turnstile
verification and Resend delivery. What is still WordPress is the *markup* — two
scraped Gravity Forms with 129 KB of vendor CSS and fonts behind them. This
plan replaces that markup with one component posting the field names the worker
already validates.

**Not in scope:** deploying the worker, or setting `FORM_ENDPOINT`. Both are
Albert's call and neither is needed to land this.

## What exists today

**The worker's contract** (`worker/src/index.js`) is already the source of truth:

| Field | Required | Max |
|---|---|---|
| `name`, `phone`, `email`, `company`, `message` | yes | 200 / 40 / 200 / 200 / 5000 |
| `budget`, `form` | no | 100 / 40 |
| `website` | honeypot — any value is rejected | |
| `cf-turnstile-response` | verified when `TURNSTILE_SECRET` is set | |

**The two forms do not agree with each other.** `/lead-form/` (`gform_2`) posts
`name` and matches the contract exactly. `/contact-us/` (`gform_1`) posts
`name_first` and `name_last` and no `name`. That works today only because the
submit handler patches it in the browser:

```js
var first = data.get("name_first"), last = data.get("name_last");
if (first || last) data.set("name", [first, last].filter(Boolean).join(" "));
```

So the markup posts one shape and JavaScript rewrites it into another. A single
`name` field removes the need for that line.

**Bot protection is currently inert, and turning it on would break both forms.**
Each page renders `<div class="ginput_container ginput_recaptcha"
data-sitekey='6Lfn…'>` — a Google reCAPTCHA v2 placeholder — and no reCAPTCHA
script is loaded, so nothing renders in it. Nothing ever posts
`cf-turnstile-response`. The worker tolerates that only because
`verifyTurnstile` returns `true` when `TURNSTILE_SECRET` is unset. **The moment
that secret is set, every submission fails**, because no page renders a
Turnstile widget. This is the one item that has to land before the worker is
configured, not after.

**Styling is split across two mechanisms**, which is the trap in this rewrite:

- `/contact-us/` is styled entirely through the theme's Tailwind arbitrary
  variants on a wrapper div — `[&_input]:bg-colorAccent-700`, `[&_input]:border-b`,
  `[&_input]:px-4`, `[&_textarea]:bg-colorAccent-700` and friends.
- `/lead-form/` additionally gets six id-scoped rules from `wp-inline.css`:
  `form#gform_2 input#input_2_3::placeholder`, `.ginput_container input,textarea`,
  the two `:focus-visible` rules, `input#gform_submit_button_2` and its `:hover`.
- Three more hang off `.page-id-1243`: the validation-error box, a placeholder
  colour, and `.gform_confirmation_message_2`.
- One lives in the theme build: `[&_.gfield_required]:!text-white`.

Ten rules total. Whichever form is rewritten first, the other's styling does not
come along — a shared component needs both sets reconciled into one.

**What the vendor assets cost:** `basic.min.css` 48 KB, `theme.min.css` 42 KB,
`theme-components.min.css` **0 bytes but still requested**, and 38 KB of icon
fonts. 129 KB on the two form pages, plus the 49 remaining dead classes in the
site-wide audit, all of which are Gravity Forms markup.

## Target shape

One macro in `src/_includes/macros/form.njk` taking a field list, rendering:

```html
<form method="post" action="{{ forms.endpoint }}" data-formid="contact" novalidate>
  <label for="f-name">Full name</label>
  <input id="f-name" name="name" type="text" required maxlength="200">
  …
  <input type="text" name="website" tabindex="-1" autocomplete="off" hidden>
  <div class="cf-turnstile" data-sitekey="…"></div>
  <button type="submit">Submit</button>
  <p class="form-status" role="status" aria-live="polite"></p>
</form>
```

Field names come straight from the worker's `FIELDS`. `budget` appears on the
contact form only, matching today. The existing submit handler in `base.njk`
already keys off `form[data-formid]` and needs only its `name_first`/`name_last`
line removed.

## Steps

1. Write the macro and a single stylesheet block in `wp-inline.css` replacing
   the ten rules with element/class selectors that do not depend on Gravity
   Forms names or numeric ids. Reconcile the contact and lead-form looks into
   one; where they differ today, keep the lead form's, which is the newer page.
2. Convert `/contact-us/` to the macro. Compare against a snapshot: the rendered
   fields, labels, `for`/`id` pairing and tab order should match.
3. Convert `/lead-form/`. Same check.
4. Drop the `name_first`/`name_last` line from the submit handler.
5. Replace the dead reCAPTCHA div with a Turnstile widget and load
   `https://challenges.cloudflare.com/turnstile/v0/api.js` on the two form pages
   only. The site key is public and belongs in `_data/forms.js` beside the
   endpoint; the secret stays a worker secret.
6. Delete `src/wp-content/plugins/gravityforms` and its three stylesheet links.
7. Re-run `tools/validate-schema.mjs` and the class audit — the 49 dead classes
   should be zero.

Commits, one per step group: `feat(forms): render both forms from one macro`,
`feat(forms): swap the dead reCAPTCHA for Turnstile`,
`perf(forms): remove the Gravity Forms assets`.

## Verification

- Accessibility is the real risk in a form rewrite, and the scraped markup does
  some of it correctly today: every input has a `<label for>`, required fields
  are marked, and the status paragraph is `role="status" aria-live="polite"`.
  Check each of those survives, plus focus order and visible focus rings — the
  `:focus-visible` rules exist for a reason.
- With `FORM_ENDPOINT` unset, both forms must still render their submit disabled
  and show the phone number. That behaviour is deliberate: refusing visibly
  beats accepting silently.
- Turnstile renders but cannot be verified end-to-end until the worker is
  deployed. Confirm the widget appears and posts a `cf-turnstile-response`;
  the round trip stays untested until Albert deploys.

## Open question

The reCAPTCHA site key in the current markup is Studio Say So's Google key. A
Turnstile widget needs a new site key from the Cloudflare account that will run
the worker — that pairing has to exist before step 5 can be finished, so it may
need Albert.
