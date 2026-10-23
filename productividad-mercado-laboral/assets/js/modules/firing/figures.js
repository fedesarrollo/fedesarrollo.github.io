/* ============================================================================
   figures.js - the Firing Costs charts
   ============================================================================
   Ports output$plot_cost10 (firing.R:520), output$plot_range (:544),
   output$plot_ceiling (:576) and the By-country output$plot (:656).

   THESE FOUR CHARTS ARE NOW THEMED LIKE THE OTHER THREE MODULES', which is a
   DELIBERATE DIVERGENCE from the R app made on the repository owner's call.
   apply_firing_theme sets no axis and no legend properties at all, so in R
   these keep plotly's default gridlines and right-hand vertical legend while
   every other module removes them -- an omission rather than a decision.

   Two consequences to know:
     - Their captured figures in dev/fixtures/fc/ no longer match on `layout`.
       They are listed in site/tests/fixtures.js as SUPERSEDED, where the DATA
       is still compared exactly and only the furniture is allowed to differ.
     - plot_cost10 gains the invisible 6px y tick every other horizontal bar
       chart uses as a separator. It was the only one without it, which is the
       1px gap the chart harness reported twelve times.
   ========================================================================= */

import { constants } from "../../core/format.js";
import { firingTheme, blankAxis, categoryAxis, PLOT_CONFIG, font,
         FIRING_WITHIN_H } from "../../charts/theme.js";
import { orderBy } from "../../data/verbs.js";

/* The 32 tenure steps, with the two sub-annual BANDS spelled out. "0.25" on a
   slider reads as a quarter of a year rather than "three to six months", which
   is what the source means. */
export function tenureSteps(tenure) {
  const seen = new Map();
  for (const r of tenure.toRows()) {
    if (!seen.has(r.tenure)) seen.set(r.tenure, r.tenure_label);
  }
  const steps = [...seen.keys()].sort((a, b) => a - b).map((t) => ({
    tenure: t,
    display: t === 0.25 ? "3-6 months"
      : t === 0.5 ? "6-12 months"
      : `${t} ${t === 1 ? "year" : "years"}`,
  }));
  const labels = steps.map((s) => s.display);
  if (new Set(labels).size !== labels.length) {
    throw new Error("tenureSteps: two tenure points produced the same label");
  }
  return steps;
}

/* ===========================================================================
   1. "How much it costs" -- the ranking at the selected tenure
   =========================================================================== */
export function costFigure({ tenure }, { tenureYears }) {
  const K = constants();
  /* Colombia is the one country with two schedules, split at ten minimum
     wages. The cross-country views take `<10 MW`, the band covering most of
     the wage distribution; the By-country view plots both. */
  const rows = tenure.toRows().filter((r) =>
    r.tenure === tenureYears
    && (r.wage_band === null || r.wage_band === undefined || r.wage_band === "<10 MW"));
  if (!rows.length) return null;

  /* Ranked, not alphabetical: this is a single-series comparison, the ordering
     IS the finding, and it genuinely reorders as the slider moves -- Peru is
     2nd at 10 years and 9th at 30, Chile 4th and last. */
  const d = orderBy(rows, "value");

  const data = [{
    type: "bar", orientation: "h",
    x: d.map((r) => r.value),
    y: d.map((r) => r.country),
    marker: { color: K.FIRING_BASE },
    text: d.map((r) => r.value),
    texttemplate: "%{x:.2f}",
    textposition: "outside", cliponaxis: false, constraintext: "none",
    textfont: font(10),
    hovertemplate: "%{y}: %{x} monthly salaries<extra></extra>",
  }];

  const layout = firingTheme({
    xaxis: blankAxis({ title: { text: "monthly salaries" },
                       range: [0, Math.max(...d.map((r) => r.value)) * 1.12] }),
    /* categoryAxis() supplies the invisible 6px tick. This chart was the only
       horizontal bar chart in the application without it, and the harness
       measured the resulting gap between a country's name and its own bar at
       1px against a minimum of 5. */
    yaxis: categoryAxis({ categoryorder: "array",
                          categoryarray: d.map((r) => r.country) }),
  }, data, { marginL: 8, marginR: 60, marginT: 34 });

  return { data, layout, config: PLOT_CONFIG, table: d };
}

/* ===========================================================================
   2a. The 1-vs-30-year range (dumbbell)
   =========================================================================== */
export function rangeFigure({ range }) {
  const K = constants();
  /* Ordered by the SPAN, so a country low on BOTH endpoints can still sit
     high here -- which is the chart's point, and the reason it does not sort
     on either endpoint. */
  const d = orderBy(range.toRows().map((r) => ({ ...r, span: r.max - r.min })),
                    "span");
  const countries = d.map((r) => r.country);

  const data = [
    /* The grey bar joining the two dots is the SPAN, not a value -- hence
       hoverinfo skip and no legend entry. */
    { type: "scatter", mode: "lines",
      /* 3n - 1 points, not 3n: R's add_segments puts a null BETWEEN
         consecutive segments and none after the last, so the captured trace is
         32 long for eleven countries. */
      x: d.flatMap((r, i) => (i ? [null, r.min, r.max] : [r.min, r.max])),
      y: d.flatMap((r, i) => (i ? [null, r.country, r.country] : [r.country, r.country])),
      line: { color: "#cfd6dd", width: 6 },
      /* A per-point array, because that is what R emits: add_segments maps
         hoverinfo over the rows, so the captured trace carries
         ["skip","skip",null,...]. plotly treats a scalar identically, but
         matching the shape keeps the fixture diff exact. */
      showlegend: false,
      hoverinfo: d.flatMap((r, i) => (i ? [null, "skip", "skip"] : ["skip", "skip"])) },
    { type: "scatter", mode: "markers",
      x: d.map((r) => r.min), y: countries, name: "1 year",
      marker: { color: "#4f9ed6", size: 11 },
      hovertemplate: "1 year: %{x}<extra></extra>" },
    { type: "scatter", mode: "markers",
      x: d.map((r) => r.max), y: countries, name: "30 years",
      marker: { color: K.FIRING_BASE, size: 11 },
      hovertemplate: "30 years: %{x}<extra></extra>" },
  ];

  const layout = firingTheme({
    xaxis: blankAxis({ title: { text: "monthly salaries" } }),
    yaxis: categoryAxis({ categoryorder: "array", categoryarray: countries }),
  }, data, { hasLegend: true, marginL: 8, marginR: 60, marginT: 34 });

  return { data, layout, config: PLOT_CONFIG, table: d };
}

