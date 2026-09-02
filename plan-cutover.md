# Plan — cutting studiosayso.com over to GitHub Pages

Moving the live domain off WP Engine and onto the Eleventy build. This is the
irreversible one, so the order below is chosen to keep production up until the
last possible moment and to make the rollback a single field.

## Starting state (measured, not assumed)

| | |
|---|---|
| Apex + www | `CNAME → wp.wpenginepowered.com`, **proxied** |
| Resolves to | `104.21.26.63`, `172.67.135.147` (Cloudflare edge) |
| Cloudflare SSL mode | **Flexible**, set by "Automatic mode" |
| GitHub Pages | `build_type: workflow`, `cname: None`, `https_enforced: true` |
| Build | `PATH_PREFIX=/website/`, no `src/CNAME` |
| Worker | live on `studiosayso.com/api/form`, needs the proxy to stay on |

## The one thing that will break this

**Flexible SSL plus GitHub Pages is a redirect loop.** Flexible means Cloudflare
fetches the origin over plain HTTP; GitHub Pages answers every HTTP request with
a 301 to HTTPS; Cloudflare follows it back to itself. The site goes down hard
and it looks like a DNS problem.

Fix: set the mode to **Full** before the DNS change. Full has Cloudflare talk
HTTPS to the origin without validating the certificate, which is what we need,
because GitHub cannot issue a certificate for `studiosayso.com` while Cloudflare
is proxying — its ACME challenge never reaches it. Visitors are unaffected:
Cloudflare terminates TLS at the edge with its own certificate.

**Full (strict) will not work** for the same reason. Do not "upgrade" to it.

The proxy has to stay on regardless: the Worker route and the redirect rules
below only apply to proxied records.

## Order of work

### A. Repo — no production impact
1. Add `src/CNAME` containing `studiosayso.com`.
2. Drop the `PATH_PREFIX` env block from `.github/workflows/deploy.yml`.
3. Point `FORM_ENDPOINT` at `/api/form` so the forms stop refusing.
4. Push and let it deploy.

This ends the `/website/` preview — GitHub redirects it to the custom domain,
which still resolves to WordPress. Production is untouched.

### B. Cloudflare TLS — before DNS
5. SSL/TLS → set mode explicitly to **Full**, turning off Automatic mode so it
   cannot drift back.
6. Confirm the *WordPress* site still loads. WP Engine serves HTTPS, so this
   should be a no-op — and Flexible was sending origin traffic in the clear
   anyway, so this is an improvement regardless of the migration.

### C. DNS — the cutover
7. Apex `CNAME` → `studio-say-so.github.io`, proxied. Cloudflare flattens at the
   apex, so this survives GitHub changing its IPs.
8. `www` the same.

### D. Redirects — immediately after, never before
9. `/wp-content/uploads/*` → `/assets/img/*`
10. `/wp-content/uploads/2023/02/SSSreel.mp4` → `https://vimeo.com/801605518`
11. `/blog/` → `/`

**These must come after step 7.** Added while WordPress is still the origin,
rule 9 would redirect the live site's own image URLs into paths that do not
exist there, breaking every image on the current site.

### E. Verify
- Every page 200, no redirect loop, certificate valid, `www` → apex.
- `/api/form` still answers 405 to GET (proves the Worker route survived).
- An old `/wp-content/uploads/…` image URL redirects to `/assets/img/…`.
- Submit a real form: Turnstile passes, mail arrives. **A human has to do this
  one** — obtaining a Turnstile token means completing a bot check.

## Rollback

Set the apex and `www` CNAME back to `wp.wpenginepowered.com`. Proxied records
take effect at the edge in seconds. Revert the SSL mode only if WP Engine turns
out to reject HTTPS at origin, which would be surprising.

Leave the redirect rules in place during a rollback — with WordPress back as the
origin they would break its images, so delete or disable them too.

## Not in scope

The GitHub Pages certificate. While Cloudflare proxies, GitHub will show the
custom domain as unsecured and cannot issue one. That is expected and does not
affect visitors.
