/* ============================================================================
   figures.js - assembling a non-salary figure
   ============================================================================
   resolveSpec -> buildFrame -> trace builders -> subplot or multicategory ->
   theme. This file is the glue and the two layouts; the decisions live in
   spec.js, the data work in shape.js and the trace shapes in traces.js.

   Y AXES AUTORANGE AND MUST NOT BE PINNED AGAIN. Every plot lets its y axis
   follow its own data so the bars show each country's real magnitude; the
   panels stay comparable because the subplot shares ONE y axis. An earlier
   mechanism pinned every axis to the maximum across ALL countries, which made
   the bars look identical whichever country you picked.
   ========================================================================= */

import { constants, countryDisplayName } from "../../core/format.js";
import { laborTheme, enforceNumericHover, blankAxis, LABOR_PLOT_CONFIG, font }
  from "../../charts/theme.js";
import { horizontalSubplot } from "../../charts/subplot.js";
import { resolveSpec, exclusionFor, tenureFrameFor } from "./spec.js";
import { buildFrame } from "./shape.js";
import { panelTraces, multicategoryTraces } from "./traces.js";
import { yAxisTitle } from "./text.js";
import { orderBy } from "../../data/verbs.js";

/* helpers.R:977 forces this hovertemplate onto every trace and nulls
   customdata. Note what that means for the original: the rich per-bonus hover
   that init.R:39 spends a pivot_longer building is computed and then thrown
   away, which is why the port does not build it at all. */
export function mainFigure(state, frames) {
  /* The within view's exclusion notices come first: the country genuinely has
     nothing to show, which is a different statement from a zero. */
  const excl = exclusionFor(state);
  if (excl) {
    return noticeFigure(
      `${countryDisplayName(state.country)} is excluded since it has no `
      + `${excl.noun}.`);
  }

  const spec = resolveSpec(state);
  const built = buildFrame(spec, state, frames);
  if (!built.rows.length) {
    return noticeFigure("No data for this combination.");
  }

  const yTitle = yAxisTitle(state);

  if (built.compareWages) {
    /* ONE panel, x axis `multicategory`: the two levels are the scenario and
       the wage level. bargap 0.4 is what keeps the two scenario groups
       visually apart. */
    const data = enforceNumericHover(multicategoryTraces(built, spec));
    const layout = laborTheme({
      ...(spec.stack ? { barmode: "stack" } : {}),
      /* STATED for a stacked By-country chart, because dropping the phantom
         seed trace would otherwise take it away. plotly shows a legend at two
         or more traces, and with the seed gone a single-component selection
         ("Paid leave" alone) is ONE trace -- so it silently lost the legend
         entry naming which component the bar is. The pill above says it too,
         but a chart should not stop labelling its own series. */
      ...(spec.stack ? { showlegend: true } : {}),
      bargap: 0.4,
      /* plotly R's own l/r defaults, which the theme does not set and
         plotly.js does not share -- the same situation as firing's charts.
         Measured at 60 and 10 on every captured By-country figure. */
      margin: { l: 60, r: 10 },
      /* build_multicategory_stack sets this; the across payer and bonus
         stacks do not, and the across COMPONENT stack does. Measured. */
      ...(spec.stack ? { legend: { traceorder: "normal" } } : {}),
      xaxis: blankAxis({ title: { text: "" }, type: "multicategory",
                         automargin: true }),
      yaxis: blankAxis({ title: { text: yTitle }, automargin: true }),
      /* `hasLegend` is what reserves the 135px bottom margin; `showlegend`
         above is what draws the legend. With the phantom seed trace gone a
         single-component selection is one trace, and plotly's own rule would
         have dropped both. */
    }, data, spec.stack ? { hasLegend: true } : {});
    return { data, layout, config: LABOR_PLOT_CONFIG, table: built.rows };
  }

  /* One panel per country, each labelled by its own x-axis title. */
  const groups = panelTraces(built, spec);
  const { data, layout: sub } = horizontalSubplot(groups, {
    panelTitles: built.panels,
    yTitle,
    explicitTicks: spec.explicitTicks === true,
  });
  const traced = enforceNumericHover(data);
  const layout = laborTheme({
    ...sub,
    barmode: "stack",
    ...(spec.traceorder ? { legend: { traceorder: spec.traceorder } } : {}),
  }, traced);

  return { data: traced, layout, config: LABOR_PLOT_CONFIG, table: built.rows };
}

/* plots.R:446. An empty scatter carrying one centred annotation. Used for the
   within view's exclusions and for an empty combination -- a chart that says
   why there is nothing rather than drawing an empty frame. */
