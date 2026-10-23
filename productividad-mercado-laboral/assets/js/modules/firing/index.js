/* ============================================================================
   index.js - the Firing Costs module
   ============================================================================
   Ports firing_server (firing.R:703), firing_across_server (:391),
   firing_within_server (:623) and tabs/ui/firing.R.

   THREE ACROSS SECTIONS, NOT FOUR: the range dumbbell and the ceiling chart
   stay a PAIR. They are one question at two angles -- how the schedule grows
   over tenure, and where it stops -- and they already share a country
   ordering and the two-column layout. If fc_ceiling is ever folded into the
   tenure ranking, "How it grows" becomes the dumbbell alone and nothing else
   moves.

   The scenario matrix is section 3, MOVED out of the across detail drawer --
   moved, not duplicated, because in Shiny an output id binds only once in the
   DOM, which is why firing_across_ui passes detail_label = NULL. The
   By-country view keeps its drawer and holds BOTH regulatory tables, which is
   why the drawer is labelled "Dismissal-cost scenarios and rules": a toggle
   saying "scenarios" alone would not promise the rules that are in there with
   it. For the same reason the across section is still just "Scenarios" -- that
   section really is the matrix alone.
   ========================================================================= */

import { h, fill } from "../../ui/dom.js";
import { moduleLayout, gridCell, singlePlotBody, sectionShell } from "../../ui/layout.js";
import { topicTitle, viewSwitch, sectionBar, filterBar, textSlider,
         flagRow, chartHeading, chartFooter } from "../../ui/chrome.js";
import { createStore } from "../../core/store.js";
import { constants } from "../../core/format.js";
import { FIRING_CANVAS_H, FIRING_WITHIN_H } from "../../charts/theme.js";
import { wireDownloads, today } from "../../core/download.js";
import * as F from "./figures.js";
import * as T from "./tables.js";
import * as TXT from "./text.js";

const TOPIC = "firing";

/* The fields a shared link carries, after the topic and the view.
   Anything equal to its default is omitted, so the common URL stays
   `#/firing`. */
const SHARE_FIELDS = ["section", "tenureYears", "country"];
/* Named in charts/theme.js, where the theme's own default reads them, so the
   canvas height and the margin arithmetic cannot drift apart -- the hazard
   CLAUDE.md flags about firing's two inline heights. */
const FC_ACROSS_H = FIRING_CANVAS_H;
const FC_WITHIN_H = FIRING_WITHIN_H;

