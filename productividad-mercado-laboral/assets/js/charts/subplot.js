/* ============================================================================
   subplot.js - R's subplot(nrows = 1, shareY = TRUE, titleX = TRUE)
   ============================================================================
   Non-salary's across view is thirteen panels in a row, one per country, each
   labelled by its own x-axis title. plotly.js has no subplot helper: R's does
   the axis-domain arithmetic for you, and this is that arithmetic.

   THE DOMAIN FORMULA IS MEASURED, NOT DERIVED. The margin is applied to the
   INNER edges only, so the first and last panels are wider than the middle
   ones. Verified against all thirteen captured domains in
   dev/fixtures/ns/across/all-total.json:

       panel 1  [0,            1/13 - 0.01]   width 0.0669
       panel 2  [1/13 + 0.01,  2/13 - 0.01]   width 0.0569
       panel 13 [12/13 + 0.01, 1          ]   width 0.0669

   An earlier reading of this had the margin on both sides of every cell
   including the outer edges, which is wrong by 0.01 at each end and shifts
   every interior panel. The plan said to check it against a fixture rather
   than against the formula, and this is why.

   shareY = TRUE means ONE `yaxis`, not thirteen matched ones. Do NOT use
   `matches: "y"`: that draws thirteen sets of y tick labels and reserves
   thirteen left margins, which is a different figure and fails the chart
   harness's "plot area >= 65% of the canvas" assertion.

   titleX = TRUE is what keeps each panel's own x-axis title -- that is where
   the country codes live.
   ========================================================================= */

import { blankAxis } from "./theme.js";

/* The domains for n panels across one row. */
export function domains(n, margin = 0.01) {
  return Array.from({ length: n }, (_, i) => {
    const k = i + 1;
    return [
      (k - 1) / n + (k > 1 ? margin : 0),
      k / n - (k < n ? margin : 0),
    ];
  });
}

/* plotly's axis names: the first has no suffix. */
export const axisKey = (i, letter = "x") => `${letter}axis${i === 0 ? "" : i + 1}`;
export const axisRef = (i, letter = "x") => `${letter}${i === 0 ? "" : i + 1}`;

/* `groups` is an array of trace arrays, one per panel, in panel order.
   `panelTitles` labels each panel's x axis.

   LEGEND GROUPING IS NOT THE SUBPLOT'S JOB and is left to the caller: panel 1's
   traces carry showlegend true, the rest false, and all of them share a
   legendgroup so one legend key toggles the series across every panel. */
export function horizontalSubplot(groups, {
  panelTitles,
  yTitle = "",
  margin = 0.01,
  categoryarray = ["Min", "Max"],
  /* tickvals/ticktext are set by SOME branches and not others, measured:
     plot_payer_subplots and build_component_subplot emit them, while the
     "all" total and payer branches do not. Same values as categoryarray, so
     the effect is cosmetic -- but the diff is exact, and a branch that sets
     them must say so. */
  explicitTicks = false,
} = {}) {
  const n = groups.length;
  const doms = domains(n, margin);

  const layout = {
    /* l and r are the SUBPLOT branches' own, not the theme's: the theme sets
       only t and b, and the captured By-country figures (which are not
       subplots) keep plotly R's 60/10 defaults. plots.R:3641 sets these
       explicitly for the same reason. */
    margin: { l: 70, r: 30 },
    /* subplot() introduces both, and plotly R emits them even when empty --
       every captured across figure carries `annotations: []` and
       `shapes: []`, while the By-country ones have neither key. */
    annotations: [],
    shapes: [],
    /* One shared y axis. `anchor: "x"` ties it to the first panel, which is
       what R emits. */
    yaxis: blankAxis({
      title: { text: yTitle },
      domain: [0, 1],
      anchor: "x",
      automargin: true,
    }),
  };

  const data = [];
  groups.forEach((traces, i) => {
    layout[axisKey(i)] = blankAxis({
      title: { text: panelTitles[i] },
      domain: doms[i],
      anchor: "y",
      type: "category",
      categoryorder: "array",
      categoryarray,
      ...(explicitTicks ? { tickvals: categoryarray, ticktext: categoryarray } : {}),
      automargin: true,
    });
    for (const t of traces) {
      data.push({ ...t, xaxis: axisRef(i), yaxis: "y" });
    }
  });

  return { data, layout };
}
