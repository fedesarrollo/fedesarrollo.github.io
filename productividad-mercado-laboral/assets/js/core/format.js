/* ============================================================================
   format.js - port of global_aux/formatters.R
   ============================================================================
   Display helpers, one-for-one with the R originals. The country maps and
   palettes come from site/data/constants.json, which the build step evaluates
   out of global_aux/constants.R -- so there is one definition of
   COUNTRY_NAME_MAP, not a hand-copied second one.

   `init(constants)` must be called before anything else here; main.js does it
   once, right after the constants fetch.

   ONE HELPER IS NOT REIMPLEMENTED: format_legend_title_case() runs R's
   tools::toTitleCase(), whose minor-word list is an implementation detail of
   the R distribution. Reproducing it from memory is exactly the kind of
   near-miss that shows up as one wrong legend entry months later, so the build
   step precomputes the mapping for every label the app can actually show (the
   input set is finite: the payroll-tax component names in the data, plus the
   palette keys) and this file is a lookup over it. See titleCase() below.
   ========================================================================= */

let K = null;            // the constants bundle
let TITLE_CASE = {};     // raw label -> R's toTitleCase result

export function init(constants, titleCaseMap = {}) {
  K = constants;
  TITLE_CASE = titleCaseMap;
}

export function constants() {
  if (!K) throw new Error("format.init(constants) has not been called");
  return K;
}

/* ---- countries ---------------------------------------------------------- */

/* formatters.R:5. Unmapped or empty input is returned unchanged. */
export function countryDisplayName(code) {
  if (code === null || code === undefined || code === "") return code;
  return K.COUNTRY_NAME_MAP[String(code).toUpperCase()] ?? code;
}

/* formatters.R:24. The canonical left-to-right order for every cross-country
   axis: alphabetical, then US4, then Spain, both pinned to the very end.

   It matches BOTH ISO3 codes and display names, because non-salary is keyed by
   code ("ESP") and minwage/firing by display name ("Spain"). Modules whose
   data have neither -- firing, which the report covers for the 11 LAC
   countries only -- just get the alphabetical order. */
export function orderCountries(xs) {
  const seen = new Set();
  const uniq = [];
  for (const x of xs) {
    if (x === null || x === undefined || x === "") continue;
    const s = String(x);
    if (!seen.has(s)) { seen.add(s); uniq.push(s); }
  }
  if (!uniq.length) return uniq;

  const espName = K.COUNTRY_NAME_MAP.ESP;          // "Spain"
  const isUs4 = (x) => x === "US4";
  const isEsp = (x) => x === "ESP" || x === espName || x === "Spain";

  const rest = uniq.filter((x) => !isUs4(x) && !isEsp(x))
                   .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return [...rest, ...uniq.filter(isUs4), ...uniq.filter(isEsp)];
}

/* formatters.R:76 */
export function countryPhrase(countries) {
  const cs = (countries ?? []).filter((c) => c !== null && c !== undefined);
  if (!cs.length || cs.includes("All")) return "across countries";
  if (cs.length === 1) return `in ${countryDisplayName(cs[0])}`;
  return "across selected countries";
}

/* ---- wage levels -------------------------------------------------------- */

/* formatters.R:35. "5sm" -> "5 MW".
   THE DATA STORES THE LABEL AND THE STATE STORES THE CODE, so every filter has
   to go through here. That asymmetry is inherited, not introduced. */
export function wageLabel(code) {
  const cs = (Array.isArray(code) ? code : [code]).filter((c) => c != null);
  const out = cs.map((c) => `${String(c).slice(0, -2)} MW`);
  return Array.isArray(code) ? out : out[0];
}

const WAGE_WORDS = { 1: "one", 2: "two", 5: "five", 10: "ten", 15: "fifteen" };

/* formatters.R:46 */
export function wagePhrase(code) {
  const cs = (Array.isArray(code) ? code : [code]).filter((c) => c != null);
  if (cs.length !== 1) return "selected minimum wage levels";
  const n = parseInt(String(cs[0]).replace("sm", ""), 10);
  if (Number.isNaN(n)) return wageLabel(cs[0]);
  const word = WAGE_WORDS[n] ?? String(n);
  return `${word} minimum wage${n === 1 ? "" : "s"}`;
}

/* ---- tenure ------------------------------------------------------------- */

/* formatters.R:169 */
export function tenureLabel(v) {
  if (v === null || v === undefined || v === "") return "";
  const n = Array.isArray(v) ? v[0] : v;
  return `${n} year${Number(n) === 1 ? "" : "s"}`;
}

