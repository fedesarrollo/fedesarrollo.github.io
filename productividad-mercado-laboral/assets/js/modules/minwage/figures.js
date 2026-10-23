/* ============================================================================
   figures.js - the Minimum Wages charts
   ============================================================================
   Each export is a PURE function of (frames, state) returning
   {data, layout, config}. Nothing here touches the DOM, which is what lets the
   fixture diff call them directly and compare against the figures captured
   from the Shiny app in dev/fixtures/mw/.

   Ports output$plot_level (minwage.R:859), output$plot_below (:769),
   output$plot_bite (:1037) and the By-country output$plot (:1207).

   CONVENTIONS THIS MODULE OWNS, all of them from CLAUDE.md and each one a
   decision rather than a default:

   - Call order is layout(axes) -> refLine -> theme. The theme must not clobber
     the reference annotations, which is why it re-asserts them.
   - Colour means one thing each: MINWAGE_BASE a measured value, MINWAGE_MUTED
     "one national rate, nothing to compare", MINWAGE_ACCENT "the reference"
     and nothing else -- it is a 2px OUTLINE on the reference bar, never a fill.
   - A colour that means something gets a NAMED TRACE, not a vectorised fill.
     plotly cannot key a colour that is a per-point property of one trace even
     in principle, which is how the grey ended up being the module's one
     unexplained colour with only a hover -- invisible in print and on touch --
     to explain it.
   - Value labels set constraintext: "none". The default "both" shrinks an
     outside label to the bar's own thickness; Honduras's 40 bars rendered
     theirs at 7.7px through an SVG scale(0.639).
   ========================================================================= */

import { constants, fs, money, moneyDigits } from "../../core/format.js";
import { blankAxis, categoryAxis, minwageTheme, PLOT_CONFIG, font }
  from "../../charts/theme.js";
import { minwageRefLine } from "../../charts/refline.js";
import { orderBy } from "../../data/verbs.js";

const WHITE = "#ffffff";

/* The statutory full-time month, per country. Only the eleven LAC countries
   have one -- US4 and Spain have no mw_rules row, so no codified workweek in
   any source and no per-hour figure at all. */
function hoursMonth(workday) {
  const out = {};
  for (const r of workday.toRows()) out[r.country] = r.hours_month_pay;
  return out;
}

/* ===========================================================================
   1. "How much it is" -- the national level
   =========================================================================== */
