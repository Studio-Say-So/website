// Page titles are stored without the site name; everything that renders a
// title reads the composed form. The home page inverts the order, so it opts out.
import site from "./site.js";

export default {
  pageTitle: (data) =>
    data.titleSuffix === false ? data.title : `${data.title} | ${site.name}`,
};
