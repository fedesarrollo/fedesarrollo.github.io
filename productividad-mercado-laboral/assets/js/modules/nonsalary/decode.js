/* ============================================================================
   decode.js - turning the stored labels into Scenario / Type
   ============================================================================
   Ports prepare_payer_data (plots.R:1044), prepare_all_payer_data (:1071) and
   prepare_all_component_data (:1096).

   THE DATA ENCODES TWO DIMENSIONS IN ONE STRING COLUMN. A row's label is
   something like "total_cost_employer_min" or "min_max_pension_max", and the
   charts need the Min/Max scenario and the payer or component separately. The R
   code recovers them with substring matching, and so does this.

   THE DECODERS ARE DUAL-SCHEMA, and that is not redundancy: the cross-country
   frames name the column `type_by_payer` / `type_by_component` and the
   within-country ones `min_max_payer` / `min_max_component`, with different
   label spellings in each. One frame of each pair feeds the same chart shape,
   so the decoder has to read both. Getting this wrong does not error -- it
   produces an all-NA factor and a chart with no bars.
   ========================================================================= */

import { summarize, orderBy } from "../../data/verbs.js";

export const SCENARIOS = ["Min", "Max"];
export const PAYERS = ["Employee", "Employer"];
export const COMPONENTS = ["Pensions", "Health", "Occupational Risk",
                           "Bonuses and Benefits", "Payroll Taxes"];

const isMin = (label) => /_min$/.test(String(label));

/* plots.R:1044. `aggregate` is for payroll taxes, whose rows are one per named
   tax: they are SUMMED per (country, wage, label) first, and an all-NA group
   stays NA rather than collapsing to 0 -- "no payroll taxes" and "zero" are
   different statements. */
export function preparePayer(rows, { aggregate = false } = {}) {
  let d = rows;
  if (aggregate) {
    d = summarize(d, ["country", "wage", "min_max_payer"], {
      value: (g) => {
        const nums = g.map((r) => r.value).filter((v) => typeof v === "number" && !Number.isNaN(v));
        return nums.length ? nums.reduce((a, v) => a + v, 0) : null;
      },
    });
    /* dplyr's group_by + summarize returns the groups SORTED by the grouping
       columns, and that reordering is visible in the chart: the payroll-tax
       labels sort "..._max" before "..._min", so the captured payer stack has
       x = ["Max", "Min"] where every other one has ["Min", "Max"]. Sorting
       here reproduces it by construction instead of special-casing the axis
       order for one category. */
    d = orderBy(d, "country", "wage", "min_max_payer");
  }
  return d
    .map((r) => ({
      ...r,
      Scenario: isMin(r.min_max_payer) ? "Min" : "Max",
      Type: /employer/.test(String(r.min_max_payer)) ? "Employer" : "Employee",
    }))
    .filter((r) => r.value !== null && r.value !== undefined && !Number.isNaN(r.value));
}

/* plots.R:1071 */
export function prepareAllPayer(rows) {
  if (!rows.length) return [];
  if ("type_by_payer" in rows[0]) {
    return rows.map((r) => ({
      country: r.country, value: r.value,
      Scenario: isMin(r.type_by_payer) ? "Min" : "Max",
      /* NOTE the anchor: `^total_cost_employer`, not a bare "employer".
         "total_cost_employee_min" contains neither, so an unanchored test
         would still work here -- but the within schema below needs the loose
         one and the cross schema the anchored one, which is why they differ. */
      Type: /^total_cost_employer/.test(String(r.type_by_payer)) ? "Employer" : "Employee",
    }));
  }
  if ("min_max_payer" in rows[0]) {
    return rows.map((r) => ({
      country: r.country, wage: r.wage, value: r.value,
      Scenario: isMin(r.min_max_payer) ? "Min" : "Max",
      Type: /employer/.test(String(r.min_max_payer)) ? "Employer" : "Employee",
    }));
  }
  return [];
}