export function levelFigure({ level, workday }, { period, unit }) {
  const K = constants();
  const perHour = period === "hour";
  const rows = level.toRows();

  let d;
  let baseHour = null;
  if (perHour) {
    /* Built from the PPP series and RE-INDEXED, never by dividing the stored
       index: that index is the monthly value over the monthly LA11 mean, so
       dividing it by hours would leave a monthly base under hourly bars. */
    const hrs = hoursMonth(workday);
    d = rows.filter((r) => r.unit === "ppp" && r.country in hrs)
            .map((r) => ({ country: r.country, value: r.value / hrs[r.country] }));
    /* The LA11 base is the mean of the eleven shown -- all of them, since the
       two comparators are absent here. */
    baseHour = d.reduce((a, r) => a + r.value, 0) / d.length;
    if (unit === "index") d = d.map((r) => ({ ...r, value: r.value / baseHour }));
  } else {
    d = rows.filter((r) => r.unit === unit)
            .map((r) => ({ country: r.country, value: r.value }));
  }

  const isIndex = unit === "index";
  /* Computed from the data rather than hardcoded: the mean of the ELEVEN Latin
     American countries. In the per-month view US4 and Spain are indexed
     AGAINST that base but are not IN it, which is what the footer says. */
  const pppRows = rows.filter((r) => r.unit === "ppp");
  const lac = pppRows.filter((r) => !K.MINWAGE_COMPARATORS?.includes(r.country)
                                    && r.country !== "US4" && r.country !== "Spain");
  const basePpp = perHour ? baseHour
    : lac.reduce((a, r) => a + r.value, 0) / lac.length;   /* 654.7 */

  /* Ranked high -> low. This is the ONE chart in the module that is a single
     series ranking, and alphabetical order hides the only thing it measures --
     which is why orderCountries() is deliberately not used here. */
  d = orderBy(d, { key: "value", desc: true });
  const categories = d.map((r) => r.country);

  let yTitle, tickprefix, ticksuffix, tickformat, texttemplate, hover, refVal, refLab;
  if (isIndex) {
    yTitle = perHour ? "Hourly minimum wage (LA11 average = 1)"
                     : "Minimum wage (LA11 average = 1)";
    tickprefix = ""; ticksuffix = "×"; tickformat = ".1f";
    texttemplate = "%{y:.2f}×";
    hover = `<b>%{x}</b><br>%{y:.2f}× the LA11 average${perHour ? " per hour" : " per month"}<extra></extra>`;
    refVal = 1; refLab = "LA11 average = 1.00×";
  } else if (perHour) {
    /* Dollars AND cents, not the whole dollars the monthly view uses: the whole
       hourly series lives between $2.21 and $4.96, so ",.0f" would print four
       bars as "$2" and print the comparison away. */
    yTitle = "Minimum wage per hour (US$ PPP 2017)";
    tickprefix = "$"; ticksuffix = ""; tickformat = ".2f";
    texttemplate = "%{y:.2f}";
    hover = "<b>%{x}</b><br>US$ %{y:.2f} per hour at 2017 PPP<extra></extra>";
    refVal = basePpp; refLab = `LA11 average = $${(basePpp).toFixed(2)}`;
  } else {
    yTitle = "Minimum wage (US$ PPP 2017)";
    tickprefix = "$"; ticksuffix = ""; tickformat = ",.0f";
    texttemplate = "%{y:,.0f}";
    hover = "<b>%{x}</b><br>US$ %{y:,.1f} per month at 2017 PPP<extra></extra>";
    refVal = basePpp;
    refLab = `LA11 average = $${Math.round(basePpp).toLocaleString("en-US")}`;
  }

  /* A bar whose top sits just under the reference gets its label drawn ON the
     dashed line: the line is layer "below" so it passes behind the bars, but
     the label has no background and the dashes show between the glyphs
     (Colombia at 363 against a reference of 385 was struck through).
     `textposition` takes a vector, so those few labels go INSIDE their bar.

     The px-to-data conversion needs the PLOT AREA height, not the canvas:
     automargin spends roughly a third of this canvas on the -35° country
     labels, and using the canvas underestimated the band by that third and let
     Colombia keep colliding. 0.65 is the measured share. */
  const yTop = Math.max(...d.map((r) => r.value)) * 1.12;
  const plotAreaH = K.MW_CELL_H_LEVEL * 0.65;
  const labelBand = yTop * (fs(10) + 7) / plotAreaH;
  const inside = d.map((r) => Math.abs(r.value - refVal) < labelBand);

  const ref = minwageRefLine(refVal, refLab, { orientation: "v" });

  const data = [{
    type: "bar",
    x: categories,
    y: d.map((r) => r.value),
    marker: { color: K.MINWAGE_BASE },
    /* Value labels are a convention this module introduced. This chart earns
       them: US4 at 2.59× compresses the whole LA11 range into about a quarter
       of the axis, so position alone can no longer be read. */
    text: d.map((r) => r.value),
    texttemplate,
    textposition: inside.map((i) => (i ? "inside" : "outside")),
    insidetextanchor: "end",
    cliponaxis: false,
    constraintext: "none",
    textfont: font(10, { color: K.MINWAGE_LABEL }),
    insidetextfont: font(10, { color: WHITE }),
    hovertemplate: hover,
    showlegend: false,
  }];

  const layout = minwageTheme({
    bargap: 0.25,
    /* Thirteen country names fit unrotated at full width but not at the ~600px
       the grid falls to under 820px, where plotly silently auto-rotates. -35°
       is stated rather than left to chance. */
    xaxis: blankAxis({ title: { text: "" }, type: "category", tickangle: -35,
                       automargin: true, categoryorder: "array",
                       categoryarray: categories }),
    /* Headroom for the outside labels: cliponaxis lets them draw past the axis
       but the topmost one is still cut by the plot margin. */
    yaxis: blankAxis({ title: { text: yTitle }, tickprefix, ticksuffix,
                       tickformat, range: [0, yTop] }),
    shapes: ref.shapes,
    annotations: ref.annotations,
    showlegend: false,
  }, data, { canvasH: K.MW_CELL_H_LEVEL, marginL: 82, marginR: 24, marginT: 34 });

  /* What the CSV serves, and the reason `level_unit` is in it: `level` changes
     meaning with the pill, so without it two files downloaded a click apart
     are indistinguishable. */
  const unitLabel = (unit === "index" ? "index (LA11 = 1)" : "US$ PPP 2017")
    + (perHour ? ", per hour" : ", per month");
  const table = d.map((r) => ({ country: r.country, level: r.value,
                                level_unit: unitLabel }));

  return { data, layout, config: PLOT_CONFIG, table };
}

