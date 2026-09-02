/**
 * Form endpoint for studiosayso.com.
 * Accepts the contact and lead forms, verifies Turnstile, emails the studio.
 */

const FIELDS = {
  name: { required: true, max: 200 },
  phone: { required: true, max: 40 },
  email: { required: true, max: 200 },
  company: { required: true, max: 200 },
  budget: { required: false, max: 100 },
  message: { required: true, max: 5000 },
  form: { required: false, max: 40 },
};

const json = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "vary": "origin",
    },
  });

// Fails closed: an unset secret rejects rather than waving everything through.
async function verifyTurnstile(token, secret, ip, action, hostnames) {
  if (!secret) return false;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  let d;
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new Error(`siteverify ${r.status}`);
    d = await r.json();
  } catch {
    return false;
  }
  if (d.success !== true) {
    console.warn("turnstile rejected", JSON.stringify(d["error-codes"] || []));
    return false;
  }
  // A token minted for one form, or on a dev host, must not spend here.
  if (action && d.action !== action) {
    console.warn("turnstile action mismatch", JSON.stringify({ got: d.action, want: action }));
    return false;
  }
  if (!hostnames.includes(d.hostname)) {
    console.warn("turnstile hostname mismatch", JSON.stringify({ got: d.hostname, want: hostnames }));
    return false;
  }
  return true;
}

function validate(form) {
  const out = {};
  const errors = [];
  for (const [key, rule] of Object.entries(FIELDS)) {
    const raw = (form.get(key) || "").toString().trim();
    if (!raw) {
      if (rule.required) errors.push(`${key} is required`);
      continue;
    }
    if (raw.length > rule.max) {
      errors.push(`${key} is too long`);
      continue;
    }
    out[key] = raw;
  }
  if (out.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(out.email)) {
    errors.push("email is not valid");
  }
  // honeypot: real users never fill this
  if ((form.get("website") || "").toString().trim()) errors.push("rejected");
  return { out, errors };
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";

    if (request.method === "OPTIONS") return json({}, 204, origin);
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

    const reqOrigin = request.headers.get("origin");
    if (env.ALLOWED_ORIGIN && reqOrigin && reqOrigin !== env.ALLOWED_ORIGIN) {
      return json({ error: "Forbidden" }, 403, origin);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return json({ error: "Expected form data" }, 400, origin);
    }

    const hostnames = (env.TURNSTILE_HOSTNAMES || "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const ok = await verifyTurnstile(
      form.get("cf-turnstile-response"),
      env.TURNSTILE_SECRET,
      request.headers.get("cf-connecting-ip"),
      (form.get("form") || "").toString().trim(),
      hostnames,
    );
    if (!ok) return json({ error: "Verification failed. Please try again." }, 400, origin);

    const { out, errors } = validate(form);
    if (errors.length) return json({ error: errors[0], errors }, 422, origin);

    const lines = Object.entries(out).map(([k, v]) => `${k}: ${v}`).join("\n");
    const subject = `Website enquiry from ${out.name}${out.company ? ` (${out.company})` : ""}`;

    if (env.RESEND_API_KEY && env.NOTIFY_TO && env.NOTIFY_FROM) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: env.NOTIFY_FROM,
          to: [env.NOTIFY_TO],
          reply_to: out.email,
          subject,
          text: lines,
        }),
      });
      if (!r.ok) {
        console.error("mail send failed", r.status, await r.text());
        return json({ error: "Could not send right now. Please call 407-839-6452." }, 502, origin);
      }
    } else {
      // Not yet configured — log rather than silently accept.
      console.warn("mail not configured; submission not delivered", subject);
      return json(
        { error: "This form is not connected yet. Please call 407-839-6452." },
        503,
        origin,
      );
    }

    // Server-side Lead event. The browser pixel loses Safari and ad-blocked
    // traffic; eventId lets Meta dedupe if a browser Lead is ever added too.
    const eventId = crypto.randomUUID();
    await sendMetaLead(out, eventId, request, env);

    return json({ ok: true, eventId }, 200, origin);
  },
};

async function sha256(value) {
  const bytes = new TextEncoder().encode(value.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sendMetaLead(out, eventId, request, env) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) return;
  const userData = { em: [await sha256(out.email)] };
  if (out.phone) userData.ph = [await sha256(out.phone.replace(/[^0-9]/g, ""))];
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) userData.client_ip_address = ip;
  const ua = request.headers.get("user-agent");
  if (ua) userData.client_user_agent = ua;

  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${env.META_PIXEL_ID}/events?access_token=${env.META_CAPI_TOKEN}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: "Lead",
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              action_source: "website",
              event_source_url: request.headers.get("referer") || undefined,
              user_data: userData,
            },
          ],
        }),
      },
    );
    // Never fail the submission over analytics; the enquiry already sent.
    if (!r.ok) console.error("meta capi failed", r.status, await r.text());
  } catch (err) {
    console.error("meta capi error", err);
  }
}
