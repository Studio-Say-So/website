// Constants shared by the JSON-LD graph.
const url = "https://studiosayso.com";
const geo = { latitude: 28.5529579, longitude: -81.3802166 };

export default {
  url,
  name: "Studio Say So",
  lang: "en-US",
  // The only place the container id lives. Empty renders no GTM at all.
  gtmId: process.env.GTM_ID || "GTM-NLM8ZZSV",
  telephone: "+1-407-839-6452",
  twitter: "@studiosayso",
  sameAs: [
    "https://www.facebook.com/studiosaysovideo/",
    "https://www.instagram.com/studiosaysovideo/",
    "https://vimeo.com/studiosayso",
    "https://www.linkedin.com/company/studio-say-so",
    "https://twitter.com/studiosayso",
    "https://clutch.co/profile/studio-say-so",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "62 West Colonial Dr. Suite 305",
    addressLocality: "Orlando",
    addressRegion: "FL",
    postalCode: "32801",
    addressCountry: "USA",
  },
  geo,
  hasMap: `https://www.google.com/maps/search/?api=1&query=${geo.latitude},${geo.longitude}`,
  // Rendered from footer-logo.svg on the site background; the mark is white-only.
  logo: {
    url: `${url}/assets/img/logo-512.png`,
    width: 512,
    height: 512,
  },
  areaServed: [
    { "@type": "City", name: "Orlando" },
    { "@type": "State", name: "Florida" },
    { "@type": "Country", name: "United States" },
  ],
};
