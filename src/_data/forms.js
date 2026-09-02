// Same-origin path served by the Worker in ../worker. Relative on purpose: the
// POST is then same-origin, so there is no preflight and no CORS to drift.
export default {
  endpoint: process.env.FORM_ENDPOINT || "/api/form",
  phone: "407-839-6452",
  // Public site key; its secret half lives in the Worker, never here.
  turnstileKey: process.env.TURNSTILE_SITE_KEY || "0x4AAAAAAElAHMWD5ZxYyx5W",
};
