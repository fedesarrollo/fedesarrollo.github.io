/* ============================================================================
   tables.js - the Business Taxes detail blocks
   ============================================================================
   Ports btax_cit_display (btax.R:163), btax_cit_vertical_ui (:264) and
   btax_regimes_block (:757).

   THE RULES LEFT THE ACROSS VIEW AND BECAME A SECTION OF THE BY-COUNTRY ONE.
   The 17 x 11 matrix (eight columns of long prose) was a wall of text no
   column cut made readable, so the across view carries the rate chart alone
   and the same content is read one jurisdiction at a time. The WHOLE matrix is
   still downloadable from the across Downloads drawer -- that is the one thing
   a vertical layout cannot give: a cross-country file.

   btax_cit_reactable() and BTAX_CIT_GROUPS are therefore CALLERLESS in the R
   code and are not ported. Note that their partition assert stopped running
   when the matrix moved, so reviving them means reviving the check too.
   ========================================================================= */

import { h } from "../../ui/dom.js";
import { verticalTable } from "../../ui/table.js";
import { constants } from "../../core/format.js";

/* btax.R:163. `general_rate_raw` is deliberately excluded -- the display
   carries the parsed text, and the raw string stays in the data. */
const CIT_COLUMNS = [
  ["Tax", "tax_name"],
  ["Taxable base", "taxable_base"],
  ["General rate", "general_rate_text"],
  ["Full exemptions", "full_exemptions"],
  ["Rate reductions", "rate_reductions"],
  ["Base reductions", "base_reductions"],
  ["Liability reductions", "liability_reductions"],
  ["Surcharges", "surcharges"],
  ["Foreign business", "foreign_treatment"],
  ["Legislation", "legislation"],
];

export function citDisplay(citMatrix) {
  return citMatrix.toRows().map((m) => {
    const o = { Country: m.country, __code: m.code };
    for (const [label, key] of CIT_COLUMNS) o[label] = m[key];
    return o;
  });
}

/* The cross-country file the across Downloads drawer serves. */
export function citDownload(citMatrix) {
  return citDisplay(citMatrix).map(({ __code, ...rest }) => rest);
}

/* btax.R:264 */
export function citVerticalUi(citMatrix, code) {
  const K = constants();
  const name = K.BTAX_CODE_TO_NAME[code] ?? code;
  const header = h("h3.section-title", null, `Corporate income tax — ${name}`);

  const row = citDisplay(citMatrix).find((r) => r.__code === code);
  if (!row) {
    return h("div", null, header,
      h("p", { style: { fontSize: "0.9375rem", color: "#555" } },
        "No corporate income tax matrix row for this jurisdiction."));
  }
  /* `pre-line`, not `normal`: several CIT values are multi-line lists
     ("1. IRPJ:\n a) Lucro Real:") and collapsing the newlines runs them
     together. */
  return h("div", null, header,
    verticalTable(CIT_COLUMNS.map(([label]) => [label, row[label]]),
                  { fieldWidth: "30%", preLine: true }));
}

/* btax.R:757. Deliberately NOT a count chart: counting regimes would need the
   mechanism taxonomy the workbook does not carry, and a bar saying "Peru 4,
   Bolivia 1" hides that Peru's NRUS is a fixed monthly payment, its RER a
   turnover tax, and its fourth row the GENERAL regime. */
const KIND_LABEL = { simplified: "Simplified regimes", special: "Special regimes" };

export function regimesBlock(regimes, code) {
  if (!code) throw new Error("regimesBlock: a jurisdiction code is required");
  const K = constants();
  const name = K.BTAX_CODE_TO_NAME[code] ?? code;
  const rows = regimes.where({ code }).toRows();

  const sub = (style) => ({ fontSize: "0.9375rem", color: "#555", ...style });

  const block = (kind) => {
    const of = rows.filter((r) => r.kind === kind);
    if (!of.length) return null;
    /* has_regime = FALSE IS A STATED ABSENCE, not a missing row: the workbook
       writes "California does not operate a presumptive regime" as the regime.
       Dropping those rows would turn a fact into a gap. */
    const absent = of.filter((r) => r.has_regime !== true);
    const present = of.filter((r) => r.has_regime === true);

    return h("div", null,
      h("h4", { style: { fontSize: "1rem", color: "var(--fede-azul-deep)",
                         margin: "16px 0 6px", fontWeight: "700" } },
        KIND_LABEL[kind]),
      absent.length
        ? h("p", { style: sub({ margin: "0 0 8px" }) },
            absent.map((r) => r.absence_note).join(" "))
        : null,
      present.length
        ? verticalTable(present.map((r) => [
            r.regime_name,
            h("div", null,
              h("div", { style: { whiteSpace: "pre-line" } }, r.description),
              r.eligibility
                ? h("div", { style: { marginTop: "6px", color: "#777",
                                      whiteSpace: "pre-line" } },
                    h("em", null, "Who qualifies: "), r.eligibility)
                : null,
              /* The regime's OWN law, which is not the corporate-tax law in
                 the CIT row above and appears nowhere else in the app. 102 of
                 the 104 regime rows carry one. */
              r.legislation && String(r.legislation).trim()
                ? h("div", { style: { marginTop: "6px", color: "#777",
                                      whiteSpace: "pre-line" } },
                    h("em", null, "Legal basis: "), String(r.legislation).trim())
                : null),
          ]), { fieldWidth: "26%", valueHtml: false })
        : null);
  };

  return h("div", null,
    h("h3.section-title", { style: { marginTop: "18px" } },
      `Simplified and special regimes — ${name}`),
    h("p", { style: sub({ margin: "0 0 8px" }) },
      "Every regime the workbook lists for this jurisdiction, as it describes them."
      + " They are not counted against each other: a fixed monthly payment and a tax on"
      + " turnover are both “one regime” and are not the same thing."),
    rows.length
      ? h("div", null, block("simplified"), block("special"))
      : h("p", { style: sub() },
          "The workbook lists no regimes for this jurisdiction."));
}
