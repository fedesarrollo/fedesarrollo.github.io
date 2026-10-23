/* ============================================================================
   theme.js - the plot themes, ported from R
   ============================================================================
   One file for apply_minwage_theme (minwage.R:111), apply_btax_theme
   (btax.R:92), apply_firing_theme (firing.R:80), apply_labor_plot_theme
   (non_salary/helpers.R:977), minwage_axis (constants.R:308) and
   bottom_legend (constants.R:153).

   FIVE INVARIANTS THE PORT MUST NOT BREAK. Each of them is a bug that was
   already found and fixed once in the R code, and each would come back as a
   silent visual regression -- an SVG label that is clipped or overprinted
   throws no error and logs nothing.

   1. `legend.y` IS A FRACTION OF THE PLOT AREA, NOT THE CANVAS. The plot area
      is canvas - margin_t - margin_b, so a fixed fraction lands somewhere
      different on every canvas height. Always go through bottomLegend(), which
      derives y from a pixel clearance. In non-salary the bottom margin used to
      be computed from how many lines the footnote wrapped to, which made the
      legend's position depend on the LENGTH OF THE NOTE TEXT -- that is how
      `y = -0.25` ended up printed over seven of the thirteen country names.

   2. `marginB` COMES FROM A TRACE-COUNTING PREDICATE: 130 with a legend, 70
      without (135/80 in non-salary). The legend is drawn INSIDE the canvas and
      BELOW the axis title, so the margin has to hold both.

   3. layout() CONCATENATES `annotations` BUT REPLACES `shapes`. Every
      reference line for one figure therefore goes in ONE call, which is why
      refLine() takes vectors. Three calls for three quartiles keep all three
      labels and silently drop two of the three lines.

   4. `constraintext` DEFAULTS TO "both" ON BAR TRACES, shrinking an outside
      label until it fits the bar's own thickness. Honduras's 40 bars rendered
      their labels at 7.7px via an SVG scale(0.639), invisible to
      getComputedStyle. Every labelled bar trace sets constraintext: "none".

   5. fs() ROUNDS HALF UP. See core/format.js.

   ONE DIVERGENCE IS PORTED ON PURPOSE: applyFiringTheme sets no axis or legend
   properties, so firing's four charts keep plotly's default gridlines and its
   right-hand vertical legend while the other three modules remove them. That
   is what the R code does today (apply_firing_theme has no minwage_axis
   equivalent), and reproducing it keeps the port verifiable line by line.
   Unifying it is a design change and belongs in its own commit.
   ========================================================================= */

import { constants, fs } from "../core/format.js";

export const TRANSPARENT = "rgba(0,0,0,0)";

/* WHETHER A LEGEND RENDERS: two or more legend-eligible traces. Derived from
   the 66 captured figures rather than from the R comment, and it matches all
   66 with no exceptions. Note it is NOT "or any trace forces showlegend" --
   btax's single-trace "Latin America only" ranking sets showlegend = TRUE on
   that trace and the captured layout still says false, so a trace-level flag
   does not flip the layout-level one. */
export function legendVisible(traces) {
  return traces.filter((t) => t.showlegend !== false).length >= 2;
}

/* THE BOTTOM MARGIN USES A DIFFERENT PREDICATE, which is what
   apply_labor_plot_theme computes (helpers.R:986): eligible >= 2 OR any trace
   forcing it. The two are not the same question -- the margin has to reserve
   room whenever a legend COULD be drawn, while showlegend says whether plotly
   actually draws one. Non-salary is the only module that lets the theme decide
   this rather than passing it in. */
export function laborLegendVisible(traces) {
  const eligible = traces.filter((t) => t.showlegend !== false).length;
  const forced = traces.some((t) => t.showlegend === true);
  return eligible >= 2 || forced;
}

export function font(size, extra = {}) {
  return { family: constants().PLOTLY_FONT_FAMILY, size: fs(size), ...extra };
}

/* constants.R:307. Exists OUTSIDE the theme because layout({xaxis: …})
   replaces the whole axis object, so the blank defaults have to be merged in
   at the point the axis is built, not afterwards. Every axis in non-salary,
   minwage and btax goes through this; firing's deliberately do not. */