/* plots.R:1096. The final fallback is "Payroll Taxes" in BOTH branches: a
   label matching none of the four named components is a payroll tax. */
function componentOf(label) {
  const s = String(label);
  if (/_pension/.test(s)) return "Pensions";
  if (/_health/.test(s)) return "Health";
  if (/_bonuses/.test(s)) return "Bonuses and Benefits";
  if (/_occupational/.test(s)) return "Occupational Risk";
  return "Payroll Taxes";
}

export function prepareAllComponent(rows) {
  if (!rows.length) return [];
  const col = "type_by_component" in rows[0] ? "type_by_component"
    : "min_max_component" in rows[0] ? "min_max_component" : null;
  if (!col) return [];
  return rows.map((r) => ({
    country: r.country, wage: r.wage, value: r.value,
    Scenario: isMin(r[col]) ? "Min" : "Max",
    Type: componentOf(r[col]),
  }));
}

/* plots.R:269. The four bonus components. BOTH schemas are needed: the cross
   frame carries a `component` column of short codes (ab/pl/ob/up) AND the
   label column, while the within frame has only the label. */
export const BONUS_COMPONENT = {
  ab: "annual_bonuses", pl: "paid_leave",
  up: "unemployment_protection", ob: "other_bonuses",
};

/* plots.R:2950. The bonus series names. This is NOT what prepareAllComponent
   derives: componentOf() maps anything matching `_bonuses` to "Bonuses and
   Benefits" and everything else to "Payroll Taxes", which for this frame puts
   paid_leave and unemployment_protection under Payroll Taxes. The bonus
   breakdown needs its own mapping, and the label is the long display form. */
const BONUS_LABEL = {
  ab: "Annual and Other Periodic Bonuses",
  pl: "Paid Leave",
  up: "Unemployment Protection",
  ob: "Other Bonuses",
};

const BONUS_LABEL_BY_KEY = {
  annual_bonuses: BONUS_LABEL.ab,
  paid_leave: BONUS_LABEL.pl,
  unemployment_protection: BONUS_LABEL.up,
  other_bonuses: BONUS_LABEL.ob,
};

export function prepareBonus(rows) {
  if (!rows.length) return [];
  const hasCode = "component" in rows[0];
  return rows.map((r) => {
    const label = r.min_max_component ?? r.type_by_component ?? "";
    let type = null;
    if (hasCode) {
      type = BONUS_LABEL[r.component] ?? null;
    } else {
      for (const [key, name] of Object.entries(BONUS_LABEL_BY_KEY)) {
        if (String(label).includes(key)) { type = name; break; }
      }
    }
    return {
      country: r.country, wage: r.wage, value: r.value,
      Scenario: isMin(label) ? "Min" : "Max",
      Type: type,
    };
  }).filter((r) => r.Type !== null);
}

export function filterBonusComponent(rows, code) {
  if (!code || code === "all_bonuses") return rows;
  const want = BONUS_COMPONENT[code];
  if (!want) return rows;
  if (rows.length && "component" in rows[0]) {
    return rows.filter((r) => r.component === code);
  }
  return rows.filter((r) => new RegExp(want).test(String(r.min_max_component
    ?? r.type_by_component ?? "")));
}

/* plots.R:627. The countries a frame has nothing to show for: every value
   non-positive or non-finite, plus any candidate absent from the frame
   altogether. Drives the payroll-tax and occupational-risk drops, which is
   why the across view shows 11 and 12 panels for those. */
export function findMissingCountries(rows, candidates = []) {
  const maxBy = summarize(rows, ["country"], {
    max: (g) => {
      const nums = g.map((r) => r.value)
        .filter((v) => typeof v === "number" && Number.isFinite(v));
      return nums.length ? Math.max(...nums) : null;
    },
  });
  const empty = maxBy.filter((r) => r.max === null || r.max <= 0).map((r) => r.country);
  const present = new Set(rows.map((r) => r.country));
  const absent = candidates.filter((c) => !present.has(c));
  return [...new Set([...empty, ...absent])];
}
