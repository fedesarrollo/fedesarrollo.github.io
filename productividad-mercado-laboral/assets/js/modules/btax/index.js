/* ============================================================================
   index.js - the Business Taxes module
   ============================================================================
   Ports btax_server (btax.R:831), btax_across_server (:356),
   btax_within_server (:545) and tabs/ui/btax.R.

   SIXTEEN JURISDICTIONS, AND THE FOUR US STATES STAY APART. This module does
   not use US4: interstate variation is what the chapter is about, and Texas
   does not tax profit at all. BTAX_FLAG_MAP extends COUNTRY_FLAG_MAP with
   us-ca / us-tx / us-fl / us-ny, which flagcdn serves as subdivisions.
   BTAX_WITHIN_CODES excludes US-FED: the federal layer is a component of the
   four state rates, not a place with its own regimes, and it has no row in any
   sheet but CIT. The flag row's value is the CODE, not the name -- "US -
   California" is not a country name and every btax frame is keyed by code.

   ALONE AMONG THE FOUR MODULES IT HAS ONE DRAWER: Downloads. Both views pass
   no detail label, because the rules became a By-country SECTION.

   IT IS ALSO THE ONLY MODULE WITH A SECTIONED BY-COUNTRY VIEW, and the only
   one whose canvas has to COLLAPSE: twelve of the sixteen jurisdictions have
   no bracket schedule. In Shiny that was a conditionalPanel on an output flag
   needing suspendWhenHidden = FALSE (or the flag was never computed and the
   panel never opened), deliberately NOT a uiOutput that rebuilds the plot.
   Here the canvas is simply shown or hidden; the heading renders either way
   and says what is there instead of a chart.
   ========================================================================= */

import { h, fill } from "../../ui/dom.js";
import { moduleLayout, gridCell, sectionShell } from "../../ui/layout.js";
import { topicTitle, viewSwitch, sectionBar, filterBar, filterCell, pillGroup,
         flagRow, chartHeading, chartFooter } from "../../ui/chrome.js";
import { createStore } from "../../core/store.js";
import { constants } from "../../core/format.js";
import { wireDownloads, today } from "../../core/download.js";
import * as F from "./figures.js";
import * as T from "./tables.js";
import * as TXT from "./text.js";

const TOPIC = "btax";

/* The fields a shared link carries, after the topic and the view.
   Anything equal to its default is omitted, so the common URL stays
   `#/btax`. */
const SHARE_FIELDS = ["scope", "section", "code"];

