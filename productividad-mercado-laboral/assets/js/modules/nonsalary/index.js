/* ============================================================================
   index.js - the Non-salary labor costs module
   ============================================================================
   Ports labor_server (tabs/server/non_salary.R:66) and the five files sourced
   into non_salary_server_core: init.R, helpers.R, observers.R, plots.R and
   tables.R.

   EVERY FILTER IS ON THE PAGE. There is no Filters drawer in this module: the
   page has the header box and below it one controls card, whose row 1 is the
   five category pills and whose row 2 is everything that REFINES the category
   -- Explore by, Contribution, Bonus component and the minimum-wage slider,
   left to right.

   In Shiny each of those was a separate OUTPUT, and an output id binds only
   once in the DOM, so they had to be MOVED out of the drawer rather than
   duplicated -- mount one twice and Shiny binds the first and silently
   ignores the second. Here they are plain elements and that hazard does not
   exist, but the arrangement is kept because it is the one the CSS and the
   reading order were tuned for.

   "Occupational risk" IS NOT A CATEGORY: the fifth pill sets category
   `social` with subcomponent `occupational_risk`. Five pills, four categories.

   THE COUNTRY DRILL-DOWN IS GONE and is not ported. The "Open a country →"
   flag row under the across chart was removed because the view switch already
   reaches the By-country view in one click, and a second country control that
   selected nothing on the page it sat on while silently changing the other
   view was a third way to do what the switch and the within flag row already
   did. `shared` became an empty channel.
   ========================================================================= */

import { h, fill } from "../../ui/dom.js";
import { moduleLayout, singlePlotBody } from "../../ui/layout.js";
import { topicTitle, viewSwitch, filterBar, filterCell, pillGroup,
         flagRow, chartHeading, chartFooter, textSlider } from "../../ui/chrome.js";
import { createStore } from "../../core/store.js";
import { constants, countryDisplayName, wageLabel } from "../../core/format.js";
import { mainFigure, tenureFigure } from "./figures.js";
import { breakdownsFor } from "./spec.js";
import { normalize, WAGE_LEVELS, ACROSS_FRAMES, WITHIN_FRAMES, TENURE_FRAMES }
  from "./state.js";
import { detailUi, heteroSheet } from "./tables.js";
import { wireDownloads, today } from "../../core/download.js";
import * as TXT from "./text.js";

const TOPIC = "labor";

/* The fields a shared link carries, after the topic and the view.
   Anything equal to its default is omitted, so the common URL stays
   `#/labor`. `wageAcross` and not `wages`: `wages` is derived output. */
const SHARE_FIELDS = ["category", "breakdown", "socialSub",
                      "bonusComponent", "wageAcross", "country"];

/* The five category pills. "Occupational risk" is social + occupational_risk,
   which is why this is a list of PATCHES rather than of category values. */
/* `id` is the Shiny actionButton id each pill replaces -- the chart harness
   clicks these by id. Note "occupational_risk_main": the R id says `_main`
   because the plain `occupational_risk` id belongs to the social subcomponent
   button, and the two are different controls. */
const CATEGORY_PILLS = [
  { id: "all", label: "All non-salary labor costs", patch: { category: "all" } },
  { id: "bonus", label: "Bonuses and benefits",
    patch: { category: "bonuses_and_benefits" } },
  { id: "social", label: "Social security",
    patch: { category: "social", socialSub: "pensions" } },
  { id: "occupational_risk_main", label: "Occupational risk",
    patch: { category: "social", socialSub: "occupational_risk" } },
  { id: "payroll", label: "Payroll taxes", patch: { category: "payroll_taxes" } },
];

const BREAKDOWN_LABELS = { total: "Total", payer: "By payer", component: "By component" };
const BONUS_LABELS = {
  all_bonuses: "All bonuses", ab: "Annual bonuses", pl: "Paid leave",
  up: "Unemployment protection", ob: "Other bonuses",
};

