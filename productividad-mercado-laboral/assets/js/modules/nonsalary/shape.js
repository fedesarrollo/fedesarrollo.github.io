/* ============================================================================
   shape.js - from a spec to the rows, panels and series a figure needs
   ============================================================================
   The one place that knows how a selection becomes data: filter, decode,
   drop the countries with nothing to show, and work out what the panels and
   the series are. Everything downstream (traces.js) is then mechanical.
   ========================================================================= */

import { orderCountries, wageLabel, titleCase } from "../../core/format.js";
import { orderBy, presentIn, summarize } from "../../data/verbs.js";
import { preparePayer, prepareAllPayer, prepareAllComponent, prepareBonus,
         filterBonusComponent, findMissingCountries } from "./decode.js";
import { resolvePalette } from "./palette.js";
import { DROP } from "./spec.js";

/* The data stores the wage LABEL ("5 MW") and the state stores the CODE
   ("5sm"), so every filter goes through here. Inherited asymmetry. */
function wageLabels(codes) {
  return (Array.isArray(codes) ? codes : [codes]).map((c) => wageLabel(c));
}

/* Decode a frame's rows into {country, wage, Scenario, Type, value}. */
function decodeRows(spec, rows) {
  switch (spec.decode) {
    case "payer":
      return spec.aggregate ? preparePayer(rows, { aggregate: true })
                            : prepareAllPayer(rows);
    case "component":
      return prepareAllComponent(rows);
    case "bonus":
      /* NOT prepareAllComponent: that maps `_bonuses` to "Bonuses and
         Benefits" and everything else to "Payroll Taxes", which is wrong for
         this frame. See prepareBonus. */
      return prepareBonus(rows);
    case "namedComponent":
      /* The within view's payroll breakdown: one series per NAMED tax, so the
         series come from the data's own `component` column rather than from a
         fixed set, and they keep the data's order. */
      /* `min_max_component` is BARE here -- "min" / "max", not
         "payroll_tax_..._min". Three spellings of the same column across the
         frames, so the test has to accept the unsuffixed form or every value
         reads as Max and the chart draws nulls. */
      return rows.map((r) => ({
        country: r.country, wage: r.wage, value: r.value,
        Scenario: /_min$|^min$/.test(String(r.min_max_component)) ? "Min" : "Max",
        Type: r.component,
      }));
    case "total":
    default:
      /* The TOTAL frames carry the scenario in `type` or `min_max_total`. */
      return rows.map((r) => {
        const label = r.type ?? r.min_max_total ?? "";
        return {
          country: r.country, wage: r.wage, value: r.value,
          Scenario: /_min$|^min$/.test(String(label)) ? "Min" : "Max",
          Type: null,
        };
      });
  }
}

export function buildFrame(spec, state, frames) {
  const table = frames[spec.frame];
  if (!table) throw new Error(`buildFrame: frame "${spec.frame}" is not loaded`);

  const wages = wageLabels(state.wages);
  let rows = table.where({
    wage: wages,
    /* `undefined` is ignored, which is what collapses the "All countries" and
       "one country" branches of plots.R -- repeated five times over there --
       into one expression. */
    country: state.view === "within" ? state.country : undefined,
  }).toRows();

  if (spec.decode === "bonus") rows = filterBonusComponent(rows, state.bonusComponent);

  let d = decodeRows(spec, rows);

  /* helpers.R:346. Dropped for the across view's health chart only: the three
     have no separate statutory health contribution to compare. */
  if (spec.health) d = d.filter((r) => !DROP.health.includes(r.country));

  /* plots.R:245/257. A country whose every value is non-positive would draw
     an empty column, so it is dropped from the panel set rather than drawn
     blank. The within view shows an exclusion NOTICE instead, which says why.
     This is what takes the across view to 11 panels for payroll taxes and 12
     for occupational risk. */
  if (spec.dropMissing) {
    const drop = new Set(findMissingCountries(d, DROP[spec.dropMissing] ?? []));
    d = d.filter((r) => !drop.has(r.country));
  }

  /* NOT filtered on value. A country that has no row for the selected bonus
     component still gets its panel, with a null y -- the captured bonus-ob
     figure has all 26 traces and nulls for the nine countries without one.
     Dropping them would silently shrink the panel set, which is what the
     dropMissing filters above are for and must stay the only thing that does
     it. */
  const countries = orderCountries(d.map((r) => r.country));

  /* Title-case the series labels: the payroll-tax component names come out of
     the data in Spanish and Portuguese. */
  if (spec.series === "Type") d = d.map((r) => ({ ...r, Type: titleCase(r.Type) }));

  const { colors, order, ramp } = resolvePalette(spec, state);

  /* Which series the figure draws, in stack order. For the named-tax case the
     series ARE the data, in the data's own order. */
  /* The SCENARIO ORDER comes from the data's own row order, not from a fixed
     ["Min", "Max"]: the payroll-tax payer stack is aggregated through a
     group_by whose sort puts "_max" first, and its captured axis really is
     ["Max", "Min"]. */
  const scenarioOrder = [...new Set(d.map((r) => r.Scenario))];
  const scenarios = ["Min", "Max"].every((x) => scenarioOrder.includes(x))
    ? scenarioOrder : ["Min", "Max"];

  const series = spec.order === "DATA"
    ? [...new Set(d.map((r) => r.Type))]
    : spec.series === "Scenario"
      ? scenarios
      : presentIn(d, "Type", order);

  /* The overflow palette is positional, and TRUNCATES past nine in the R
     code -- a country with more named taxes than that would lose the extras,
     which no country currently has. */
  const colorFor = colors
    ? (name) => colors[name]
    : (name) => ramp[series.indexOf(name) % ramp.length];

  /* Panels. The across view is one per country in the canonical order
     (alphabetical, US4 then Spain pinned last); the within view is a single
     multicategory panel. */
  const panels = state.view === "across" ? countries : [state.country];

  /* plots.R:986. The stacked bonus chart BACK-FILLS every missing
     (Scenario, Type) pair with 0, so a stacked bar keeps its four segments in
     the same order even where a country has no such bonus. Without it a
     country's stack reorders itself and the colours stop meaning the same
     thing across panels. */
  if (spec.zeroFill) {
    const filled = [];
    /* A row that EXISTS with a null value is not "present" for this purpose --
       the captured figure has 0 there, not null -- so the nulls are dropped
       before the missing pairs are filled. */
    const real = d.filter((r) => r.value !== null && r.value !== undefined
                                 && !Number.isNaN(r.value));
    for (const country of panels) {
      const have = real.filter((r) => r.country === country);
      filled.push(...have);
      for (const s of scenarios) {
        for (const t of series) {
          if (!have.some((r) => r.Scenario === s && r.Type === t)) {
            filled.push({ country, wage: have[0]?.wage, Scenario: s, Type: t, value: 0 });
          }
        }
      }
    }
    d = filled;
  }

  return {
    rows: orderBy(d, { key: "Scenario", levels: scenarios }),
    panels,
    series,
    /* The complete stack order, so a filtered within chart can still rank its
       one series where it belongs among all four. */
    fullOrder: order ?? series,
    scenarios,
    colorFor,
    /* True when the By-country view is showing more than one wage level, which
       is what makes its x axis `multicategory` rather than a one-panel
       subplot. */
    compareWages: state.view === "within" && state.wages.length > 1,
    wageLabels: wages,
  };
}

export { summarize };