export async function mount({ el, db, selection = {}, persist = null }) {
  const K = constants();
  const [citRate, citMatrix, regimes, rateSchedule] =
    await db.load("bt_cit_rate", "bt_cit_matrix", "bt_regimes", "bt_rate_schedule");

  const rateFrames = { citRate };
  const schedFrames = { rateSchedule };

  const switchEl = h("div");
  const masthead = topicTitle("Business taxes", null, switchEl);

  const across = moduleLayout({
    topic: TOPIC, view: "across", subtitle: TXT.VIEW_SUBTITLE.across,
    detailLabel: null,
  });
  const within = moduleLayout({
    topic: TOPIC, view: "within", subtitle: TXT.VIEW_SUBTITLE.within,
    detailLabel: null, hasPlotControls: true,
  });
  el.append(masthead, across.el, within.el);

  /* ---- across: one section, so no pill row is rendered ------------------ */
  const cellRate = gridCell(K.BT_CELL_H_RATE, { id: "btax-across-plot_rate" });
  const sectionsAcross = [sectionShell("rate", cellRate.el)];
  fill(across.slots.main, sectionsAcross.map((s) => s.el));

  /* ---- within: two sections -------------------------------------------- */
  /* No default heading+plot branch, unlike the other modules: this canvas has
     to be able to collapse, which a fixed branch cannot express. */
  const schedHeading = h("div");
  const schedPlot = h("div", { id: "btax-within-plot",
                             style: { height: `${K.BT_WITHIN_H}px` } });
  const schedFooter = h("div");
  const schedCanvas = h("div.plot-spinner.plot-scroll", null, schedPlot);
  const scheduleCell = h("div.across-cell.across-cell-full", null,
                         schedHeading, schedCanvas, schedFooter);
  /* The text section carries a READING MEASURE (1200px). It is prose: at
     1600px its value column runs ~150 characters per line. Charts and data
     tables stay uncapped. */
  const rulesHost = h("div.across-cell.across-cell-full.btax-text-section");

  const sectionsWithin = [
    sectionShell("schedule", scheduleCell),
    sectionShell("rules", rulesHost),
  ];
  fill(within.slots.main, sectionsWithin.map((s) => s.el));

  /* ---- state ------------------------------------------------------------ */
  const store = createStore({
    view: "across",
    scope: "all",                              /* all | lac */
    section: K.BTAX_WITHIN_SECTIONS[0],
    code: K.BTAX_WITHIN_DEFAULT,
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
    fill(switchEl, viewSwitch(s.view, "Business taxes view",
                              (view) => store.set({ view })));

    /* BTAX_SECTIONS is down to one entry, so sectionBar() returns null and no
       pill row is mounted -- "Choose a section" over a single pill is a
       control with nothing to choose. The filter bar then becomes the LEAD row
       and drops its top border: a separator with nothing above it reads as a
       stray rule across the card. */
    const acrossSections = sectionBar(K.BTAX_SECTIONS, K.BTAX_SECTION_LABELS,
                                      "rate", () => {});
    fill(across.slots.topControls,
      acrossSections,
      filterBar([
        filterCell("Jurisdictions",
                   pillGroup(Object.entries(K.BTAX_RATE_SCOPES)
                               .map(([value, label]) => ({ value, label })),
                             s.scope, pick("scope"))),
      ], { isLead: acrossSections === null }));

    /* The within view IS sectioned, and its flag row drives both sections. */
    fill(within.slots.topControls,
      /* Its OWN label vector: the two section lists do not share one, and
         using the across labels here renders the raw section ids. */
      sectionBar(K.BTAX_WITHIN_SECTIONS, K.BTAX_WITHIN_SECTION_LABELS, s.section,
                 pick("section")));

    fill(within.slots.plotControls, flagRow({
      /* The label is the CODE (US-CA); the title and hover overlay carry the
         full name. */
      items: K.BTAX_WITHIN_CODES.map((code) => ({
        value: code, code, label: code,
      })),
      active: s.code, onPick: pick("code"),
      flagMap: K.BTAX_FLAG_MAP,
    }));
    /* The flag row's visible caption is the code, but the accessible name and
       the hover should be the jurisdiction. Patch them after the row is built
       rather than complicating the shared helper for one module. */
    for (const btn of within.slots.plotControls.querySelectorAll(".labor-country-button")) {
      const code = btn.querySelector(".labor-country-label")?.textContent;
      const name = K.BTAX_CODE_TO_NAME[code];
      if (!name) continue;
      btn.title = name;
      const hover = btn.querySelector(".labor-country-hover");
      if (hover) hover.textContent = name;
    }
  }

  async function render(s) {
    renderControls(s);
    const isAcross = s.view === "across";
    across.el.hidden = !isAcross;
    within.el.hidden = isAcross;

    if (isAcross) {
      const fig = F.rateFigure(rateFrames, s);
      fill(cellRate.heading, chartHeading(...Object.values(TXT.rateHeading(s.scope))));
      window.Plotly.react(cellRate.plot, fig.data, fig.layout, fig.config);
      fill(cellRate.footer, chartFooter(TXT.FOOTER.rate));
      /* The WHOLE CIT matrix stays downloadable here even though nothing
         renders it on this page. In Shiny it had to be set in an observe()
         rather than inside a renderUI for exactly that reason -- a download
         that waits on an output nothing runs is a button that never appears. */
      return { table: fig.table, tableAlt: T.citDownload(citMatrix) };
    }

    for (const sec of sectionsWithin) sec.show(sec.id === s.section);

    if (s.section === "schedule") {
      const fig = F.scheduleFigure(schedFrames, s);
      const rows = F.scheduleData(schedFrames, s.code);
      fill(schedHeading, chartHeading(
        ...Object.values(TXT.scheduleHeading(s.code, rows))));
      /* THE CANVAS COLLAPSES when there is no schedule -- twelve of sixteen.
         Hidden, not removed: the plotly div binds once and is only shown or
         hidden, and the heading above already says what is there instead. */
      schedCanvas.hidden = !fig;
      schedFooter.hidden = !fig;
      if (fig) {
        window.Plotly.react(schedPlot, fig.data, fig.layout, fig.config);
        fill(schedFooter, chartFooter(TXT.scheduleFooter(s.code, rows, fig.flat)));
      }
      return { table: rows };
    }

    /* Section 2: the CIT row then the jurisdiction's regimes. The two are NOT
       duplicates -- checked, not assumed: they come from different sheets
       (CIT vs Simplified Regime / Other Special Regimes) and none of the 104
       regime names appears anywhere in the CIT matrix text. */
    fill(rulesHost,
      T.citVerticalUi(citMatrix, s.code),
      T.regimesBlock(regimes, s.code));
    return { table: T.citDownload(citMatrix).filter((r) => r.Country
      === (K.BTAX_CODE_TO_NAME[s.code] ?? s.code)) };
  }

  /* The whole 17 x 11 CIT matrix stays downloadable from the across drawer
     even though nothing renders it on that page any more -- that is the one
     thing the By-country vertical layout cannot give: a cross-country file.
     In Shiny it had to be set in an observe() rather than inside a renderUI
     for exactly this reason: a download that waits on an output nothing runs
     is a button that never appears. */
  const refreshAcross = wireDownloads(
    { csvButton: across.slots.downloadCsv, tableSlot: across.slots.downloadTable },
    () => ({
      csv: store.table(),
      xlsx: T.citDownload(citMatrix),
      names: { csv: `Business_Taxes_Data_${today()}.csv`,
               xlsx: `Business_Taxes_CIT_${today()}.xlsx`,
               sheet: "Corporate income tax",
               xlsxLabel: "Download regulation detail" },
    }));
  const refreshWithin = wireDownloads(
    { csvButton: within.slots.downloadCsv, tableSlot: within.slots.downloadTable },
    () => {
      const code = store.get().code;
      const name = K.BTAX_CODE_TO_NAME[code] ?? code;
      return {
        csv: store.table(),
        xlsx: T.citDownload(citMatrix).filter((r) => r.Country === name),
        names: { csv: `Business_Taxes_Data_${today()}.csv`,
                 xlsx: `Business_Taxes_CIT_${today()}.xlsx`,
                 sheet: code, xlsxLabel: "Download regulation detail" },
      };
    });
  store.subscribe(() => { refreshAcross(); refreshWithin(); });

  await store.render();
  refreshAcross();
  refreshWithin();
  return { store, el };
}