export async function mount({ el, db, selection = {}, persist = null }) {
  const K = constants();

  const frameIds = [...ACROSS_FRAMES, ...WITHIN_FRAMES];
  await db.load(...frameIds);
  const frames = {};
  for (const id of frameIds) frames[id] = db.ready(id);

  /* The regulation partials and the heterogeneity fragments, pre-sliced by the
     build step. Fetched once with the module rather than per render -- the R
     app re-ran the regex surgery on every one. */
  const [partials, hetero] = await Promise.all([
    db.json("nonsalary-partials.json"),
    db.json("nonsalary-hetero.json"),
  ]);

  /* The tenure frames are loaded LAZILY: only the second By-country chart
     reads them, and they are the heaviest files in the corpus. */
  let tenureReady = false;
  const loadTenure = async () => {
    if (tenureReady) return;
    await db.load(...TENURE_FRAMES);
    for (const id of TENURE_FRAMES) frames[id] = db.ready(id);
    tenureReady = true;
  };

  const switchEl = h("div");
  const masthead = topicTitle("Non-salary labor costs", null, switchEl);

  const across = moduleLayout({
    topic: TOPIC, view: "across", subtitle: TXT.VIEW_SUBTITLE.across,
    detailLabel: null,
  });
  const within = moduleLayout({
    topic: TOPIC, view: "within", subtitle: TXT.VIEW_SUBTITLE.within,
    detailLabel: "Regulation details", hasPlotControls: true,
  });
  el.append(masthead, across.el, within.el);

  const acrossBody = singlePlotBody(K.LABOR_PLOT_HEIGHT, "labor-across-plot");
  fill(across.slots.main, acrossBody.nodes);

  /* The By-country view has TWO charts: the wage one and, always visible below
     it, the tenure one. */
  const withinBody = singlePlotBody(K.LABOR_PLOT_HEIGHT, "labor-within-plot");
  const tenureBody = singlePlotBody(K.LABOR_TENURE_HEIGHT, "labor-within-plot_tenure");
  /* Sits between the tenure heading and its canvas, and carries the sentence
     when the canvas collapses. */
  const tenureNotice = h("div");
  fill(within.slots.main, withinBody.nodes,
       tenureBody.heading, tenureNotice,
       tenureBody.nodes.slice(1));

  const store = createStore({ view: "across" }, { onRender: render, normalize });

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

  const patch = (p) => store.set(p);

  function renderControls(s) {
    fill(switchEl, viewSwitch(s.view, "Non-salary labor costs view",
                              (view) => patch({ view })));

    const activeCategory = CATEGORY_PILLS.findIndex(
      (c) => c.patch.category === s.category
        && (c.patch.socialSub ?? s.socialSub) === s.socialSub);

    const target = s.view === "across" ? across : within;

    /* Row 1: the five category pills. Row 2: everything that refines them.
       A cell whose filter does not apply returns null and the row collapses,
       which is what `.labor-filter-cell:empty { display: none }` did for the
       Shiny outputs. */
    fill(target.slots.topControls,
      h("div.labor-category-bar", null,
        pillGroup(CATEGORY_PILLS.map((c, i) => ({
                    value: String(i), label: c.label,
                    id: `${TOPIC}-${s.view}-${c.id}`,
                  })),
                  String(activeCategory),
                  (i) => patch(CATEGORY_PILLS[Number(i)].patch),
                  { ariaLabel: "Cost category" })),
      filterBar([
        filterCell("Explore by",
          pillGroup(breakdownsFor(s.category, s.view, s.socialSub)
                      .map((b) => ({ value: b, label: BREAKDOWN_LABELS[b],
                                     id: `${TOPIC}-${s.view}-btn_${b}` })),
                    s.breakdown, (breakdown) => patch({ breakdown }))),
        /* Only under SOCIAL, and not for occupational risk -- which is itself
           one of the three subcomponents, so offering it here would be a
           control that contradicts the pill above. */
        s.category === "social" && s.socialSub !== "occupational_risk"
          ? filterCell("Contribution",
              pillGroup({ pensions: "Pensions", health: "Health" },
                        s.socialSub, (socialSub) => patch({ socialSub })))
          : null,
        /* Only under BONUSES + BY COMPONENT. */
        s.category === "bonuses_and_benefits" && s.breakdown === "component"
          ? filterCell("Bonus component",
              pillGroup(Object.entries(BONUS_LABELS)
                          .map(([value, label]) => ({
                            value, label, id: `${TOPIC}-${s.view}-${value}`,
                          })),
                        s.bonusComponent,
                        (bonusComponent) => patch({ bonusComponent })))
          : null,
        /* Across picks ONE level; within picks a SPAN. Two different controls
           for the same dimension, as in the R app -- a single-handle slider
           and a two-handle one. */
        filterCell("Minimum wage",
          s.view === "across"
            ? textSlider({
                labels: WAGE_LEVELS.map((w) => wageLabel(w)),
                value: wageLabel(s.wages[0]),
                onPick: (label) => patch({
                  wageAcross: WAGE_LEVELS[
                    WAGE_LEVELS.map((w) => wageLabel(w)).indexOf(label)],
                }),
                label: null,
              })
            : rangeControl(s)),
      ]));

    if (s.view === "within") {
      /* The flag row is built from the INTERSECTION of the two views' country
         sets: they come from different data files, so a flag must never lead
         to an empty chart. */
      const countries = K.COUNTRIES_LIST_WITHIN_NO_TENURE
        .filter((c) => c !== "All" && K.COUNTRIES_LIST.includes(c));
      fill(within.slots.plotControls, flagRow({
        items: countries.map((code) => ({
          value: code, code, label: countryDisplayName(code),
        })),
        active: s.country, onPick: (country) => patch({ country }),
        flagMap: K.COUNTRY_FLAG_MAP,
      }));
    }
  }

  /* The within view's wage span. Two overlaid range inputs would be the
     faithful two-handle control; five levels is few enough that a pair of
     "from"/"to" pickers is clearer and keyboard-reachable, and it cannot be
     dragged into an inverted range. */
  function rangeControl(s) {
    const labels = WAGE_LEVELS.map((w) => wageLabel(w));
    const lo = WAGE_LEVELS.indexOf(s.wages[0]);
    const hi = WAGE_LEVELS.indexOf(s.wages[s.wages.length - 1]);
    const span = (a, b) => WAGE_LEVELS.slice(Math.min(a, b), Math.max(a, b) + 1);
    const pick = (which) => (label) => {
      const i = labels.indexOf(label);
      patch({ wagesWithin: which === "lo" ? span(i, hi) : span(lo, i) });
    };
    return h("div.labor-filter-choices", null,
      h("span", { style: { fontSize: "0.875rem", color: "#777" } }, "From"),
      pillGroup(labels.map((l) => ({ value: l, label: l })), labels[lo], pick("lo")),
      h("span", { style: { fontSize: "0.875rem", color: "#777" } }, "to"),
      pillGroup(labels.map((l) => ({ value: l, label: l })), labels[hi], pick("hi")));
  }

  async function render(s) {
    renderControls(s);
    const isAcross = s.view === "across";
    across.el.hidden = !isAcross;
    within.el.hidden = isAcross;

    const body = isAcross ? acrossBody : withinBody;
    const fig = mainFigure(s, frames);
    fill(body.heading, chartHeading(
      isAcross ? "Non-salary labor costs across countries"
               : `Non-salary labor costs — ${countryDisplayName(s.country)}`));
    window.Plotly.react(body.plot, fig.data, fig.layout, fig.config);
    fill(body.footer, chartFooter({ note: TXT.footerNote(s, "main"),
                                    source: TXT.SOURCE }));

    if (!isAcross) {
      await loadTenure();
      const t = tenureFigure(s, frames);
      fill(tenureBody.heading, chartHeading(
        "Total non-salary cost by job tenure",
        "Minimum and maximum, over the worker's years of service."));
      /* THE BLOCK COLLAPSES when there is nothing to plot, rather than drawing
         an empty 440px canvas with one sentence centred in it -- which is what
         the four countries whose costs do not vary with tenure (Brazil, Chile,
         Colombia, Peru) got. The sentence is the point, so it is rendered as
         text under the heading and the canvas is hidden; the plotly div stays
         in the DOM and binds once, as the btax collapsing canvas does. */
      const collapsed = Boolean(t.notice);
      tenureBody.plot.parentElement.hidden = collapsed;
      tenureBody.footer.hidden = collapsed;
      if (collapsed) {
        fill(tenureNotice, h("p.labor-tenure-notice", null, t.notice));
      } else {
        fill(tenureNotice);
        window.Plotly.react(tenureBody.plot, t.data, t.layout, t.config);
        fill(tenureBody.footer, chartFooter({ note: TXT.footerNote(s, "tenure"),
                                              source: TXT.SOURCE }));
      }
      fill(within.slots.detail, detailUi(s, { partials, hetero }) ?? h("div"));
    }

    return { table: fig.table };
  }

  /* The XLSX is the heterogeneity sheet for (category, country), which the
     build step pre-read out of the two workbooks -- so no spreadsheet reader
     is needed at run time. It exists in the By-country view only. */
  const heteroXlsx = await db.json("nonsalary-hetero-xlsx.json");
  const mk = (slots) => wireDownloads(
    { csvButton: slots.downloadCsv, tableSlot: slots.downloadTable },
    () => {
      const sheet = heteroSheet(store.get(), heteroXlsx);
      return {
        csv: store.table(),
        xlsx: sheet
          ? sheet.rows.map((r) => Object.fromEntries(
              sheet.cols.map((c, i) => [c, r[i] ?? ""])))
          : null,
        names: { csv: `Regulatory_Frameworks_Data_${today()}.csv`,
                 xlsx: `Regulatory_Frameworks_Legislation_${today()}.xlsx`,
                 sheet: sheet?.sheet ?? "Legislation",
                 xlsxLabel: "Download regulation detail" },
      };
    });
  const refreshAcross = mk(across.slots);
  const refreshWithin = mk(within.slots);
  store.subscribe(() => { refreshAcross(); refreshWithin(); });

  await store.render();
  refreshAcross();
  refreshWithin();
  return { store, el };
}
