// Constants shared by the JSON-LD graph. Values reproduce what WordPress served,
// including the escaped `&amp;` in hasMap — that is fixed separately, not here.
const url = "https://studiosayso.com";

export default {
  url,
  name: "Studio Say So",
  lang: "en-US",
  telephone: "+1-407-839-6452",
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
  geo: { latitude: "28.5529579", longitude: "-81.3802166" },
  hasMap: `https://www.google.com/maps/search/?api=1&amp;query=28.5529579,-81.3802166`,
  logo: {
    url: `${url}/wp-content/uploads/2023/02/favicon.png`,
    width: "192",
    height: "192",
  },
  areaServed: [
    { "@type": "City", name: "Orlando" },
    { "@type": "State", name: "Florida" },
    { "@type": "Country", name: "United States" },
  ],
};
