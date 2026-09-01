// Assembles each page's JSON-LD graph from the shared nodes plus whatever the
// page declares in its `schema` front matter.
import site from "./site.js";
import shared from "./schema.js";

const org = { "@id": `${site.url}/#organization` };
const web = { "@id": `${site.url}/#website` };

const imageNode = (img) => {
  const node = {
    "@type": "ImageObject",
    "@id": img.url,
    url: img.url,
    contentUrl: img.url,
    width: img.width,
    height: img.height,
  };
  if (img.caption) node.caption = img.caption;
  node.inLanguage = site.lang;
  return node;
};

const breadcrumbNode = (base, crumbs) => ({
  "@type": "BreadcrumbList",
  "@id": `${base}#breadcrumb`,
  itemListElement: [{ name: "Home", url: site.url }, ...crumbs].map((c, i) => ({
    "@type": "ListItem",
    position: String(i + 1),
    item: { "@id": c.url, name: c.name },
  })),
});

function pageNode(data) {
  const s = data.schema;
  const base = data.canonical;
  const node = {
    "@type": s.type,
    "@id": `${base}#webpage`,
    url: base,
    name: data.title,
  };
  if (s.datePublished) {
    node.datePublished = s.datePublished;
    node.dateModified = s.dateModified;
  }
  if (s.about) node.about = org;
  node.isPartOf = web;
  // /blog/ defines its image node without pointing at it; kept until that is fixed.
  if (s.image && !s.image.unlinked) node.primaryImageOfPage = { "@id": s.image.url };
  node.inLanguage = site.lang;
  if (s.breadcrumb) node.breadcrumb = { "@id": `${base}#breadcrumb` };
  if (s.hasPart)
    node.hasPart = s.hasPart.map((p) => ({
      "@type": "WebPage",
      "@id": p.url,
      name: p.name,
    }));
  return node;
}

const faqNode = (base, items) => ({
  "@type": "FAQPage",
  "@id": `${base}#faq`,
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
});

const serviceNode = (data) => {
  const s = data.schema;
  const page = { "@id": `${data.canonical}#webpage` };
  return {
    "@type": "Service",
    "@id": `${data.canonical}#service`,
    name: s.service.name,
    serviceType: s.service.serviceType,
    provider: org,
    areaServed: site.areaServed,
    description: s.service.description,
    inLanguage: site.lang,
    isPartOf: page,
    mainEntityOfPage: page,
    image: { "@id": s.image.url },
  };
};

const workNode = (data) => {
  const s = data.schema;
  const page = { "@id": `${data.canonical}#webpage` };
  return {
    "@type": "CreativeWork",
    "@id": `${data.canonical}#work`,
    name: data.title,
    creator: org,
    about: org,
    datePublished: s.datePublished,
    dateModified: s.dateModified,
    description: data.description,
    inLanguage: site.lang,
    isPartOf: page,
    mainEntityOfPage: page,
    image: { "@id": s.image.url },
  };
};

const videoNode = (v) => ({
  "@type": "VideoObject",
  "@id": `${v.contentUrl}#video`,
  name: v.name,
  description: v.description,
  thumbnailUrl: v.thumbnailUrl,
  uploadDate: v.uploadDate,
  duration: v.duration,
  embedUrl: v.embedUrl,
  contentUrl: v.contentUrl,
  publisher: org,
  creator: org,
  inLanguage: site.lang,
});

export function buildGraph(data) {
  const s = data.schema;
  if (!s || !s.type) return null;
  const base = data.canonical;
  const graph = [shared.place, shared.organization];
  graph.push(
    s.search
      ? {
          ...shared.website,
          potentialAction: {
            "@type": "SearchAction",
            target: `${site.url}/?s={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }
      : shared.website,
  );
  if (s.breadcrumb) graph.push(breadcrumbNode(base, s.breadcrumb));
  graph.push(pageNode(data));
  if (s.faq) graph.push(faqNode(base, s.faq));
  if (s.image) graph.push(imageNode(s.image));
  if (s.service) graph.push(serviceNode(data));
  if (s.work) graph.push(workNode(data));
  if (s.video) graph.push(videoNode(s.video));
  return graph;
}

export default {
  jsonld: (data) => {
    const graph = buildGraph(data);
    if (!graph) return undefined;
    return `${JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)}\n`;
  },
};
