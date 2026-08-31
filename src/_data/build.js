// Preview deploys (github.io subpath) must not be indexed alongside the real site.
export default {
  preview: (process.env.PATH_PREFIX || "/") !== "/",
};
