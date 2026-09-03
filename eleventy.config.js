import { HtmlBasePlugin } from "@11ty/eleventy";
import jsonldComputed from "./lib/jsonld.js";
import titleComputed from "./lib/title.js";
import faq from "./lib/faq.js";
import site from "./lib/site.js";
import tenure from "./lib/tenure.js";

// "/" for the custom domain; "/website/" for the github.io preview deploy.
const pathPrefix = process.env.PATH_PREFIX || "/";

export default function (eleventyConfig) {
  // Rewrites root-relative href/src in the output to include pathPrefix, so
  // the sources stay written for the real domain.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Eleventy does not pick up _data/eleventyComputed.js here; register it explicitly.
  eleventyConfig.addGlobalData("eleventyComputed", { ...titleComputed, ...jsonldComputed });
  eleventyConfig.addGlobalData("faq", faq);
  eleventyConfig.addGlobalData("site", site);
  eleventyConfig.addGlobalData("tenure", tenure);

  const MIME = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  eleventyConfig.addFilter("mimeType", (url) => MIME[String(url).split(".").pop().toLowerCase()]);

  // Media now lives under assets/; the cutover needs a redirect from the old
  // wp-content/uploads paths, which README.md records.
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/robots.txt");


  // HtmlBasePlugin rewrites href/src but not url() inside inline styles, so
  // every CSS background 404s under a path prefix. Patch those too.
  if (pathPrefix !== "/") {
    eleventyConfig.addTransform("prefix-css-urls", function (content) {
      if (!(this.page.outputPath || "").endsWith(".html")) return content;
      const p = pathPrefix.replace(/\/+$/, "");
      return content.replace(
        /url\((\s*['"]?)(\/(?!\/)[^)'"]*)(['"]?\s*)\)/g,
        (m, a, path, b) => (path.startsWith(p + "/") ? m : `url(${a}${p}${path}${b})`),
      );
    });
  }

  eleventyConfig.setServerOptions({ showAllHosts: true });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    pathPrefix,
  };
}
