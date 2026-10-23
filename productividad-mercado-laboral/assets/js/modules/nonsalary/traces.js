/* ============================================================================
   traces.js - the four trace builders
   ============================================================================
   Sixteen figure shapes collapse to four builders x two layouts. Each takes
   the output of buildFrame() and a spec, and returns traces -- grouped by
   panel for the across view, flat for the within view's single
   multicategory panel.

   WHAT THE CAPTURED FIGURES SHOW, and what each builder therefore has to do:

     one bar per scenario   2 traces per panel, each a SINGLE x value
                            (["Min"] or ["Max"]) with one y. Value labels on.
                            Colour per scenario, or one flat colour for both
                            when the category is social or a single bonus
                            component.
     stacked series         one trace per series per panel, x = ["Min","Max"]
                            with two y values. NO value labels -- a stacked
                            bar's segments cannot each carry one legibly.
                            legendgroup ties the series across panels and only
                            PANEL 1 shows a legend key.

   The value-label mechanics are the app-wide convention: texttemplate with
   textposition "outside", cliponaxis false so the label may draw past the
   axis, and constraintext "none" -- the default "both" shrinks an outside
   label to the bar's own thickness, which is how 40 bars in 700px ended up
   rendering their labels at 7.7px through an SVG scale(0.639).
   ========================================================================= */

import { font } from "../../charts/theme.js";

const LABEL = { texttemplate: "%{y:.0f}", textposition: "outside" };

/* One bar per scenario. `colorFor` is keyed by the SERIES name, which for this
   builder is the scenario. */
function scenarioTraces(rows, { colorFor, labels, scenarios }) {
  const out = [];
  for (const scenario of scenarios) {
    /* NOT skipped when empty: the captured bonus-ob figure emits a trace per
       (panel, scenario) with a null y for the nine countries that have no
       such bonus, rather than dropping their panels. */
    const sub = rows.filter((r) => r.Scenario === scenario);
    const value = sub.length ? sub[0].value : null;
    const t = {
      type: "bar",
      x: [scenario],
      y: [value],
      name: scenario,
      marker: { color: colorFor(scenario) },
      showlegend: false,
    };
    if (labels) {
      Object.assign(t, {
        text: [value], ...LABEL,
        cliponaxis: false, constraintext: "none",
        textfont: font(10),
      });
    }
    out.push(t);
  }
  return out;
}

/* One trace per series, each spanning both scenarios. `firstPanel` decides
   whether this panel's traces carry the legend keys. */
function stackTraces(rows, { series, colorFor, scenarios }, firstPanel) {
  const out = [];
  for (const name of series) {
    const sub = rows.filter((r) => r.Type === name);
    if (!sub.length) continue;
    const y = scenarios.map((s) => {
      const hit = sub.find((r) => r.Scenario === s);
      return hit ? hit.value : null;
    });
    out.push({
      type: "bar",
      x: scenarios,
      y,
      name,
      marker: { color: colorFor(name) },
      /* ONE legend key per series, not one per panel: the group ties the
         thirteen panels' traces together so a click toggles the series
         everywhere, and only panel 1 contributes the key. */
      legendgroup: name,
      showlegend: firstPanel,
    });
  }
  return out;
}

/* ACROSS: traces grouped by panel, in panel order. */
export function panelTraces(built, spec) {
  const { panels, rows } = built;
  return panels.map((country, i) => {
    const sub = rows.filter((r) => r.country === country);
    return spec.stack
      ? stackTraces(sub, built, i === 0)
      : scenarioTraces(sub, { colorFor: built.colorFor, labels: spec.labels,
                              scenarios: built.scenarios });
  });
}

/* WITHIN, comparing wage levels: ONE panel with a `multicategory` x axis, whose
   two levels are the scenario and the wage. */
export function multicategoryTraces(built, spec) {
  const { rows, series, colorFor, wageLabels } = built;
  const scenarios = ["Min", "Max"];

  /* Every (scenario, wage) cell the axis will show, in that order. */
  const cells = [];
  for (const s of scenarios) for (const w of wageLabels) cells.push([s, w]);
  const x = [cells.map((c) => c[0]), cells.map((c) => c[1])];

  if (!spec.stack) {
    /* One trace per scenario, each carrying only its own wage levels. */
    return scenarios.map((s) => {
      const sub = rows.filter((r) => r.Scenario === s);
      if (!sub.length) return null;
      const t = {
        type: "bar",
        x: [sub.map(() => s), sub.map((r) => r.wage)],
        y: sub.map((r) => r.value),
        name: s,
        marker: { color: colorFor(s) },
        showlegend: false,
      };
      if (spec.labels) {
        Object.assign(t, {
          text: sub.map((r) => r.value), ...LABEL,
          cliponaxis: false, constraintext: "none", textfont: font(10),
        });
      }
      return t;
    }).filter(Boolean);
  }

  /* NO EMPTY SEED TRACE. build_multicategory_stack starts from
     `plot_ly(type = "bar")` and then adds a trace per series, so every
     captured stacked By-country figure carries a data-less FIRST trace -- 3
     traces for 2 series, 6 for 5, 5 for 4. It draws nothing and makes plotly
     warn "Can't display both discrete & non-discrete data on same axis";
     the minwage module's own notes record removing exactly this seed for that
     reason.

     Dropped here on the repository owner's call. It changes the trace count,
     so the affected figures are listed as SUPERSEDED in
     site/tests/fixtures.js, where each of the port's traces is compared
     against the fixture's at an offset of one -- the data still has to match
     exactly, only the phantom trace is allowed to be absent. */
  const out = [];
  series.forEach((name, i) => {
    const sub = rows.filter((r) => r.Type === name);
    if (!sub.length) return;
    const y = cells.map(([s, w]) => {
      const hit = sub.find((r) => r.Scenario === s && r.wage === w);
      return hit ? hit.value : null;
    });
    out.push({
      type: "bar", x, y, name,
      marker: { color: colorFor(name) },
      /* `legendrank`, NOT legendgroup + showlegend. This is one panel, so
         there is nothing to group ACROSS -- the across subplots need the group
         because thirteen panels each carry the same series. What this figure
         needs is the legend in STACK order, which is what the rank gives.

         The rank is the position in the FULL stack order, not in the series
         that survived the filter: a By-country chart showing only Paid Leave
         ranks it 2, because that is where it sits among the four bonuses. */
      legendrank: (built.fullOrder ?? series).indexOf(name) + 1,
    });
  });
  return out;
}