export function blankAxis(overrides = {}) {
  return { showgrid: false, zeroline: false, showline: false, ...overrides };
}

/* The standard y-axis treatment for a horizontal bar chart: no title, room
   made by automargin, and an INVISIBLE 6px tick that acts as a spacer between
   the country names and the plot area. Repeated identically at six call sites
   in the R code. */
export function categoryAxis(overrides = {}) {
  return blankAxis({
    title: { text: "" },
    automargin: true,
    ticks: "outside",
    ticklen: 6,
    tickcolor: TRANSPARENT,
    ...overrides,
  });
}

/* constants.R:153 */
export function bottomLegend(canvasH, marginT, marginB, clearPx = 72, extra = {}) {
  const plotH = Math.max(canvasH - marginT - marginB, 1);
  return {
    orientation: "h",
    x: 0.5,
    xanchor: "center",
    yanchor: "top",
    y: -clearPx / plotH,
    ...extra,
  };
}

/* ---- minwage / btax ----------------------------------------------------- */

/* plotly R OMITS `shapes` and `annotations` entirely when they are empty --
   verified against dev/fixtures/mw/within/Argentina.json, a single-rate country
   that draws no reference line and whose captured layout has neither key. An
   empty array is not the same object, so it has to be removed rather than
   emitted, or every chart without a reference line differs from its fixture. */
function dropEmpty(layout) {
  for (const k of ["shapes", "annotations"]) {
    if (Array.isArray(layout[k]) && layout[k].length === 0) delete layout[k];
  }
  return layout;
}

function houseTheme(layout, traces, {
  hasLegend = false,
  canvasH = 470,
  legendClearPx = 72,
  marginL = 70, marginR = 30, marginT = 28, marginB = null,
  hoverBorder = null,
  hoverSize = 11,
} = {}) {
  const b = marginB ?? (hasLegend ? 130 : 70);
  const hover = { font: font(hoverSize) };
  if (hoverBorder) { hover.bgcolor = "#ffffff"; hover.bordercolor = hoverBorder; }

  /* `hasLegend` and `showlegend` ARE TWO DIFFERENT DECISIONS, and conflating
     them was a real bug. `hasLegend` is the caller's explicit statement that
     the bottom margin must hold a legend; `showlegend` is plotly's own rule --
     a legend renders when two or more traces are legend-eligible, or one
     forces it. btax's rate chart is where they diverge: it passes
     has_legend = TRUE (so the margin is 130) but in "Latin America only" it
     draws ONE trace, so plotly shows no legend. A chart that states its own
     still wins -- minwage's bite chart turns the legend off when a single
     quartile is selected. */
  const showlegend = layout.showlegend
    ?? (traces ? legendVisible(traces) : hasLegend);

  return dropEmpty({
    ...layout,
    font: font(12),
    /* DELIBERATELY BLANK. The chart title is an HTML <h3> above the plot
       (chartHeading), and a sectioned across view shows several charts each
       with its own heading -- an in-plot title would duplicate every one. */
    title: { text: "" },
    paper_bgcolor: TRANSPARENT,
    plot_bgcolor: TRANSPARENT,
    margin: { l: marginL, r: marginR, t: marginT, b },
    showlegend,
    /* Re-assert whatever reference-line annotations were already set. In R this
       was defensive against plotly_build(); here it matters because the caller
       builds one layout object and the spread above would otherwise be the
       only chance for them to survive. */
    annotations: layout.annotations ?? [],
    /* MERGED, not replaced. plotly R's layout() merges nested attribute lists,
       so a chart that sets `legend = list(title = …)` before the theme runs
       keeps that title alongside the theme's position -- verified against
       dev/fixtures/mw/across/bite-monthly.json, whose legend carries both
       "Percentile of the wage distribution" AND y = -0.2278. Overwriting here
       would silently drop the only thing that says those bare ordinals are
       percentiles at all. */
    legend: {
      ...(layout.legend ?? {}),
      ...bottomLegend(canvasH, marginT, b, legendClearPx, { font: font(11) }),
    },
    hoverlabel: hover,
  });
}