export async function mount({ el, db, selection = {}, persist = null }) {
  const K = constants();
  const [tenure, range, ceiling, scenarios, notice, rules] =
    await db.load("fc_tenure", "fc_range", "fc_ceiling",
                  "fc_scenarios", "fc_notice", "fc_rules");

  const steps = F.tenureSteps(tenure);
  const stepLabels = steps.map((s) => s.display);
  const tenureOf = (display) =>
    steps.find((s) => s.display === display)?.tenure ?? 10;
  const displayOf = (years) =>
    steps.find((s) => s.tenure === years)?.display ?? String(years);

  const scenarioFrames = { scenarios, notice };

  const switchEl = h("div");
  const masthead = topicTitle("Firing costs", null, switchEl);

  const across = moduleLayout({
    topic: TOPIC, view: "across", subtitle: TXT.VIEW_SUBTITLE.across,
    detailLabel: null,
  });
  const within = moduleLayout({
    topic: TOPIC, view: "within", subtitle: TXT.VIEW_SUBTITLE.within,
    detailLabel: "Dismissal-cost scenarios and rules",
    hasTopControls: false, hasPlotControls: true,
  });
  el.append(masthead, across.el, within.el);

  const cellCost = gridCell(FC_ACROSS_H, { id: "firing-across-plot_cost10" });
  /* The half-width pair: no `across-cell-full`, so the grid puts them side by
     side. They are deliberately not two sections. */
  const cellRange = gridCell(FC_ACROSS_H, { full: false, id: "firing-across-plot_range" });
  const cellCeiling = gridCell(FC_ACROSS_H, { full: false, id: "firing-across-plot_ceiling" });
  const scenarioHost = h("div.across-cell.across-cell-full");

  const sections = [
    sectionShell("cost", cellCost.el),
    sectionShell("growth", cellRange.el, cellCeiling.el),
    sectionShell("scenarios", scenarioHost),
  ];
  fill(across.slots.main, sections.map((s) => s.el));

  const withinBody = singlePlotBody(FC_WITHIN_H, "firing-within-plot");
  fill(within.slots.main, withinBody.nodes);

  const store = createStore({
    view: "across",
    section: K.FIRING_SECTIONS[0],
    tenureYears: 10,
    country: K.FIRING_WITHIN_COUNTRIES[0],
  }, {
    onRender: render,
    /* `tenureYears` accepts either the number or the slider's own label
       ("3-6 months"). The stop list lives here, so a caller that only knows
       the label -- dev/measure_charts.R's sweep passes exactly those -- does
       not have to carry a copy of it. */
    normalize: (s) => (typeof s.tenureYears === "string"
      ? { ...s, tenureYears: tenureOf(s.tenureYears) } : s),
  });

  /* Seed from the URL before the first render, so a shared link opens on
     what it names rather than on the default and then jumping. */
  if (Object.keys(selection).length) store.set(selection);

  /* And keep the URL in step. replaceState, not push: a filter click is
     not a navigation. */
  if (persist) {
    store.subscribe((st) => {
      const fields = {};
      for (const f of SHARE_FIELDS) {
        if (st[f] !== undefined && st[f] !== store.defaults()[f]) fields[f] = st[f];
      }
      persist(st.view, fields);
    });
  }

  const pick = (key) => (value) => store.set({ [key]: value });

  function renderControls(s) {
    fill(switchEl, viewSwitch(s.view, "Firing costs view",
                              (view) => store.set({ view })));

    /* Only "How much it costs" has a filter. The other two sections get no
       bar at all rather than an empty strip with a top border. */
    fill(across.slots.topControls,
      sectionBar(K.FIRING_SECTIONS, K.FIRING_SECTION_LABELS, s.section,
                 pick("section")),
      s.section === "cost" ? filterBar([
        /* `.firing-tenure-cell` carries the flex-basis and `.firing-tenure-slider`
           the width. The basis is on the CELL because that is an item of
           `.labor-filter-bar`, a flex ROW where flex-basis is a width; the
           slider sits in `.labor-filter-group`, a flex COLUMN where a basis
           would size its HEIGHT instead. That distinction is the one thing
           that changed when the slider moved out of the chart's own cell. */
        textSlider({
          labels: stepLabels,
          value: displayOf(s.tenureYears),
          onPick: (display) => store.set({ tenureYears: tenureOf(display) }),
          label: "Tenure",
          cellClass: "firing-tenure-cell",
        }),
      ]) : null);

    /* Plainer than minwage's row: no count badge, because every one of these
       eleven countries has a full schedule to show. */
    fill(within.slots.plotControls, flagRow({
      items: K.FIRING_WITHIN_COUNTRIES.map((name) => ({
        value: name, label: name, code: K.FIRING_NAME_TO_CODE[name],
      })),
      active: s.country, onPick: pick("country"),
      flagMap: K.COUNTRY_FLAG_MAP,
      strong: false,
    }));
  }

  function draw(cell, figure, heading, footer) {
    fill(cell.heading, chartHeading(heading.title, heading.description));
    window.Plotly.react(cell.plot, figure.data, figure.layout, figure.config);
    fill(cell.footer, chartFooter(footer));
  }

  async function render(s) {
    renderControls(s);
    const isAcross = s.view === "across";
    across.el.hidden = !isAcross;
    within.el.hidden = isAcross;

    if (isAcross) {
      for (const sec of sections) sec.show(sec.id === s.section);

      if (s.section === "cost") {
        const fig = F.costFigure({ tenure }, s);
        draw(cellCost, fig, TXT.costHeading(displayOf(s.tenureYears)),
             TXT.FOOTER.cost);
        return { table: fig.table };
      }
      if (s.section === "growth") {
        const r = F.rangeFigure({ range });
        const c = F.ceilingFigure({ ceiling });
        draw(cellRange, r, TXT.HEADING.range, TXT.FOOTER.range);
        draw(cellCeiling, c, TXT.HEADING.ceiling, TXT.FOOTER.ceiling);
        return { table: r.table };
      }
      fill(scenarioHost, T.scenarioMatrix(scenarioFrames));
      return { table: T.scenariosDownload(scenarioFrames) };
    }

    const fig = F.withinFigure({ tenure }, s);
    fill(withinBody.heading,
         chartHeading(...Object.values(TXT.withinHeading(s.country))));
    window.Plotly.react(withinBody.plot, fig.data, fig.layout, fig.config);
    fill(withinBody.footer, chartFooter(TXT.FOOTER.within));
    /* BOTH regulatory tables, in the one drawer: the scenario matrix (Cuadro
       6) then the dismissal rules (Cuadro 6 bis) for the same country. The
       rules used to render on the page below the chart through their own
       output id, which existed only because an output binds once in the DOM;
       with both in the same place one renderer serves both. */
    fill(within.slots.detail,
      T.scenarioVerticalUi(scenarioFrames, s.country),
      T.rulesBlock({ rules }, s.country));
    return { table: fig.table };
  }

  /* The XLSX is the SCENARIO MATRIX, never the rules -- across it is all
     eleven rows, within it is the selected country's, falling back to the
     whole matrix if that row is missing. */
  const scenarioRows = () => T.scenariosDownload(scenarioFrames);
  const mk = (slots, view) => wireDownloads(
    { csvButton: slots.downloadCsv, tableSlot: slots.downloadTable },
    () => {
      const all = scenarioRows();
      const one = all.filter((r) => r.Country === store.get().country);
      return {
        csv: store.table(),
        xlsx: view === "across" ? all : (one.length ? one : all),
        names: { csv: `Firing_Costs_Data_${today()}.csv`,
                 xlsx: `Firing_Costs_Scenarios_${today()}.xlsx`,
                 sheet: "Dismissal scenarios",
                 xlsxLabel: "Download scenario matrix" },
        note: "Download the dismissal-cost scenario matrix:",
      };
    });
  const refreshAcross = mk(across.slots, "across");
  const refreshWithin = mk(within.slots, "within");
  store.subscribe(() => { refreshAcross(); refreshWithin(); });

  await store.render();
  refreshAcross();
  refreshWithin();
  return { store, el };
}
