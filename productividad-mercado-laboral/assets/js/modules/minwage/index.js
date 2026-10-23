/* ============================================================================
   index.js - the Minimum Wages module
   ============================================================================
   Ports minwage_server (minwage.R:1414), minwage_across_server (:564),
   minwage_within_server (:1116) and tabs/ui/minwage.R.

   NO SELECTION LANDING AND NO "BACK" BAR. The module opens directly on
   "Comparing countries" -- the overview IS the entry point -- and "By country"
   is reached from the two-pill switch. Both views are built once and shown or
   hidden; nothing holding a plotly canvas is ever rebuilt.

   In the Shiny app that last point needed care: both dashboards lived in the
   DOM at once with their visibility set INLINE from isolate(selected_view()),
   because `reenter()` writes "across", which is also the default, so returning
   to the topic while already on across writes the SAME value, reactiveVal
   short-circuits, and the show/hide observer never fires -- making the inline
   style load-bearing. None of that machinery exists here: there is no
   reactiveVal to short-circuit and the switch sets the class directly.

   EVERY CONTROL IS ON THE PAGE: two drawers (Downloads, detail), not three.
   ========================================================================= */

import { h, fill } from "../../ui/dom.js";
import { moduleLayout, gridCell, singlePlotBody, sectionShell } from "../../ui/layout.js";
import { topicTitle, viewSwitch, sectionBar, filterBar, filterCell, pillGroup,
         flagRow, chartHeading, chartFooter } from "../../ui/chrome.js";
import { createStore } from "../../core/store.js";
import { constants, money } from "../../core/format.js";
import { PLOT_CONFIG } from "../../charts/theme.js";
import { wireDownloads, today } from "../../core/download.js";
import * as F from "./figures.js";
import * as T from "./tables.js";
import * as TXT from "./text.js";

const TOPIC = "minwage";

/* The fields a shared link carries, after the topic and the view.
   Anything equal to its default is omitted, so the common URL stays
   `#/minwage`. */
const SHARE_FIELDS = ["section", "period", "unit", "group", "basis",
                      "pctl", "rules", "country"];

