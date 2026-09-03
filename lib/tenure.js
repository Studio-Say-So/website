// Years in business, spelled out to match the copy's voice. Computed at build
// time, so the figure only refreshes when the site is rebuilt.
import site from "./site.js";

const WORDS = [
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen", "twenty", "twenty-one", "twenty-two",
  "twenty-three", "twenty-four", "twenty-five", "twenty-six", "twenty-seven",
  "twenty-eight", "twenty-nine", "thirty",
];

// Completed years only: the count rises on the anniversary, not on 1 January.
export function yearsSince(founded, now) {
  const from = new Date(`${founded}T00:00:00Z`);
  const passed =
    now.getUTCMonth() > from.getUTCMonth() ||
    (now.getUTCMonth() === from.getUTCMonth() && now.getUTCDate() >= from.getUTCDate());
  return now.getUTCFullYear() - from.getUTCFullYear() - (passed ? 0 : 1);
}

export const inWords = (years) => WORDS[years - 10] || String(years);

const years = yearsSince(site.founded, new Date());

export default { years, words: inWords(years) };