/* minwage.R:111 */
export function minwageTheme(layout, traces, opts = {}) {
  return houseTheme(layout, traces, {
    canvasH: constants().MW_CELL_H_LEVEL,
    hoverBorder: constants().MINWAGE_RULE,
    ...opts,
  });
}

/* btax.R:92. Same shape as minwage's, with two differences: a different
   default canvas height, and a hoverlabel that is one step LARGER
   (plotly_fs(12) = 15 against minwage's plotly_fs(11) = 14) and carries no
   bgcolor or bordercolor. */
export function btaxTheme(layout, traces, opts = {}) {
  return houseTheme(layout, traces, {
    canvasH: constants().BT_CELL_H_RATE,
    hoverSize: 12,
    ...opts,
  });
}

/* firing. UNIFIED WITH THE OTHER THREE, on the repository owner's call.

   apply_firing_theme (firing.R:80) sets no axis and no legend properties at
   all -- no minwage_axis equivalent, no bottom_legend call, and only t and b
   margins -- so in the R app that module's four charts keep plotly's default
   gridlines and its right-hand vertical legend while minwage, btax and
   non-salary remove them. It was the only visual divergence between modules in
   the application, and it was an omission rather than a decision: nothing in
   the R code says why firing should look different.

   `title` was accepted and IGNORED by the R function, and firing.R:678 still
   passed one. It is not accepted here.

   `sourceNote` keeps its tripwire: the footer is HTML below the plot
   (chartFooter), and inside the SVG it was visibly clipped on the half-width
   across cells ("Costs in mo…"). A caller still passing one fails loudly. */
/* firing.R:174 and :200 give the two canvas heights as inline strings rather
   than constants -- the only ones in the app that are not named, which
   CLAUDE.md flags as a hazard to re-check by hand. Named here. */
export const FIRING_CANVAS_H = 490;
export const FIRING_WITHIN_H = 550;

export function firingTheme(layout, traces = null, opts = {}) {
  if (opts.sourceNote !== undefined && opts.sourceNote !== null) {
    throw new Error(
      "firingTheme: sourceNote is not drawn inside the SVG any more -- " +
      "render it with chartFooter() below the plot instead");
  }
  const { sourceNote, ...rest } = opts;
  void sourceNote;
  return houseTheme(layout, traces, { canvasH: FIRING_CANVAS_H, ...rest });
}

/* ---- non-salary --------------------------------------------------------- */

/* helpers.R:977. Two things it does that the house theme does not:

   - enforce_numeric_hover (helpers.R:951): every trace's hovertemplate is
     overwritten with "%{y:.1f}%" and its customdata nulled. Note what this
     means -- the rich per-bonus hover that init.R:39 spends a pivot_longer
     building is computed and then thrown away. The port keeps the overwrite
     because it is what the user actually sees, and does not build the lookup
     at all.

   - `hasLegend` is AUTO-DETECTED from the traces when not given: a legend
     renders when two or more traces are legend-eligible, or any trace forces
     showlegend. In R this needed a plotly_build() to inspect the figure; here
     the trace array is in hand. */
const NS_HOVERTEMPLATE = "%{y:.1f}%<extra></extra>";

export function enforceNumericHover(traces) {
  return traces.map((t) => {
    const out = { ...t, hovertemplate: NS_HOVERTEMPLATE, hoverinfo: "y" };
    delete out.customdata;
    return out;
  });
}