/* formatters.R:183 */
export function tenurePhrase(v) {
  const l = tenureLabel(v);
  return l ? `(tenure: ${l})` : "";
}

/* ---- label casing ------------------------------------------------------- */

/* formatters.R:90. The Spanish/Portuguese function words that English-only
   title casing wrongly capitalises ("Prima De Servicios"). Restored to
   lowercase UNLESS they open the label, which is what keeps "El Salvador"
   intact. */
const MINOR_WORDS = new Set([
  "de", "del", "la", "las", "el", "los", "y", "e",
  "en", "con", "para", "por",
  "da", "das", "do", "dos", "na", "nas", "ao", "aos",
]);

/* formatters.R:96 */
export function lowercaseMinorWords(text) {
  const words = String(text).split(" ");
  if (words.length <= 1) return String(text);
  return words
    .map((w, i) => (i !== 0 && MINOR_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w))
    .join(" ");
}

/* formatters.R:108. The lookup is the precomputed R result; the fallback is a
   plain word-initial capitalisation, used only for a label the build step did
   not see. It WARNS rather than failing quietly, because a miss here means the
   data grew a value the exporter's label sweep does not cover. */
export function titleCase(label) {
  if (label === null || label === undefined || label === "") return label;
  const raw = String(label);
  const normalized = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();

  let cased = TITLE_CASE[normalized];
  if (cased === undefined) {
    if (normalized !== raw || !/^[A-Z]/.test(normalized)) {
      console.warn(`format.titleCase: no precomputed casing for "${normalized}"`);
    }
    cased = lowercaseMinorWords(
      normalized.replace(/\b[a-z]/g, (c) => c.toUpperCase()));
  }
  return cased.replace(/\bUs4\b/g, "US4").replace(/\bMw\b/g, "MW");
}

/* formatters.R:132 */
export function restoreAcronyms(title) {
  return String(title)
    .replace(/\bus4\b/gi, "US4")
    .replace(/\bmw\b/gi, "MW");
}

/* formatters.R:138. Lowercase everything, restore the two acronyms, then
   capitalise the first letter. This is the app's default (
   PLOT_TITLE_USE_TITLE_CASE is FALSE), so it is the only branch ported. */
export function sentenceCase(title) {
  if (title === null || title === undefined || title === "") return title;
  const t = restoreAcronyms(String(title).toLowerCase());
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/* ---- numbers ------------------------------------------------------------ */

/* minwage.R:160/165. `digits` is decided ONCE PER CHART from its largest
   value, and must be passed explicitly when formatting a subset -- otherwise
   each trace picks its own convention and one chart mixes "17,557" with
   "9,053.43". The separator is a space when the symbol ends in a letter
   ("L 12,141", "Bs 2,750") and nothing otherwise ("$529,000"). */
export function moneyDigits(values) {
  const v = values.filter((x) => typeof x === "number" && !Number.isNaN(x));
  return v.length && Math.max(...v) >= 10000 ? 0 : 2;
}

export function money(value, currency, { withSymbol = true, digits = null } = {}) {
  const vals = Array.isArray(value) ? value : [value];
  const d = digits ?? moneyDigits(vals);
  const sym = withSymbol
    ? (K.MINWAGE_CURRENCY_SYMBOL?.[currency] ?? currency ?? "")
    : "";
  const sep = /[A-Za-z]$/.test(sym) ? " " : "";
  const fmt = (x) =>
    sym + sep + x.toLocaleString("en-US", { minimumFractionDigits: d,
                                            maximumFractionDigits: d });
  const out = vals.map(fmt);
  return Array.isArray(value) ? out : out[0];
}

/* NOTE ON PRINTED DECIMALS: JS toFixed() and R's sprintf("%.Nf") agree
   exactly, including on the awkward cases -- both give 25.34 for 25.345 and
   26.13 for 26.134999999999998, because both work on the stored double rather
   than on the decimal it looks like. An "R-faithful" rounding helper was
   written here and removed again: it rounded the half away from zero and
   therefore disagreed with R on exactly the values it was meant to fix. Use
   toFixed. What DID need fixing was upstream -- the export was rounding to
   3 decimals, which turned 26.134999999999998 into 26.135 and the label from
   26.13 into 26.14. */

/* constants.R:132. Round HALF UP on purpose: R's round() is half-to-even, so
   round(12.5) gave 12 and round(22.5) gave 22 -- one pixel under the 13 and 23
   the type scale promises, which put every value label below the 13px floor.
   floor(x + 0.5) is what makes the code match the documentation. */
export function fs(size) {
  return Math.floor(size * constants().PLOTLY_FONT_SCALE + 0.5);
}