export function noticeFigure(message) {
  const K = constants();
  return {
    /* Named so a caller can COLLAPSE the block instead of drawing an empty
       440px canvas with one sentence floating in the middle of it. */
    notice: message,
    data: [{ type: "scatter", mode: "markers", x: [], y: [], showlegend: false }],
    layout: {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      xaxis: { visible: false },
      yaxis: { visible: false },
      annotations: [{
        text: message, xref: "paper", yref: "paper", x: 0.5, y: 0.5,
        xanchor: "center", yanchor: "middle", align: "center", showarrow: false,
        font: font(16, { color: K.FED_INK_DEEP }),
      }],
      margin: { l: 40, r: 20, t: 40, b: 50 },
    },
    config: LABOR_PLOT_CONFIG,
    table: [],
  };
}

/* ===========================================================================
   The SECOND By-country chart: total cost by job tenure
   ===========================================================================
   plots.R:3610. A fixed two-panel subplot, Min | Max, that IGNORES the
   breakdown entirely and reads the TOTAL tenure frame for the selected
   category at the FIRST selected wage level. It is the only chart that touches
   the wage_tenure_variation folder, and only its five TOTAL frames -- the
   by-payer and by-component tenure files are unreachable. */
const TENURE_EXCLUDED = ["BRA", "CHL", "COL", "PER"];

export function tenureFigure(state, frames) {
  const K = constants();

  if (!state.country || state.country === "All") {
    return noticeFigure("Select one country to see how costs vary by job tenure.");
  }
  const label = countryDisplayName(state.country);
  if (TENURE_EXCLUDED.includes(state.country)) {
    return noticeFigure(`${label} is excluded since its statutory non-salary labor`
      + " costs do not vary with years of employee tenure.");
  }

  const id = tenureFrameFor(state);
  const table = id ? frames[id] : null;
  if (!table) {
    return noticeFigure("Job-tenure data is not available for this selection.");
  }
  if (!table.columnNames.includes("tenure")) {
    return noticeFigure("Job-tenure data is not available for this selection.");
  }

  /* The FIRST selected level, not the whole range: this chart has tenure on
     its x axis and cannot carry the wage dimension as well. */
  const wage = state.wageLabels[0];
  const rows = table.where({ country: state.country, wage }).toRows();
  if (!rows.length) return noticeFigure("No job-tenure data for this combination.");

  const scenarioOf = (r) => {
    const l = String(r.type ?? r.min_max_total ?? "");
    return /_min$/.test(l) ? "Min" : "Max";
  };
  const d = orderBy(rows.map((r) => ({ ...r, Scenario: scenarioOf(r),
                                       tenure_plot: Number(r.tenure) })),
                    "tenure_plot");

  const yTitle = yAxisTitle(state);
  const groups = ["Min", "Max"].map((s) => {
    const sub = d.filter((r) => r.Scenario === s);
    if (!sub.length) return [];
    return [{
      type: "bar",
      x: sub.map((r) => r.tenure_plot),
      y: sub.map((r) => r.value),
      marker: { color: K.LABOR_SCENARIO_COLORS[s] },
      showlegend: false,
    }];
  });
  if (groups.some((g) => !g.length)) {
    return noticeFigure("No job-tenure data for this combination.");
  }

  const { data, layout: sub } = horizontalSubplot(groups, {
    panelTitles: ["Tenure (in years)", "Tenure (in years)"],
    yTitle,
  });
  /* The two panel axes are LINEAR here, not categorical: tenure is a number of
     years, and a category axis would space 0-25 evenly regardless of gaps. */
  for (const key of ["xaxis", "xaxis2"]) {
    delete sub[key].type;
    delete sub[key].categoryorder;
    delete sub[key].categoryarray;
  }

  const traced = enforceNumericHover(data);
  /* margin_t 40 buys room for the two panel labels, which sit ABOVE the plot
     area. This chart is 440px, not the 500 the main one gets. */
  const layout = laborTheme({ ...sub }, traced,
                            { canvasH: K.LABOR_TENURE_HEIGHT, marginT: 40 });

  /* yanchor "bottom" at y = 1, not a bare y = 1.02: with the default anchor the
     label box straddles the top of the plot area and was drawn over the
     tallest bars. Anchored, it sits wholly above the axis. */
  layout.annotations = [
    ...(layout.annotations ?? []),
    ...[["Min", 0.23], ["Max", 0.77]].map(([s, x]) => ({
      text: `${label} - ${s}`, x, y: 1, yanchor: "bottom", yshift: 6,
      xref: "paper", yref: "paper", showarrow: false, font: font(14),
    })),
  ];

  return { data: traced, layout, config: LABOR_PLOT_CONFIG, table: d };
}
