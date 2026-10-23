/* ============================================================================
   text.js - the Firing Costs module's prose
   ============================================================================
   Transcribed from tabs/server/firing.R. All of it is sourced: every chart
   reads sheet D1 of firing_costs_2025.xlsx, the workbook behind Figura 10.
   The placeholder flag and FIRING_MOCK_NOTE are gone from this module -- do
   not reinstate either without removing the data with it.
   ========================================================================= */

/* firing.R:75. Note FIRING_SOURCE_NOTE also exists in the R file and is used
   by nothing: all four footers take the tenure note. */
export const TENURE_SOURCE =
  "Source: statutory severance schedules compiled by the authors"
  + " (the calculation behind Figura 10). Costs in monthly salaries; 30-day months.";

const VINTAGE = "Schedules in force in 2025.";

export const VIEW_SUBTITLE = {
  across:
    "The eleven Latin American countries the report covers. Costs are in monthly salaries."
    + " One section at a time: how much a dismissal costs at a given tenure, how that cost"
    + " grows over a career, and how it changes in other separation scenarios.",
  within:
    "One country at a time: the full statutory schedule over all 32 tenure steps, with the"
    + " scenario matrix and the dismissal rules in the drawer.",
};

export function costHeading(tenureWords) {
  return {
    title: `Dismissal cost at ${tenureWords} of tenure`,
    description:
      "Total cost of an unfair dismissal, in monthly salaries, for a worker with the"
      + " selected tenure. Ranked from the most to the least costly.",
  };
}

export const HEADING = {
  range: {
    title: "Dismissal cost range: 1 vs 30 years of tenure",
    description: "How much the cost grows over a career. Countries are ordered by the"
      + " size of that span, not by either endpoint.",
  },
  ceiling: {
    title: "Where each schedule stops growing",
    description: "The highest cost a schedule ever reaches, and the tenure at which it is"
      + " first reached. Eight countries are still accruing at thirty years and have no"
      + " ceiling inside the range the source covers.",
  },
};

export function withinHeading(country) {
  return {
    title: `Dismissal cost by tenure — ${country}`,
    description:
      "The full statutory schedule, in monthly salaries: 32 steps from three months to"
      + " thirty years. Colombia is the one country with two schedules, split at ten"
      + " minimum wages.",
  };
}

export const FOOTER = {
  cost: {
    note: [
      "Costs of an unfair dismissal where the worker received advance notice. 30-day months.",
      "Colombia legislates two schedules and this chart shows the one for workers earning under ten minimum wages; both are in the By-country view.",
      "In the Dominican Republic a separate schedule applies below six months and between one and five years of tenure, and is not shown.",
      "The ranking reorders as the slider moves: Peru is second at ten years of tenure and ninth at thirty.",
    ].join(" "),
    source: TENURE_SOURCE, vintage: VINTAGE,
  },
  range: {
    note: [
      "The grey bar joining the two dots is the span between them, not a value.",
      "Ordered by that span, so a country low on both endpoints can still sit high here.",
      "Chile and Peru are short bars because their schedules stop accruing long before thirty years -- see the chart beside this one.",
    ].join(" "),
    source: TENURE_SOURCE, vintage: VINTAGE,
  },
  ceiling: {
    note: [
      "A country is counted as capped only if its schedule reaches its maximum BEFORE thirty years; the other eight are still accruing at thirty and may or may not be capped beyond it.",
      "Thirty years is where the source stops, not where the law does.",
      "Brazil's low ceiling is not a cap: its schedule is simply the flattest, at 0.384 monthly salaries per year.",
    ].join(" "),
    source: TENURE_SOURCE, vintage: VINTAGE,
  },
  within: {
    note: [
      "Costs of an unfair dismissal where the worker received advance notice. 30-day months.",
      "The first two steps are BANDS -- three to six months and six to twelve months -- not points.",
      "In the Dominican Republic a separate schedule applies below six months and between one and five years of tenure, and is not shown.",
    ].join(" "),
    source: TENURE_SOURCE, vintage: VINTAGE,
  },
};
