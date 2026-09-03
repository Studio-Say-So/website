// The three graph nodes every page repeats verbatim. Key order matters: it is
// what keeps the generated output byte-identical to what WordPress emitted.
import site from "./site.js";

export const place = {
  "@type": "Place",
  "@id": `${site.url}/#place`,
  geo: {
    "@type": "GeoCoordinates",
    latitude: site.geo.latitude,
    longitude: site.geo.longitude,
  },
  hasMap: site.hasMap,
  address: site.address,
};

export const organization = {
  "@type": ["Organization", "ProfessionalService"],
  "@id": `${site.url}/#organization`,
  name: site.name,
  url: site.url,
  foundingDate: site.founded,
  sameAs: site.sameAs,
  address: site.address,
  logo: {
    "@type": "ImageObject",
    "@id": `${site.url}/#logo`,
    url: site.logo.url,
    contentUrl: site.logo.url,
    caption: site.name,
    inLanguage: site.lang,
    width: site.logo.width,
    height: site.logo.height,
  },
  location: { "@id": `${site.url}/#place` },
  telephone: site.telephone,
  areaServed: site.areaServed,
};

export const website = {
  "@type": "WebSite",
  "@id": `${site.url}/#website`,
  url: site.url,
  name: site.name,
  alternateName: site.name,
  publisher: { "@id": `${site.url}/#organization` },
  inLanguage: site.lang,
};

export default { place, organization, website };
