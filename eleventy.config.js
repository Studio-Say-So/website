import { HtmlBasePlugin } from "@11ty/eleventy";

// "/" for the custom domain; "/website/" for the github.io preview deploy.
const pathPrefix = process.env.PATH_PREFIX || "/";

export default function (eleventyConfig) {
  // Rewrites root-relative href/src in the output to include pathPrefix, so
  // the sources stay written for the real domain.
  eleventyConfig.addPlugin(HtmlBasePlugin);

  // Media and vendored plugin assets keep their WordPress paths so that
  // already-cached OG images and external hotlinks keep resolving.
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/wp-content");
  eleventyConfig.addPassthroughCopy("src/wp-includes");
  eleventyConfig.addPassthroughCopy("src/CNAME");
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  eleventyConfig.setServerOptions({ showAllHosts: true });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    pathPrefix,
  };
}
