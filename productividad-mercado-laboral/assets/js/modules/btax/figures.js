/* ============================================================================
   figures.js - the Business Taxes charts
   ============================================================================
   Ports output$plot_rate (btax.R:398) and the By-country output$plot (:608).

   THIS MODULE IS SIXTEEN JURISDICTIONS AND DOES NOT USE US4. The four US
   states are separate rows (US-CA, US-TX, US-FL, US-NY) because interstate
   variation is what the chapter is about -- Texas does not tax profit at all.
   The `US` -> `US4` rename that runs over every other module's data is an
   exact match on that literal and is correctly a no-op here.
   ========================================================================= */

import { constants } from "../../core/format.js";
import { blankAxis, categoryAxis, btaxTheme, PLOT_CONFIG, font }
  from "../../charts/theme.js";
import { btaxRefLine } from "../../charts/refline.js";
import { colorRamp } from "../../charts/ramp.js";
import { orderBy, distinct } from "../../data/verbs.js";

/* ===========================================================================
   The statutory rate
   ===========================================================================
   ONE ROW PER JURISDICTION, and for the four US states the bar is STACKED:
   federal 21% plus the state's own share.

   THE TWO LAYERS ADD UP BECAUSE `rate_pct` IS ALREADY ADJUSTED. A state tax is
   deductible from the federal base, so the combined rate is
   federal + state x (1 - federal), not the arithmetic sum; `rate_pct` carries
   that adjusted share (California 6.98) and `state_statutory_pct` keeps the
   statutory one (8.84). NEVER plot state_statutory_pct in the stack -- the
   bars would overshoot. */
