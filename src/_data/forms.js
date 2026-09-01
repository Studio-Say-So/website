// Endpoint for the contact + lead forms. Empty until the Worker in ../worker
// is deployed; while empty the forms refuse to submit and say so, rather than
// posting to the page and silently dropping the enquiry.
export default {
  endpoint: process.env.FORM_ENDPOINT || "",
  phone: "407-839-6452",
  // Cloudflare's always-passes test key until the real one is issued.
  turnstileKey: process.env.TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
};