export async function mount({ el, db, selection = {}, persist = null }) {
  const K = constants();

  /* Everything this module reads, warmed in one go so that every later render
     is synchronous -- which is what removes the need for Shiny's
     `recalculating` spinner on each filter click. */
  const [level, workday, below, wageDist, dispersion, rateValue, rules] =
    await db.load("mw_level", "mw_workday", "mw_below", "mw_wage_dist",
                  "mw_dispersion", "mw_rate_value", "mw_rules");

  const acrossFrames = { level, workday, below, wageDist };
  const withinFrames = { dispersion, rateValue };
  const rulesRows = T.rulesDisplay({ rules, workday });
  const rateCounts = T.rateCounts(dispersion);

  /* ---- page shell ------------------------------------------------------- */
  const switchEl = h("div");
  const masthead = topicTitle("Minimum wages", null, switchEl);

  const across = moduleLayout({
    topic: TOPIC, view: "across", subtitle: TXT.VIEW_SUBTITLE.across,
    /* The across view has NO detail drawer: the rules table is section 4, on
       the page. In the R app that was forced -- an output id binds only once
       in the DOM, so it is a drawer or a section, never both. */
    detailLabel: null,
  });
  const within = moduleLayout({
    topic: TOPIC, view: "within", subtitle: TXT.VIEW_SUBTITLE.within,
    detailLabel: "Minimum-wage rules",
    hasTopControls: false, hasPlotControls: true,
  });

  el.append(masthead, across.el, within.el);

  /* ---- the across sections --------------------------------------------- */
  const cellLevel = gridCell(K.MW_CELL_H_LEVEL, { id: "minwage-across-plot_level" });
  const cellBelow = gridCell(K.MW_CELL_H_BELOW, { id: "minwage-across-plot_below" });
  const cellBite = gridCell(K.MW_CELL_H_BITE, { id: "minwage-across-plot_bite" });
  const rulesHost = h("div.across-cell.across-cell-full");

  const sections = [
    sectionShell("level", cellLevel.el),
    sectionShell("below", cellBelow.el),
    sectionShell("bite", cellBite.el),
    sectionShell("rules", rulesHost),
  ];
  fill(across.slots.main, sections.map((s) => s.el));

  const withinBody = singlePlotBody(K.MW_WITHIN_H, "minwage-within-plot");
  fill(within.slots.main, withinBody.nodes);

  /* ---- state ------------------------------------------------------------ */
  const store = createStore({
    view: "across",
    /* MINWAGE_SECTIONS[0] is the default. In the R app the first section also
       had to carry an `input.pick_section == null` fallback in its
       conditionalPanel, because the pills set their input with
       Shiny.setInputValue, which does not fire until something is clicked --
       without it the page opened on four hidden sections and a blank screen.
       Reordering the constant changed what the page opened on. Here the
       default is simply stated. */
    section: K.MINWAGE_SECTIONS[0],
    period: "month",
    unit: "index",
    group: K.MINWAGE_BELOW_GROUPS[0],
    basis: "monthly",
    pctl: "all",
    rules: Object.keys(K.MINWAGE_RULES_GROUPS)[0],
    /* MINWAGE_WITHIN_DEFAULT is "Dominican Rep.", NOT
       MINWAGE_WITHIN_COUNTRIES[0] -- that is Argentina, a single-rate country,
       so the view opened on "there is nothing to show". */
    country: K.MINWAGE_WITHIN_DEFAULT,
  }, { onRender: render });

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
    fill(switchEl, viewSwitch(s.view, "Minimum wages view",
                              (view) => store.set({ view })));

    /* Row 1 picks the section, row 2 refines the chart it shows -- the same
       two-row shape as non-salary's category bar. ONE FILTER BAR PER SECTION,
       not one bar with conditional cells: "Rules and definitions" would
       otherwise be an empty strip with a top border under the pills. */
    fill(across.slots.topControls,
      sectionBar(K.MINWAGE_SECTIONS, K.MINWAGE_SECTION_LABELS, s.section,
                 pick("section")),
      s.section === "level" ? filterBar([
        filterCell("Period", pillGroup({ month: "Per month", hour: "Per hour" },
                                       s.period, pick("period"))),
        filterCell("Unit", pillGroup({ index: "Index (LA11 average = 1)",
                                       ppp: "US$ per month at 2017 PPP" },
                                     s.unit, pick("unit"))),
      ]) : null,
      /* Which workers are counted is a CHART CONTROL, not a footnote: Colombia
         moves from 24% to 75% between salaried and self-employed, the largest
         swing on the page. */
      s.section === "below" ? filterBar([
        filterCell("Workers counted",
                   pillGroup(K.MINWAGE_BELOW_GROUPS.map((g) => ({ value: g, label: g })),
                             s.group, pick("group"))),
      ]) : null,
      s.section === "bite" ? filterBar([
        filterCell("Wage basis", pillGroup({ monthly: "Monthly wages",
                                             hourly: "Hourly wages" },
                                           s.basis, pick("basis"))),
        filterCell("Percentile",
                   pillGroup(Object.entries(K.MINWAGE_PCTL_CHOICES)
                               .map(([label, value]) => ({ value, label })),
                             s.pctl, pick("pctl"))),
      ]) : null,
      s.section === "rules" ? filterBar([
        filterCell("Columns shown",
                   pillGroup(Object.keys(K.MINWAGE_RULES_GROUPS)
                               .map((g) => ({ value: g,
                                              label: K.MINWAGE_RULES_GROUP_LABELS[g] })),
                             s.rules, pick("rules"))),
      ]) : null);

    /* The within view's only control. The badge is why it exists: only 5 of
       these 13 countries have any dispersion to show, and without the count
       the other 8 look identical until you click them and land on a "single
       national rate" heading. All 13 stay enabled and visible. */
    fill(within.slots.plotControls, flagRow({
      items: K.MINWAGE_WITHIN_COUNTRIES.map((name) => {
        const n = rateCounts[name] ?? 0;
        return {
          value: name, label: name,
          code: K.MINWAGE_NAME_TO_CODE[name],
          badge: n <= 1 ? "single rate" : `${n} rates`,
          single: n <= 1,
        };
      }),
      active: s.country, onPick: pick("country"),
      flagMap: K.COUNTRY_FLAG_MAP,
      panelClass: "labor-country-panel-counts",
    }));
  }

  /* ---- render ----------------------------------------------------------- */
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

      /* Only the section on screen is drawn. In Shiny the hidden sections'
         plots were SUSPENDED outputs, which is the same economy by a different
         mechanism -- and the R notes warn against blanket-disabling that
         suspension, because the hidden view's plots should stay suspended. */
      if (s.section === "level") {
        const fig = F.levelFigure(acrossFrames, s);
        draw(cellLevel, fig, TXT.HEADING.level, TXT.levelFooter(s.period));
        return { table: fig.table };
      }
      if (s.section === "below") {
        const fig = F.belowFigure(acrossFrames, s);
        draw(cellBelow, fig, TXT.HEADING.below, TXT.FOOTER.below);
        return { table: fig.table };
      }
      if (s.section === "bite") {
        const fig = F.biteFigure(acrossFrames, s);
        draw(cellBite, fig, TXT.biteHeading(wageDist, s.basis), TXT.FOOTER.bite);
        return { table: fig.table };
      }
      /* Section 4: the rules table, on the page. The XLSX download stays THE
         WHOLE MATRIX in every cut -- the groups are a reading aid over one
         table (Cuadro 1), not three datasets, and a column-subset file would
         look like the rules matrix with columns silently missing. */
      fill(rulesHost, T.rulesTable(rulesRows, s.rules));
      return { table: rulesRows };
    }

    /* By country. */
    const rows = F.countryRates(withinFrames, s.country);
    const n = rateCounts[s.country] ?? 0;
    const firstMoney = money(rows[0].value_lcu, rows[0].currency);
    const fig = F.withinFigure(withinFrames, s);
    fill(withinBody.heading,
         chartHeading(...Object.values(TXT.withinHeading(s.country, n, firstMoney))));
    window.Plotly.react(withinBody.plot, fig.data, fig.layout, fig.config);
    fill(withinBody.footer, chartFooter(TXT.withinFooter(rows)));
    fill(within.slots.detail, T.rulesVerticalUi(rulesRows, s.country));
    return { table: fig.table };
  }

  /* ---- downloads -------------------------------------------------------
     The CSV is the plot data for whatever is on screen; the XLSX is the rules
     matrix. Across, the XLSX is THE WHOLE MATRIX in every column cut -- the
     groups are a reading aid over one table (Cuadro 1), not three datasets,
     and a column-subset file would look like the rules matrix with columns
     silently missing. */
  const refreshAcross = wireDownloads(
    { csvButton: across.slots.downloadCsv, tableSlot: across.slots.downloadTable },
    () => ({
      csv: store.table(),
      xlsx: rulesRows,
      names: { csv: `Minimum_Wages_Data_${today()}.csv`,
               xlsx: `Minimum_Wages_Rules_${today()}.xlsx`,
               sheet: "Minimum wage rules",
               xlsxLabel: "Download regulation detail" },
    }));
  const refreshWithin = wireDownloads(
    { csvButton: within.slots.downloadCsv, tableSlot: within.slots.downloadTable },
    () => {
      const pairs = T.rulesVertical(rulesRows, store.get().country);
      return {
        csv: store.table(),
        /* NULL for US4 and Spain, which hides the button: they have no
           Cuadro 1 row, and the fallback used to hand the reader eleven OTHER
           countries' rules under a heading that had just said this country
           has none. */
        xlsx: pairs ? pairs.map(([Field, Value]) => ({ Field, Value })) : null,
        names: { csv: `Minimum_Wages_Data_${today()}.csv`,
                 xlsx: `Minimum_Wages_Rules_${today()}.xlsx`,
                 sheet: store.get().country,
                 xlsxLabel: "Download regulation detail" },
      };
    });
  store.subscribe(() => { refreshAcross(); refreshWithin(); });

  await store.render();
  refreshAcross();
  refreshWithin();

  return { store, el };
}

export { PLOT_CONFIG };
