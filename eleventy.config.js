import { HtmlBasePlugin } from "@11ty/eleventy";
import eleventyComputed from "./lib/jsonld.js";

// "/" for the custom domain; "/website/" for the github.io preview deploy.
const pathPrefix = process.env.PATH_PREFIX || "/";

export default function (eleventyConfig) {
  // Rewrites root-relative href/src in the output to include pathPrefix, so
  // the sources stay written for the real domain.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Eleventy does not pick up _data/eleventyComputed.js here; register it explicitly.
  eleventyConfig.addGlobalData("eleventyComputed", eleventyComputed);

  // Media and vendored plugin assets keep their WordPress paths so that
  // already-cached OG images and external hotlinks keep resolving.
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/wp-content");
  eleventyConfig.addPassthroughCopy("src/wp-includes");
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
