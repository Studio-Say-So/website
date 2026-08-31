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

async function verifyTurnstile(token, secret, ip) {
  if (!secret) return true; // not configured yet
  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token || "");
  if (ip) body.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const d = await r.json();
  return d.success === true;
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

    const ok = await verifyTurnstile(
      form.get("cf-turnstile-response"),
      env.TURNSTILE_SECRET,
      request.headers.get("cf-connecting-ip"),
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

    return json({ ok: true }, 200, origin);
  },
};
