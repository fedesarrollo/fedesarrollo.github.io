/* ============================================================================
   tables.js - the Firing Costs regulatory tables
   ============================================================================
   Ports firing_scenarios_wide (firing.R:108), firing_scenario_reactable
   (:221), firing_scenario_vertical_ui (:270), firing_rules_block (:152) and
   the legend and footnote that travel with them.

   `zero` IS NOT `na`, AND THAT IS THE WHOLE POINT OF THE FIFTH DIRECTION.
   Cuadro 6 distinguishes "0" -- the scenario carries no dismissal cost at all
   -- from "<", a reduced one. The original mock mapped "0" to `na`, i.e.
   reported a regulatory fact as a missing value; seven countries have a
   zero-cost voluntary resignation. They must never be merged.

   THE DISMISSAL-RULES TABLE IS ONE COUNTRY ONLY, by design. It used to render
   as an eleven-country <details> accordion at the bottom of the across
   "Scenarios" section -- below a reactable, a legend and a footnote, about as
   far down a page as a table can get. fc_rules is 7 rules x 11 countries of
   free text, which as a cross-country matrix is a wall of prose; that is why
   it had to be an accordion at all. It belongs where the reader has already
   chosen a country, so the function REQUIRES one.
   ========================================================================= */

import { h } from "../../ui/dom.js";
import { renderTable, verticalTable } from "../../ui/table.js";
import { constants } from "../../core/format.js";
import { pivotWider, leftJoin, orderBy } from "../../data/verbs.js";

export const SCENARIO_ORDER = ["Bankruptcy", "Closure", "Resignation", "No notice"];

/* Human-readable direction labels. `zero` and `lower` are distinct facts. */
export const DIR_LABEL = {
  zero: "0 no cost", lower: "↓ lower", equal: "= equal",
  higher: "↑ higher", na: "— n/a",
};

const DOWNLOAD_LABEL = {
  zero: "No cost", lower: "Lower", equal: "Equal", higher: "Higher", na: "N/A",
};

const SUB = { fontSize: "0.9375rem", color: "#555", margin: "0 0 8px" };

/* firing.R:108. The notice column is the fifth column of Cuadro 6 and is FREE
   TEXT, not a direction, so it is merged in rather than pivoted. */
export function scenariosWide({ scenarios, notice }) {
  const order = scenarios.distinct("country");
  const wide = pivotWider(scenarios.toRows(),
                          { id: "country", namesFrom: "scenario", valuesFrom: "direction" });
  const withNotice = leftJoin(wide, notice.toRows(), ["country"], ["notice"]);
  return orderBy(withNotice, { key: "country", levels: order }).map((r) => {
    const o = { Country: r.country };
    for (const s of SCENARIO_ORDER) o[s] = r[s];
    o["Advance notice"] = r.notice ?? "—";
    return o;
  });
}

/* The XLSX the download serves: the same matrix with readable labels. It is
   the SCENARIO MATRIX, never the rules. */
export function scenariosDownload(frames) {
  return scenariosWide(frames).map((r) => {
    const o = { ...r };
    for (const s of SCENARIO_ORDER) o[s] = DOWNLOAD_LABEL[r[s]] ?? r[s];
    return o;
  });
}

/* firing.R:193. `na` is deliberately NOT in the legend: it is the absence of a
   fact, not one of the four directions the matrix encodes. */
function scenarioLegend() {
  const K = constants();
  const items = [
    ["zero", "no dismissal cost"], ["lower", "lower cost"],
    ["equal", "equal"], ["higher", "higher cost"],
  ];
  return h("div.legend", {
    style: { display: "flex", gap: "14px", flexWrap: "wrap",
             margin: "10px 0 4px", fontSize: "0.875rem", color: "#555" },
  }, items.map(([key, label]) => h("span", {
    style: { display: "inline-flex", alignItems: "center", gap: "6px" },
  },
    h("i", { style: { width: "12px", height: "12px", borderRadius: "2px",
                      display: "inline-block",
                      background: K.FIRING_SCENARIO_COLORS[key] } }),
    label)));
}

