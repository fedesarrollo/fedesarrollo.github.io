/* ============================================================================
   tables.js - the Minimum Wages rules matrix
   ============================================================================
   Ports minwage_rules_display (minwage.R:193), minwage_rules_reactable (:226)
   and minwage_rules_vertical_ui (:330).

   THE TABLE IS CUT INTO COLUMN FAMILIES, AND THE CUT IS COLUMNS, NEVER ROWS.
   Eleven columns, three of them prose, is a horizontal scroll on any laptop,
   and the families answer different questions: at what frequency the wage is
   legislated, how long the working day is, and which norm says so. All eleven
   countries stay on screen in every cut, so no cut can read as "these
   countries have no rule".
   ========================================================================= */

import { h } from "../../ui/dom.js";
import { renderTable, naturalWidth, verticalTable } from "../../ui/table.js";
import { constants } from "../../core/format.js";

const DASH = "–";   /* en dash: "the source does not state one" */

/* R's formatC(x, format = "fg", digits = 3): three SIGNIFICANT digits, with no
   trailing zeros and no exponent for numbers of this size (40, 44, 8, 190.64).
   `toPrecision` then strips a trailing ".00" the way %fg does. */
function sig3(x) {
  if (x === null || x === undefined || Number.isNaN(x)) return DASH;
  return String(Number(Number(x).toPrecision(3)));
}

/* minwage.R:193. The single source of truth for both the table and the XLSX
   download. Joins mw_rules to mw_workday by country, and the R version asserts
   the two line up -- a mismatch would silently attach one country's working
   time to another's rules. */
export function rulesDisplay({ rules, workday }) {
  const wd = new Map(workday.toRows().map((r) => [r.country, r]));
  return rules.toRows().map((r) => {
    const w = wd.get(r.country);
    if (!w) throw new Error(`mw_workday has no row for ${r.country}`);
    const yn = (x) => (x === 1 ? "Yes" : "No");
    return {
      Country: r.country,
      Monthly: yn(r.monthly),
      Daily: yn(r.daily),
      Hourly: yn(r.hourly),
      "Hours/day": sig3(w.hours_day),
      "Days/week": sig3(w.days_week),
      "Hours/week": sig3(w.hours_week),
      "Also set by law": w.alt_label ?? DASH,
      "Full-time workday": r.workday_def,
      "Part-time thresholds": r.parttime_def,
      Regulation: r.regulation,
    };
  });
}

/* minwage.R:226 */
export function rulesTable(rows, group) {
  const K = constants();
  const groups = K.MINWAGE_RULES_GROUPS;
  const cols = groups[group];

  /* THE GROUPS MUST PARTITION THE NON-COUNTRY COLUMNS, and this assert is what
     makes that enforceable. Without it a column added to rulesDisplay() and
     not placed in a group would simply be unreachable from every cut but
     "All" -- invisible, with no error. `Country` is in no group: it is the key,
     prepended to every cut. */
  const all = Object.values(groups).flatMap((g) => g ?? []);
  const shown = Object.keys(rows[0]).filter((n) => n !== "Country");
  const missing = shown.filter((n) => !all.includes(n));
  const extra = all.filter((n) => !shown.includes(n));
  if (missing.length || extra.length) {
    throw new Error(
      "MINWAGE_RULES_GROUPS no longer partitions the rules columns. "
      + `Not in any group: [${missing}]. In a group but not in the table: [${extra}].`);
  }

  const names = cols ? ["Country", ...cols] : Object.keys(rows[0]);

  /* Both colours were live WCAG 1.4.3 failures: the old cyan measured 2.08:1
     and the old grey 1.91:1 against the cell background, i.e. the tick and the
     dash were the two least legible things in a table of prose. The glyph
     carries the meaning either way, but a reader who cannot see the tick
     cannot read the column at all. */
  const tickCol = {
    align: "center",
    cell: (v) => (v === "Yes" ? "✓" : DASH),
    style: (v) => (v === "Yes"
      ? { color: K.FED_INK_DEEP, fontWeight: "700" }   /* 11.1:1 */
      : { color: "#6B7078" }),                         /* 4.98:1 */
  };
  /* Narrow and centred: one- or two-character figures, which at the default
     120px minimum left the two prose columns squeezed. */
  const numCol = { align: "center", minWidth: 90 };

  const columns = {
    Country: { sticky: "left", minWidth: 130, align: "center",
               style: () => ({ fontWeight: "600", textAlign: "center" }) },
    Monthly: tickCol, Daily: tickCol, Hourly: tickCol,
    "Hours/day": numCol, "Days/week": numCol, "Hours/week": numCol,
    "Also set by law": { minWidth: 260 },
    /* The two prose columns carry the bulk of Cuadro 1 and need the room. */
    "Full-time workday": { minWidth: 280 },
    "Part-time thresholds": { minWidth: 320 },
    Regulation: { minWidth: 200 },
  };

  return h("div", null,
    h("h3.section-title", null, "Minimum-wage rules and full-time definitions"),
    /* One reading instruction per cut, with the country-scope caveat appended
       to every one of them rather than repeated in each: it is a property of
       the source, not of the cut, and a reader who lands on a narrow cut must
       still see it. */
    h("p", { style: { fontSize: "0.9375rem", color: "#555", margin: "0 0 8px" } },
      `${K.MINWAGE_RULES_GROUP_NOTES[group]} ${K.MINWAGE_RULES_SCOPE_NOTE}`),
    renderTable(rows, {
      order: names, columns,
      maxWidth: naturalWidth(names, columns),
    }));
}

/* minwage.R:319. Transposes one country's row. Returns null for US4 and Spain,
   which have no Cuadro 1 row -- and that null is load-bearing: the XLSX button
   is hidden when there is no frame, where it used to fall back to the full
   eleven-country matrix and hand the reader eleven OTHER countries' rules
   under a heading that had just said this country has none. */
export function rulesVertical(rows, country) {
  const row = rows.find((r) => r.Country === country);
  if (!row) return null;
  return Object.keys(row)
    .filter((k) => k !== "Country")
    .map((k) => [k, row[k]]);
}

export function rulesVerticalUi(rows, country) {
  const pairs = rulesVertical(rows, country);
  if (!pairs) {
    return h("div", null,
      h("h3.section-title", null, `Minimum-wage rules — ${country}`),
      h("p", { style: { fontSize: "0.9375rem", color: "#555" } },
        "No minimum-wage rules available for this country."));
  }
  return h("div", null,
    h("h3.section-title", null, `Minimum-wage rules — ${country}`),
    verticalTable(pairs, { fieldWidth: "34%" }));
}

/* minwage.R:436. The flag row's badge and the chart heading both read this, so
   the row can never promise "7 rates" over a heading that says "single rate". */
export function rateCounts(dispersion) {
  const out = {};
  for (const c of dispersion.column("country")) out[c] = (out[c] ?? 0) + 1;
  return out;
}