export function laborTheme(layout, traces, {
  hasLegend = null,
  canvasH = null,
  marginT = 20,
} = {}) {
  const K = constants();
  const h = canvasH ?? K.LABOR_PLOT_HEIGHT;
  const legend = hasLegend ?? laborLegendVisible(traces);
  const marginB = legend ? 135 : 80;
  const showlegend = layout.showlegend ?? legendVisible(traces);

  /* THIS THEME SETS ONLY t AND b. The captured By-country figures have
     margin {l: 60, r: 10}, which are plotly R's own defaults -- so
     apply_labor_plot_theme leaves l and r alone and the SUBPLOT branches set
     l: 70, r: 30 for themselves before calling it (as tenure_figure does
     explicitly at plots.R:3641). A theme that set them would move every
     By-country chart 10px left and 20px in.

     No `hoverlabel` and no legend `font` either: the captured layouts have
     hoverlabel null and a legend carrying only its five position keys.

     `annotations` and `shapes` are likewise NOT asserted here. The across
     figures carry them as empty arrays because subplot() introduces them; the
     By-country ones have neither key. The caller that builds a subplot adds
     them. */
  return {
    ...layout,
    font: font(12),
    title: { text: "" },
    paper_bgcolor: TRANSPARENT,
    plot_bgcolor: TRANSPARENT,
    margin: { ...(layout.margin ?? {}), t: marginT, b: marginB },
    showlegend,
    /* NO legend key at all when none renders: plotly R emits one only for a
       figure that shows a legend, and every captured non-salary figure with
       showlegend false has no `legend` in its layout. MERGED when it does, so
       a caller's `traceorder` survives -- the same reason houseTheme merges. */
    ...(showlegend
      ? { legend: { ...(layout.legend ?? {}),
                    ...bottomLegend(h, marginT, marginB, 72) } }
      : {}),
  };
}

/* ---- config -------------------------------------------------------------
   THE TOOLBAR IS OFF IN THREE MODULES AND ON IN THE FOURTH, which is not a
   choice made here -- it is measured from the running Shiny app.
   `config(displayModeBar = FALSE)` appears in minwage.R:156, firing.R:99 and
   btax.R:116, and NOWHERE in non-salary's theme. Probed against the app:
   non-salary renders 12 modebar buttons (Download plot as a png, Zoom, Pan,
   Box Select, Lasso Select, Zoom in, Zoom out, Autoscale, …) and the other
   three render none.

   The comment at non_salary/helpers.R:799 says "every chart here sets
   displayModeBar = FALSE". It is wrong about its own module, and believing it
   is how the first version of this port turned the toolbar off for all four.

   This divergence is invisible to dev/run_fixture_diff.R, because `config` is
   not part of a figure's {data, layout} and the captured oracle does not
   carry it. dev/smoke_modules.R asserts it at the DOM level instead, which is
   where a reader notices it. */

/* ALL FOUR MODULES, and this is a DELIBERATE DIVERGENCE from the R app, made
   on the repository owner's call. In R only non-salary shows a toolbar;
   minwage, firing and btax each call config(displayModeBar = FALSE), so 24 of
   the 26 charts cannot be exported as an image at all. For a dashboard whose
   figures get cited in reports that is a real limitation, and the
   inconsistency between modules was not intentional in the original either --
   it is an omission in one module's theme that its own comment denies.

   `config` is invisible to dev/run_fixture_diff.R (it is not part of a
   figure's {data, layout}), so this change does not make any figure differ
   from its capture. dev/smoke_modules.R asserts the button count per module. */
export const PLOT_CONFIG = {
  responsive: true,
  modeBarButtonsToAdd: ["hoverclosest", "hovercompare"],
};

/* non-salary. Identical to PLOT_CONFIG now that all four modules show the
   toolbar; kept as its own name because this is the one module whose toolbar
   the R app also shows, so it is the one the fixture captures agree with.

   `modeBarButtonsToAdd` IS NOT A CHOICE. plotly R's htmlwidget sets
   `modeBarButtonsToAdd: ["hoverclosest", "hovercompare"]` in its own default
   context, so the R toolbar has twelve buttons and a bare plotly.js has ten --
   the two missing being "Show closest data on hover" and "Compare data on
   hover". Nothing about the FIGURE produces them, which is why neither
   hovermode, nor newPlot-versus-react, nor rendering the R app's own captured
   figure in this page changed the count; it took diffing plotly's resolved
   `_context` between the two to find it.

   `responsive` is the one deliberate addition: plotly R resizes the chart
   through the htmlwidget shim (and sets responsive false), and this is the
   static equivalent. */
export const LABOR_PLOT_CONFIG = {
  responsive: true,
  modeBarButtonsToAdd: ["hoverclosest", "hovercompare"],
};