export function rateFigure({ citRate }, { scope }) {
  const K = constants();
  const all = citRate.toRows();
  const r = scope === "lac" ? all.filter((x) => x.scope === "LAC") : all;

  /* Ranked by the TOTAL, with the code as the tiebreak. */
  const ord = distinct(orderBy(r, "combined_pct", "code"), ["code"]);
  const lev = ord.map((x) => x.label);

  const own = r.filter((x) => x.layer === "national" || x.layer === "state");
  const fed = r.filter((x) => x.layer === "federal");
  /* Texas is its own NAMED TRACE, not a vectorised fill: `comparable` is a
     fact about the tax base (taxable margin, not net profit) and plotly cannot
     key a colour that is a per-point property of one trace. A hover is
     invisible in print and on touch. */
  const ownOk = own.filter((x) => x.comparable === true);
  const ownNo = own.filter((x) => x.comparable !== true);

  /* ONE LABEL PER BAR, ON THE OUTER SEGMENT, AND IT IS THE COMBINED RATE.
     Both reasons were measured, not guessed:
       - Labelling each segment printed the federal "21.00%" four times and,
         for TEXAS, on top of another label: Texas's own layer is rate_pct = 0
         (its margin tax is not on the profit scale, so it adds nothing to the
         combined 21), i.e. a ZERO-WIDTH bar whose "0.00%" landed exactly where
         the federal label already was. 38 x 17px of overlap, at every width,
         for three commits.
       - No U.S. bar showed its total at all: California read "21.00%" +
         "6.98%" and never 27.98%, which is the number the ranking sorts on.
     The federal layer carries no label: it is the same 21% in all four rows,
     and the app-wide convention is not to label a value identical in every
     row. The legend names it and the hover breaks the stack down. */
  /* ROWS STAY IN FRAME ORDER; only the AXIS is ordered, through
     categoryarray. btax.R defines a row-reordering helper (`mk`) right above
     this and then never calls it -- `bar()` passes the subset straight to
     plotly and sets the category order on the layout instead. Reordering the
     rows here put Texas first in the federal trace where the original has
     California, which the fixture diff caught. */
  const bar = (sub, name, colour, { show = true, labelled = true } = {}) => {
    if (!sub.length) return null;
    const rows = sub;
    const t = {
      type: "bar", orientation: "h",
      x: rows.map((x) => x.rate_pct),
      y: rows.map((x) => x.label),
      name, showlegend: show,
      marker: { color: colour },
      customdata: rows.map((x) =>
        `<b>${x.label}</b><br>${name}: ${(x.rate_pct).toFixed(2)}%`
        + `<br>Combined: ${(x.combined_pct).toFixed(2)}%<br>Base: ${x.base}`),
      hovertemplate: "%{customdata}<extra></extra>",
    };
    if (labelled) {
      Object.assign(t, {
        text: rows.map((x) => `${(x.combined_pct).toFixed(2)}%`),
        texttemplate: "%{text}", textposition: "outside",
        cliponaxis: false, constraintext: "none",
        textfont: font(10, { color: K.BTAX_LABEL }),
      });
    }
    return t;
  };

  /* TRACE ORDER IS THE STACK ORDER: the federal layer first, so a state's own
     share sits on top of it and carries the bar's one label. */
  const data = [
    bar(fed, "U.S. federal layer (21%)", K.BTAX_LAYER, { labelled: false }),
    bar(ownOk, "Own statutory rate", K.BTAX_BASE),
    bar(ownNo, "Different tax base — not comparable", K.BTAX_MUTED),
  ].filter(Boolean);

  const xMax = Math.max(...ord.map((x) => x.combined_pct)) * 1.12;
  /* The LA11 mean is computed over the FULL frame, not the filtered one, so
     the reference line does not move when the pill narrows the country set. */
  const lacRows = all.filter((x) => x.scope === "LAC");
  const lacMean = lacRows.reduce((a, x) => a + x.combined_pct, 0) / lacRows.length;
  const ref = btaxRefLine(lacMean, `LA11 average ${(lacMean).toFixed(1)}%`,
                          { orientation: "h" });

  const layout = btaxTheme({
    barmode: "stack", bargap: 0.35,
    xaxis: blankAxis({ title: { text: "% of taxable profit" },
                       range: [0, xMax], ticksuffix: "%" }),
    /* The INVISIBLE 6px tick is what keeps the jurisdiction name off its own
       bar: on a horizontal chart the label sits at the axis, and the harness
       measured a 1px gap here against its >= 5 assertion. */
    yaxis: categoryAxis({ categoryorder: "array", categoryarray: lev }),
    shapes: ref.shapes,
    annotations: ref.annotations,
  }, data, { hasLegend: true, canvasH: K.BT_CELL_H_RATE,
       marginL: 8, marginR: 60, marginT: 34 });

  /* `scope` is in the CSV because the chart's country set changes with the
     pill: without it two files downloaded a click apart are the same file with
     different contents. */
  const table = r.map((x) => ({
    country: x.country, code: x.code, scope: x.scope, layer: x.layer,
    rate_pct: x.rate_pct, state_statutory_pct: x.state_statutory_pct,
    combined_pct: x.combined_pct, rate_concept: x.rate_concept,
    base: x.base, comparable: x.comparable,
    source_sheet: x.source_sheet, source_cell: x.source_cell,
  }));

  return { data, layout, config: PLOT_CONFIG, table };
}

/* ===========================================================================
   By-country: the bracket schedule
   =========================================================================== */

/* btax.R:578. ONE COLOMBIAN VINTAGE, NOT BOTH. bt_rate_schedule carries the
   Régimen Simple from two sheets under the SAME `schedule` name, so filtering
   by schedule alone draws 39 rows -- six AT COL groups on top of five Table C1
   ones, with overlapping brackets and different rates. AT COL is the one to
   keep: Table C1 omits group G4 (education, human health and social welfare)
   entirely and disagrees on G5. The rows stay in the dataset; the discrepancy
   is recorded, not deleted. */
export function scheduleData({ rateSchedule }, code) {
  const drop = constants().BTAX_SCHEDULE_DROP_SHEETS ?? [];
  const rows = rateSchedule.where({ code }).toRows()
    .filter((r) => r.rate_pct !== null && r.rate_pct !== undefined
                   && !drop.includes(r.source_sheet));
  return orderBy(rows, "schedule", "series", "bracket_order");
}

export function hasSchedule(frames, code) {
  return scheduleData(frames, code).length > 0;
}