/* ===========================================================================
   2. "Who earns less" -- compliance
   =========================================================================== */
/* NESTED BARS, NOT A TOGGLE. The build asserts hourly <= monthly for all 39
   country x universe pairs: the hourly measure IS the monthly one with
   part-timers' earnings scaled to a full-time equivalent, so the set it counts
   is a strict SUBSET. Drawing the subset nested inside its superset states
   that relationship; a monthly/hourly pill would have hidden the gap between
   them, and the gap is the finding.

   barmode "overlay", NEVER "stack": stacking would put the hourly count on top
   of a segment that already contains it, i.e. draw the same workers twice. */
export function belowFigure({ below }, { group }) {
  const K = constants();
  const rows = below.where({ group }).toRows();

  const byCountry = new Map();
  for (const r of rows) {
    const o = byCountry.get(r.country) ?? { country: r.country,
                                            is_aggregate: r.is_aggregate };
    if (r.basis === "monthly") o.value_monthly = r.value;
    if (r.basis === "hourly") o.value_hourly = r.value;
    byCountry.set(r.country, o);
  }
  /* Ascending, because plotly draws the FIRST category at the BOTTOM of a
     horizontal bar chart: this puts the highest share at the top. */
  const w = orderBy([...byCountry.values()], "value_hourly");
  const la11 = w.find((r) => r.is_aggregate === true);
  const d = w.filter((r) => r.is_aggregate !== true);

  const categories = d.map((r) => r.country);
  const hover = d.map((r) =>
    `<b>${r.country}</b><br>Below the minimum per hour worked: ${(r.value_hourly).toFixed(1)}%`
    + `<br>Below the monthly minimum: ${(r.value_monthly).toFixed(1)}%`
    + `<br>Counted on the monthly basis only: ${(r.value_monthly - r.value_hourly).toFixed(1)} pp`);

  const base = {
    type: "bar", orientation: "h", y: categories,
    texttemplate: "%{x:.1f}%", constraintext: "none",
    customdata: hover, hovertemplate: "%{customdata}<extra></extra>",
  };

  const data = [
    /* Drawn FIRST so it sits behind, but listed SECOND in the legend: the
       legend should read from the measure the ranking and the solid bars are
       built on. */
    { ...base, x: d.map((r) => r.value_monthly),
      name: "Below the monthly minimum wage", legendrank: 2,
      marker: { color: K.MINWAGE_MUTED },
      text: d.map((r) => r.value_monthly),
      textposition: "outside", cliponaxis: false,
      textfont: font(10, { color: K.MINWAGE_LABEL }) },
    /* Inside, anchored to the bar end: an outside label here would land in the
       pale bar and read as belonging to it. */
    { ...base, x: d.map((r) => r.value_hourly),
      name: "Below the minimum per hour worked", legendrank: 1,
      marker: { color: K.MINWAGE_BASE },
      text: d.map((r) => r.value_hourly),
      textposition: "inside", insidetextanchor: "end",
      textfont: font(10, { color: WHITE }) },
  ];

  /* ONE reference line, on the per-hour measure. Both averages exist, but at
     this scale their two labels overlap, and the per-hour figure is the one the
     ranking and the solid bars are built on. */
  const ref = la11
    ? minwageRefLine(la11.value_hourly,
                     `LA11 average, per hour = ${(la11.value_hourly).toFixed(1)}%`,
                     { orientation: "h" })
    : { shapes: [], annotations: [] };

  const layout = minwageTheme({
    barmode: "overlay", bargap: 0.3,
    /* The axis title carries the selected cut: the chart has to say which
       workers it counts without the reader looking back up at the pills. */
    xaxis: blankAxis({
      title: { text: `${K.MINWAGE_BELOW_AXIS[group]} below the minimum wage (%)` },
      ticksuffix: "%", dtick: 25,
      range: [0, Math.max(...d.map((r) => r.value_monthly)) * 1.12] }),
    yaxis: categoryAxis({ categoryorder: "array", categoryarray: categories }),
    shapes: ref.shapes,
    annotations: ref.annotations,
  }, data, { hasLegend: true, canvasH: K.MW_CELL_H_BELOW,
       marginL: 8, marginR: 60, marginT: 34 });

  return { data, layout, config: PLOT_CONFIG, table: d };
}

