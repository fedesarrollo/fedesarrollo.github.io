/* ============================================================================
   text.js - the non-salary module's titles and notes
   ============================================================================
   Ports y_axis_title_text (helpers.R:760), labor_footer_note (:806) and the
   source line (:944).
   ========================================================================= */

/* helpers.R:760. Short on purpose: a rotated y-axis title is centred on the
   plot area and plotly neither wraps nor ellipsises it, so anything longer
   than the plot area is cut at the canvas edge, tail first -- which is where
   the unit lives. */
export function yAxisTitle({ category, socialSub }) {
  if (category === "bonuses_and_benefits") {
    return "Bonuses and benefits (% of wages)";
  }
  if (category === "social") {
    if (socialSub === "pensions") return "Pensions contribution (% of wages)";
    if (socialSub === "health") return "Health contribution (% of wages)";
    if (socialSub === "occupational_risk") return "Occupational risk (% of wages)";
    return "Social security (% of wages)";
  }
  if (category === "payroll_taxes") return "Payroll taxes (% of wages)";
  return "Non-salary costs (% of wages)";
}

/* helpers.R:944 */
export const SOURCE =
  "Source: World Bank Latin America and the Caribbean Chief Economist office"
  + " (LCRCE), Regulatory Frameworks Database, 2026.";

export const VIEW_SUBTITLE = {
  across:
    "Non-salary labor costs across the 11 Latin American countries the report covers, with"
    + " Spain and four U.S. states as comparators. Every bar is a share of the wage, and"
    + " each country shows the minimum and the maximum its rules allow.",
  within:
    "Non-salary labor costs for one country across wage levels, from one to fifteen minimum"
    + " wages. The second chart below shows how the total varies with the worker's job"
    + " tenure.",
};

/* The subject of the footer sentence, per selection. helpers.R:668. */
function subject({ category, socialSub, bonusComponent, breakdown }) {
  if (category === "bonuses_and_benefits") {
    const one = { ab: "annual and other periodic bonuses", pl: "paid leave",
                  up: "unemployment protection", ob: "other bonuses" }[bonusComponent];
    return breakdown === "component" && one ? one : "bonuses and benefits";
  }
  if (category === "social") {
    return { pensions: "pension contributions", health: "health contributions",
             occupational_risk: "occupational-risk contributions" }[socialSub]
      ?? "social security contributions";
  }
  if (category === "payroll_taxes") return "payroll taxes";
  return "total non-salary labor costs";
}

/* helpers.R:806. The clauses that apply to the current selection, in the order
   the R function emits them. `scope` is "main" for the wage chart and "tenure"
   for the second By-country one. */
export function footerNote(state, scope = "main") {
  const parts = [];
  const subj = subject(state);
  const across = state.view === "across";

  parts.push(
    across
      ? `Each panel is one country's ${subj}, as a share of the wage, at `
        + `${state.wageLabels[0]}.`
      : scope === "tenure"
        ? `Total ${subj} for the selected country at ${state.wageLabels[0]}, by years of`
          + " job tenure."
        : `${subj.charAt(0).toUpperCase()}${subj.slice(1)} for the selected country, at`
          + ` each wage level from ${state.wageLabels[0]} to`
          + ` ${state.wageLabels[state.wageLabels.length - 1]}.`);

  parts.push("Min and Max are the lowest and highest the country's rules allow for an"
    + " otherwise identical worker, not an observed range.");

  if (state.breakdown === "payer") {
    parts.push("Split by who the rule obliges to pay, which is not the same as who"
      + " ultimately bears the cost.");
  }
  if (state.breakdown === "component" && state.category === "payroll_taxes") {
    parts.push("One segment per named tax, so the series differ from country to country.");
  }
  if (across && state.category === "payroll_taxes") {
    parts.push("Chile and Ecuador legislate no payroll taxes and are not shown.");
  }
  if (across && state.category === "social" && state.socialSub === "occupational_risk") {
    parts.push("Paraguay has no separate occupational-risk contribution and is not shown.");
  }
  if (across && state.category === "social" && state.socialSub === "health") {
    parts.push("Brazil, Spain and US4 fund health from general revenue rather than a"
      + " separate contribution, and are not shown.");
  }
  if (scope === "tenure") {
    parts.push("Brazil, Chile, Colombia and Peru are excluded: their statutory"
      + " non-salary costs do not vary with tenure.");
  }

  return parts.join(" ");
}