export function scheduleFigure(frames, { code }) {
  const K = constants();
  const all = scheduleData(frames, code);
  if (!all.length) return null;

  /* ONE SCHEDULE AT A TIME: a jurisdiction with two (Argentina: CIT brackets
     and Monotributo) would otherwise put a % of profit and a fixed monthly
     payment on one axis. Monotributo carries no rate at all -- the source
     gives a payment and a ceiling -- so the rate_pct filter already drops it. */
  const sch = all[0].schedule;
  const ofSchedule = all.filter((r) => r.schedule === sch);
  /* Rows with bracket_order = NA are drawn as a reference LINE, not a step.
     Argentina's gambling bracket is a flat 41.5% starting at ZERO, so it runs
     underneath brackets 1-3 rather than after them, and a step line over all
     four doubles back on itself. */
  const flat = ofSchedule.filter((r) => r.bracket_order === null
                                        || r.bracket_order === undefined);
  const s = ofSchedule.filter((r) => r.bracket_order !== null
                                     && r.bracket_order !== undefined);
  if (!s.length) return null;

  const series = [...new Set(s.map((r) => r.series))];
  /* A SEQUENTIAL BLUE RAMP, not one that ends on the accent. Two things were
     wrong with ramping to BTAX_ACCENT: it FILLED marks with the accent, which
     this module reserves for "the reference" and for outlines only, and it
     ramped dark blue to green -- a diverging scale over data (Brazil's six
     Simples brackets) that is purely ordinal. Dark-to-pale within one hue is
     what an ordered series should look like. */
  const pal = colorRamp(K.BTAX_BASE, K.FED_INK_PALE, Math.max(series.length, 2));

  /* THE ONE INTENTIONAL DIVERGENCE FROM THE R APP, and it is a fix rather
     than a port. R formats these bounds with format(lower, big.mark = ","),
     which applies to the whole VECTOR: every element is padded to the widest
     one, and R picks scientific notation when that is shorter. So Ecuador's
     hover reads "From 0e+00 to 3e+05 USD" and Brazil's "From         0 to
     180,000 BRL", with the padding spaces visible in the tooltip. Scientific
     notation for a money threshold, and ragged leading whitespace, are defects
     in a user-facing tooltip, so each bound is formatted on its own here.
     Recorded in the fixture harness as an explicit exception so it can never
     mask a different mismatch. */
  const fmt = (v) => (v === null || v === undefined
    ? "no ceiling" : Number(v).toLocaleString("en-US"));

  const data = series.map((name, i) => {
    const sub = s.filter((r) => r.series === name);
    return {
      type: "scatter", mode: "lines+markers",
      x: sub.map((r) => r.lower),
      y: sub.map((r) => r.rate_pct),
      /* `hv` is what makes it a STEP: the rate holds across the bracket and
         jumps at its edge, which is what a marginal schedule does. */
      line: { shape: "hv", color: pal[i], width: 2 },
      marker: { color: pal[i], size: 7 },
      name,
      customdata: sub.map((r) =>
        `<b>${r.series_label ?? r.series}</b><br>${r.schedule}`
        + `<br>From ${fmt(r.lower)} to ${fmt(r.upper)} ${r.unit}`
        + `<br>Rate: ${(r.rate_pct).toFixed(2)}%`),
      hovertemplate: "%{customdata}<extra></extra>",
    };
  });

  /* A SINGLE call with vectors, for the usual reason: plotly REPLACES `shapes`
     across successive layout() calls while it concatenates `annotations`, so
     two calls would keep both labels and silently drop one of the lines. */
  const ref = flat.length
    ? btaxRefLine(flat.map((r) => r.rate_pct),
                  flat.map((r) => `${r.series} ${(r.rate_pct).toFixed(1)}%`),
                  { orientation: "v" })
    : { shapes: [], annotations: [] };

  const layout = btaxTheme({
    xaxis: blankAxis({ title: { text: `Taxable base (${s[0].unit}, ${s[0].basis})` } }),
    yaxis: blankAxis({ title: { text: "marginal rate" }, ticksuffix: "%" }),
    shapes: ref.shapes,
    annotations: ref.annotations,
  }, data, {
    hasLegend: series.length > 1, canvasH: K.BT_WITHIN_H,
    marginL: 70, marginR: 30, marginT: 34,
    /* 96, not the default 72: this chart has an x-axis TITLE under its tick
       labels ("Taxable base (BRL, gross revenue)"), and at 72 the legend
       printed on top of it -- 400px wide by 2px, exactly the kind of touch
       nobody sees until the harness measures it. minwage's legended charts get
       away with 72 because their x titles are shorter and their canvases
       taller. */
    legendClearPx: 96,
  });

  return { data, layout, config: PLOT_CONFIG, table: all, schedule: sch, flat };
}