/* ===========================================================================
   3. "Where it bites" -- the wage distribution in MW units
   =========================================================================== */
export function biteFigure({ wageDist }, { basis, pctl }) {
  const K = constants();
  const all = wageDist.where({ basis }).toRows();

  /* Row order IS the report figure's axis order (ascending by median) and it
     DIFFERS between the monthly and hourly sheets, so it comes from `rank` per
     basis rather than from orderCountries(). Reversed because level 1 of a
     plotly categorical y axis sits at the BOTTOM. */
  const ranked = orderBy(all, "rank");
  const lv = [...new Set(ranked.map((r) => r.country))];
  const categories = [...lv].reverse();

  const stats = K.MINWAGE_PCTL_STATS;
  const d = all.filter((r) => stats.includes(r.stat));
  /* The filter narrows WHICH quartiles are drawn, never the axis: x_max is
     computed over all three so switching pills compares like with like instead
     of rescaling under the reader. */
  const xMax = Math.max(...d.map((r) => r.value)) * 1.06;
  const shown = pctl === "all" ? stats : [pctl];

  const data = [];
  stats.forEach((st, i) => {
    /* Indexed over ALL three so a quartile keeps its ramp colour when shown
       alone: the ramp encodes position on the ladder, and re-indexing the
       subset would paint the 75th in the 25th's tint. */
    if (!shown.includes(st)) return;
    const s = d.filter((r) => r.stat === st);
    const label = K.MINWAGE_PCTL_LABELS[st];
    const isMedian = st === "p50";
    data.push({
      type: "scatter",
      /* "markers+text" would be needed if this carried labels; add_markers()
         in R hardcodes mode "markers", so it is spelled out either way. */
      mode: "markers",
      x: s.map((r) => r.value),
      y: s.map((r) => r.country),
      name: label,
      marker: {
        color: K.MINWAGE_PCTL_RAMP[i],
        /* The median is the quotable number, so it is findable on a NON-colour
           channel: colour still encodes the percentile ladder, in order. */
        symbol: isMedian ? "diamond" : "circle",
        size: isMedian ? 13 : 10,
        line: { color: WHITE, width: 1 },
      },
      hovertemplate: `<b>%{y}</b><br>${label}: %{x:.2f}× the minimum wage<extra></extra>`,
    });
  });

  const ref = minwageRefLine(1, "Minimum wage = 1×", { orientation: "h" });

  const layout = minwageTheme({
    xaxis: blankAxis({ title: { text: "Wage as a multiple of the minimum wage" },
                       ticksuffix: "×", tickformat: ".0f", dtick: 2,
                       range: [0, xMax] }),
    yaxis: categoryAxis({ categoryorder: "array", categoryarray: categories }),
    /* The legend entries are bare ordinals; the title is what says they are
       percentiles at all. */
    legend: { title: { text: "Percentile of the wage distribution" } },
    showlegend: shown.length > 1,
    shapes: ref.shapes,
    annotations: ref.annotations,
  }, data, { hasLegend: true, canvasH: K.MW_CELL_H_BITE,
       marginL: 8, marginR: 30, marginT: 34 });

  return { data, layout, config: PLOT_CONFIG, table: d };
}