/* ===========================================================================
   2b. Where each schedule stops growing
   ===========================================================================
   REPLACES "marginal cost per year", which stated a single number for a
   quantity that is not constant: D1 shows Chile freezing at 11 monthly
   salaries, Peru at 12 and Ecuador at 25, so a constant slope said something
   false for those three. */
export function ceilingFigure({ ceiling }) {
  const K = constants();
  const d = orderBy(ceiling.toRows(), "ceiling").map((r) => ({
    ...r,
    capped: r.reached_at !== null && r.reached_at !== undefined,
  }));
  const countries = d.map((r) => r.country);

  const hover = (r) => (r.capped
    ? `<b>${r.country}</b><br>Stops at ${r.ceiling.toFixed(2)} monthly salaries`
      + `<br>First reached at ${r.reached_at} years`
    : `<b>${r.country}</b><br>${r.ceiling.toFixed(2)} monthly salaries at 30 years`
      + "<br>Still growing -- no ceiling in the source's range");

  /* TWO NAMED TRACES, not a vectorised fill: "capped" is a regulatory fact and
     plotly cannot key a colour that is a per-point property of one trace.

     A PAIR OF FACTS, not a ranking, so light and dark of the same family --
     the way Min|Max is drawn everywhere else in the app. These used to be
     FIRING_BASE and FIRING_ACCENT, i.e. a topic identity filling a mark, which
     is exactly what the app's own colour rule forbids. */
  const bar = (sub, name, colour) => (sub.length ? {
    type: "bar", orientation: "h",
    x: sub.map((r) => r.ceiling),
    y: sub.map((r) => r.country),
    name, marker: { color: colour },
    customdata: sub.map(hover),
    hovertemplate: "%{customdata}<extra></extra>",
  } : null);

  const data = [
    bar(d.filter((r) => r.capped), "Capped by statute", K.FED_INK_MED),
    bar(d.filter((r) => !r.capped), "Still growing at 30 years", K.FIRING_BASE),
  ].filter(Boolean);

  const layout = firingTheme({
    barmode: "overlay",
    xaxis: blankAxis({ title: { text: "monthly salaries" },
                       range: [0, Math.max(...d.map((r) => r.ceiling)) * 1.12] }),
    yaxis: categoryAxis({ categoryorder: "array", categoryarray: countries }),
  }, data, { hasLegend: true, marginL: 8, marginR: 60, marginT: 34 });

  return { data, layout, config: PLOT_CONFIG, table: d };
}

/* ===========================================================================
   3. By-country: the full schedule over all 32 steps
   =========================================================================== */
export function withinFigure({ tenure }, { country }) {
  const K = constants();
  const d = orderBy(tenure.where({ country }).toRows(), "wage_band", "tenure");
  const grouped = d.some((r) => r.wage_band !== null && r.wage_band !== undefined);

  let data;
  let layout;
  if (grouped) {
    /* Colombia, the one country with two schedules. */
    const bands = [...new Set(d.map((r) => r.wage_band))];
    data = bands.map((band, i) => {
      const sub = d.filter((r) => r.wage_band === band);
      return {
        type: "scatter", mode: "lines+markers",
        x: sub.map((r) => r.tenure), y: sub.map((r) => r.value),
        name: band,
        line: { color: K.FIRING_SERIES_PALETTE[i] },
        marker: { color: K.FIRING_SERIES_PALETTE[i] },
        hovertemplate: "%{x} yr · %{fullData.name}: %{y}<extra></extra>",
      };
    });
    layout = firingTheme({
      legend: { title: { text: "Wage band" } },
      xaxis: blankAxis({ title: { text: "years of tenure" } }),
      yaxis: blankAxis({ title: { text: "monthly salaries" } }),
    }, data, { hasLegend: true, canvasH: FIRING_WITHIN_H, marginL: 70, marginR: 30,
               marginT: 34 });
  } else {
    data = [{
      type: "scatter", mode: "lines+markers",
      x: d.map((r) => r.tenure), y: d.map((r) => r.value),
      line: { color: K.FIRING_BASE, width: 2.5 },
      marker: { color: K.FIRING_BASE, size: 7 },
      hovertemplate: "%{x} yr: %{y}<extra></extra>",
    }];
    layout = firingTheme({
      xaxis: blankAxis({ title: { text: "years of tenure" } }),
      yaxis: blankAxis({ title: { text: "monthly salaries" } }),
    }, data, { canvasH: FIRING_WITHIN_H, marginL: 70, marginR: 30, marginT: 34 });
  }

  return { data, layout, config: PLOT_CONFIG, table: d };
}