/* firing.R:214. The report marks Honduras and Mexico with an asterisk. */
function scenarioFootnote() {
  return h("p", { style: { fontSize: "0.875rem", color: "#777", margin: "6px 0 0" } },
    "* In Honduras and Mexico the reduced dismissal cost applies only to workers"
    + " who resign voluntarily at or after 15 years of tenure.");
}

/* firing.R:221. The across view's section 3. */
export function scenarioMatrix(frames) {
  const K = constants();
  const rows = scenariosWide(frames);

  const scenCol = {
    align: "center", minWidth: 110,
    cell: (v) => DIR_LABEL[v] ?? v,
    style: (v) => ({ background: K.FIRING_SCENARIO_COLORS[v],
                     fontWeight: "600", color: K.FED_INK }),
  };
  const columns = {
    Country: { sticky: "left", minWidth: 140, align: "center",
               style: () => ({ fontWeight: "600", textAlign: "center" }) },
    "Advance notice": { header: "Advance notice requirement", minWidth: 230,
                        align: "left",
                        style: () => ({ whiteSpace: "normal", lineHeight: "1.35",
                                        color: K.FED_LABEL }) },
  };
  for (const s of SCENARIO_ORDER) columns[s] = scenCol;

  return h("div", null,
    h("h3.section-title", null, "Dismissal-cost scenarios"),
    h("p", { style: SUB },
      "Direction of the dismissal cost vs an unfair dismissal, by scenario, plus the"
      + " statutory advance-notice requirement."),
    renderTable(rows, { columns, striped: false }),
    scenarioLegend(),
    scenarioFootnote());
}

/* firing.R:270. One country, one scenario per row. */
export function scenarioVerticalUi(frames, country) {
  const K = constants();
  const row = scenariosWide(frames).find((r) => r.Country === country);
  const header = h("h3.section-title", null,
                   `Dismissal-cost scenarios — ${country}`);
  if (!row) {
    return h("div", null, header,
      h("p", { style: SUB },
        "No dismissal-cost scenario data available for this country."));
  }

  const chip = (v) => {
    /* The last row is the advance-notice requirement: free text, not a
       direction key, so it renders plain instead of as a coloured chip. */
    const known = v in K.FIRING_SCENARIO_COLORS;
    return h("span", {
      style: known
        ? { display: "block", background: K.FIRING_SCENARIO_COLORS[v],
            fontWeight: "600", color: K.FED_INK, textAlign: "center",
            padding: "4px 6px", borderRadius: "2px" }
        : { color: K.FED_LABEL, whiteSpace: "normal", lineHeight: "1.35" },
    }, known ? DIR_LABEL[v] : v);
  };

  const pairs = [
    ...SCENARIO_ORDER.map((s) => [s, chip(row[s])]),
    ["Advance notice", chip(row["Advance notice"])],
  ];

  return h("div", null, header,
    h("p", { style: SUB },
      "Direction of the dismissal cost vs an unfair dismissal, by scenario."),
    verticalTable(pairs, { fieldWidth: "40%", valueHtml: false }),
    scenarioLegend(),
    country === "Honduras" || country === "Mexico" ? scenarioFootnote() : null);
}

/* firing.R:152. REQUIRES a country -- see the note at the top of this file. */
export function rulesBlock({ rules }, country) {
  if (!country) throw new Error("rulesBlock: a country is required");
  const levels = rules.distinct("rule");
  const rows = orderBy(rules.where({ country }).toRows(),
                       { key: "rule", levels });

  return h("div", null,
    h("h3.section-title", { style: { marginTop: "18px" } },
      `Dismissal rules — ${country}`),
    h("p", { style: SUB },
      "Table 6 bis of the report: the rule that applies in each situation."),
    /* All eleven By-country countries have rows, so the empty branch is a
       guard rather than a case the UI reaches. */
    rows.length
      ? verticalTable(rows.map((r) => [r.rule, r.description]),
                      { fieldWidth: "34%" })
      : h("p", { style: SUB }, "No dismissal rules available for this country."));
}