export { hoursMonth, moneyDigits, money };

/* ===========================================================================
   4. By-country -- what each legislated rate actually pays
   ===========================================================================
   Ports output$plot (minwage.R:1207) and its country_rates() reactive (:1132).

   THE AXIS IS THE REAL WAGE, NOT A RATIO. Normalized, this chart could say how
   far rates spread but never what any of them paid, and the eight single-rate
   countries were a lone bar pinned at 1.00 carrying no information at all. The
   ratio survives as the bar label and in the hover.

   HORIZONTAL in both branches: `dim_primary` is a long nominal compound label
   ("Rio de Janeiro · G6", "New York · Long Island & Westchester", 36
   characters). Non-salary's vertical convention exists for an ORDERED NUMERIC
   x (wage level, tenure) where short ticks are the point, and does not
   transfer to 22 nominal strings. */

/* country_rates(): join the dispersion ratios to the absolute wages.
   The join is on (dim_primary, dim_secondary) and the R version asserts no
   value is missing -- mw_rate_value has exactly one row per mw_dispersion row,
   which is what proves the bars and the numbers tell the same story. */
export function countryRates({ dispersion, rateValue }, country) {
  const vals = rateValue.where({ country }).toRows();
  const key = (r) => `${r.dim_primary} ${r.dim_secondary ?? ""}`;
  const byKey = new Map(vals.map((r) => [key(r), r]));

  return dispersion.where({ country }).toRows().map((r) => {
    const m = byKey.get(key(r));
    if (!m) throw new Error(`mw_rate_value has no row for ${country} / ${key(r)}`);
    return {
      ...r,
      value_lcu: m.value_lcu,
      currency: m.currency,
      /* The report prints "Infrastructure services" with an asterisk in Figure
         B2.2 and that figure's own footnote is not recoverable from the source
         image. An unexplained asterisk on an axis label is worse than no
         marker, and it collides with this module's own asterisk convention
         (.chart-provisional-mark means PLACEHOLDER DATA), so it is stripped
         for DISPLAY ONLY -- the raw string stays in the data and the CSV. */
      label: String(r.dim_primary).replace(/\s*\*$/, ""),
    };
  });
}

export function withinFigure(frames, { country }) {
  const K = constants();
  const d = countryRates(frames, country);
  const grouped = d.some((r) => r.dim_secondary !== null && r.dim_secondary !== undefined);
  const isSingle = d.length === 1;
  const cur = d[0].currency;
  const curName = K.MINWAGE_CURRENCY_NAME?.[cur] ?? cur;
  const sym = K.MINWAGE_CURRENCY_SYMBOL?.[cur] ?? cur;

  const digits = moneyDigits(d.map((r) => r.value_lcu));
  const moneyFmt = (v) => money(v, cur, { withSymbol: false, digits });
  const years = [...new Set(d.map((r) => r.year))].sort().join(" / ");
  const xTop = Math.max(...d.map((r) => r.value_lcu)) * 1.16;
  const xAxis = blankAxis({
    title: { text: `Minimum wage (${curName} per month, ${years})` },
    tickprefix: `${sym} `, tickformat: ",.0f", range: [0, xTop],
  });
  const refValue = d.find((r) => r.is_reference === true)?.value_lcu;

  const data = [];
  let refLabel = null;
  let legendTitle = null;

  if (grouped) {
    /* 2-D case, Honduras only today: 10 sectors x 4 firm sizes.
       Series order and the legend title come from the DATA, never a hardcoded
       vector -- the grouping dimension differs by country, and a fixed vector
       silently produced an all-NA factor for any other one. */
    const lv = [...new Set(d.filter((r) => r.dim_secondary != null)
                            .map((r) => r.dim_secondary))];
    legendTitle = d.find((r) => r.secondary_label)?.secondary_label ?? "";
    const sectors = [...new Set(d.map((r) => r.label))];
    const categories = [...sectors].reverse();     /* first sector at the TOP */

    lv.forEach((level, i) => {
      const s = d.filter((r) => r.dim_secondary === level);
      /* is_reference is encoded the same way in BOTH branches -- an accent
         outline. It used to be honoured here only as a colour and ignored in
         the other branch. */
      const isRef = s.every((r) => r.is_reference === true);
      const last = i === lv.length - 1;
      data.push({
        type: "bar", orientation: "h",
        x: s.map((r) => r.value_lcu),
        y: s.map((r) => r.label),
        name: `${level} workers${isRef ? " (reference)" : ""}`,
        marker: {
          color: K.MINWAGE_SIZE_RAMP[Math.min(i, K.MINWAGE_SIZE_RAMP.length - 1)],
          line: { color: isRef ? K.MINWAGE_ACCENT : "rgba(0,0,0,0)",
                  width: isRef ? 2 : 0 },
        },
        /* `text` is the raw multiple on EVERY trace because the hovertemplate
           formats it too; only the printed label is conditional. Forty labels
           in one canvas is clutter and eight of the ten sectors carry
           identical multiples, so only the LARGEST firm-size band -- the top
           of the ladder, which is the figure's message -- is labelled. */
        text: s.map((r) => r.value),
        /* R's `texttemplate = NULL` means the ATTRIBUTE IS ABSENT, not null --
           spread-conditional rather than a null, or plotly gets a key it never
           had in the original. */
        ...(last ? { texttemplate: "%{text:.2f}×" } : {}),
        textposition: last ? "outside" : "none",
        cliponaxis: false,
        constraintext: "none",
        textfont: font(10, { color: K.MINWAGE_LABEL }),
        customdata: s.map((r) => moneyFmt(r.value_lcu)),
        hovertemplate: `<b>%{y}</b><br>${level} workers: ${sym} %{customdata}`
          + `<br>%{text:.2f}× the sector's 1-10 worker rate<extra></extra>`,
      });
    });

    /* NO reference line here. Honduras has TEN references -- one 1-10 worker
       rate per sector -- so a single vertical line would be Agriculture's
       alone and would read as if it applied to all ten. The legend's
       "1-10 workers (reference)" swatch and the accent outline carry it. */
    const layout = minwageTheme({
      /* No bargroupgap: this plotly build rejects it as an invalid layout
         attribute (bargap is fine). */
      barmode: "group", bargap: 0.28,
      xaxis: xAxis,
      yaxis: categoryAxis({ categoryorder: "array", categoryarray: categories }),
      /* Default trace order on purpose: the legend is HORIZONTAL so it reads
         left to right, and firm size is an ORDERED dimension -- smallest
         first, light to dark, matching MINWAGE_SIZE_RAMP. */
      legend: { title: { text: legendTitle } },
    }, data, { hasLegend: true, canvasH: K.MW_WITHIN_H, legendClearPx: 96,
         marginB: 150, marginL: 8, marginR: 70, marginT: 34 });
    return { data, layout, config: PLOT_CONFIG, table: d };
  }

  /* 1-D case: Brazil 22, Dominican Rep. 7, US4 7, Mexico 2, singles 1.
     Data order is PRESERVED rather than sorted by value: Brazil's labels
     encode a state -> group hierarchy that sorting would interleave. */
  const categories = d.map((r) => r.label).reverse();
  /* Same collision as the level chart, on the x axis this time, where the
     label's WIDTH is what collides ("0.98×" for Free zones landed on the
     reference line in Dominican Rep.). The plot area is about three quarters
     of the canvas width once the long rate names are accounted for; 1100px is
     that share at the design width. */
  const labelBand = xTop * 52 / 1100;
  const insideOf = (v) => Math.abs(v - refValue) < labelBand;

  /* TWO NAMED TRACES so the accent outline that marks the reference gets a
     LEGEND KEY. As a per-point property of one trace plotly cannot key it even
     in principle, which left the reference explained in prose only -- and
     asymmetric with Honduras, whose legend does show it. */
  const barTrace = (sub, name, isRef) => {
    if (!sub.length) return;
    data.push({
      type: "bar", orientation: "h",
      x: sub.map((r) => r.value_lcu),
      y: sub.map((r) => r.label),
      name, showlegend: !isSingle,
      marker: {
        color: K.MINWAGE_BASE,
        line: { color: isRef ? K.MINWAGE_ACCENT : "rgba(0,0,0,0)",
                width: isRef ? 2 : 0 },
      },
      text: isSingle ? sub.map((r) => moneyFmt(r.value_lcu)) : sub.map((r) => r.value),
      texttemplate: isSingle ? "%{text}" : "%{text:.2f}×",
      textposition: isSingle ? "outside"
        : sub.map((r) => (insideOf(r.value_lcu) ? "inside" : "outside")),
      insidetextanchor: "end",
      insidetextfont: font(10, { color: WHITE }),
      cliponaxis: false,
      constraintext: "none",
      textfont: font(10, { color: K.MINWAGE_LABEL }),
      customdata: sub.map((r) => moneyFmt(r.value_lcu)),
      hovertemplate: isSingle
        ? `<b>%{y}</b><br>${sym} %{customdata} a month<extra></extra>`
        : `<b>%{y}</b><br>${sym} %{customdata} a month`
          + `<br>%{text:.2f}× the reference rate<extra></extra>`,
    });
  };
  barTrace(d.filter((r) => r.is_reference === true), "Reference rate", true);
  barTrace(d.filter((r) => r.is_reference !== true), "Other rates", false);

  refLabel = `Reference rate: ${money(refValue, cur, { digits })}`;

  /* No reference line for a single-rate country either: it would sit exactly
     on the tip of the only bar and say nothing. */
  const ref = (!isSingle && refLabel)
    ? minwageRefLine(refValue, refLabel, { orientation: "h" })
    : { shapes: [], annotations: [] };

  const layout = minwageTheme({
    /* KEPT: a single-rate country would otherwise render one bar spanning 80%
       of the plot, which reads as a broken chart. */
    bargap: isSingle ? 0.8 : 0.2, barmode: "overlay",
    xaxis: xAxis,
    yaxis: categoryAxis({ categoryorder: "array", categoryarray: categories }),
    shapes: ref.shapes,
    annotations: ref.annotations,
  }, data, {
    hasLegend: grouped || !isSingle,
    canvasH: K.MW_WITHIN_H,
    /* This chart's currency ticks ("RD$ 10,000") rotate once the viewport
       narrows, taking the furniture under the axis from 60px to 86px --
       measured at 900px. The default 72px clearance put the legend on top of
       the axis title there, so this one buys more room, and margin_b follows
       or the legend clears the title only to fall off the canvas. */
    legendClearPx: 96, marginB: 150, marginL: 8, marginR: 70, marginT: 34,
  });

  return { data, layout, config: PLOT_CONFIG, table: d };
}
