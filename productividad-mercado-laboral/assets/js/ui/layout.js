/* ============================================================================
   layout.js - the page shape every module shares
   ============================================================================
   Port of minwage_layout_ui (tabs/ui/minwage.R:43), which firing_layout_ui and
   btax_layout_ui reproduce almost exactly. One helper, three callers.

   PAGE ORDER IS CONTROLS -> DOWNLOADS -> CHARTS, and that is deliberate: the
   controls decide what the page shows, so they lead; the Downloads button acts
   on whatever they selected, so it sits under them. It is why the within view's
   flag row is in this flow too rather than up with the chart -- it is a filter,
   not chart furniture.

   THE VIEW'S DESCRIPTION IS THE FIRST THING INSIDE THE CONTROLS CARD, not a
   white box of its own between the switch and the controls: it describes
   exactly what those controls act on, and as a separate card it split one idea
   in two. A view with no controls card gets a card made for the description
   alone, so the page still says what it is showing.

   TWO DRAWERS, NOT THREE. Every module renders every control on the page, so
   none has a Filters drawer or a `☰ Filters` toggle -- which is what left
   filter_drawer_ui() and filter_toggle_ui() in the R code without a caller.
   btax is down to ONE drawer: it passes no detail label in either view.

   `.topic-page` has no CSS rule but is NOT dead in the R app --
   labor_shared_scripts() scopes its jQuery with '.topic-page ...'. The static
   site has no such script, but the class is kept so the two trees stay
   comparable while the port is verified.
   ========================================================================= */

import { h } from "./dom.js";
import { drawerToolbar, detailDrawer, downloadDrawer } from "./chrome.js";

/* Returns { el, slots } where `slots` are the regions a module fills.
   The module keeps the slot elements and re-fills them on every state change,
   so nothing that holds a plotly canvas is ever rebuilt -- the R notes warn
   repeatedly that rebuilding a container holding a plotlyOutput is only safe
   for actionButtons, and a plotly div that is replaced loses its state. */
export function moduleLayout({
  topic, view, subtitle, detailLabel = null,
  hasTopControls = true, hasPlotControls = false,
}) {
  const downloads = downloadDrawer(topic, view);
  const detail = detailLabel ? detailDrawer(topic, view, detailLabel) : null;

  const topControls = h("div");      /* section pills + the active filters */
  const plotControls = h("div");     /* the within view's flag row */
  const main = h("div");             /* the charts, or one heading + plot */

  const card = (hasTopControls || subtitle)
    ? h("div.labor-top-controls", null,
        subtitle ? h("p.topic-subtitle.labor-view-desc", null, subtitle) : null,
        hasTopControls ? topControls : null)
    : null;

  /* `data-view` is how anything outside the module scopes a query to ONE of
     the two dashboards. Both are in the DOM at once and the inactive one is
     hidden on this root element, so a `:not([hidden])` selector on a
     DESCENDANT still matches inside the hidden view -- which is exactly how
     the first run of dev/smoke_modules.R came to read the across view's
     heading while testing the By-country one. */
  const el = h("div", { "data-view": view },
    downloads.nodes,
    detail ? detail.nodes : null,
    h("div.topic-page", null,
      card,
      hasPlotControls ? h("div.labor-plot-controls", null, plotControls) : null,
      drawerToolbar(topic, view, detailLabel),
      h("div.right-panel.main-content-full", null, main)));

  return {
    el,
    slots: { topControls, plotControls, main,
             detail: detail ? detail.body : null,
             downloadCsv: downloads.csv, downloadTable: downloads.tableSlot },
  };
}

/* The default single-chart body: heading, canvas, footer. minwage's within
   view and firing's both use it; btax deliberately has no such branch because
   its By-country canvas has to be able to COLLAPSE when a jurisdiction has no
   schedule, which a fixed branch cannot express. */
/* `id` reproduces the Shiny namespaced id of the plotlyOutput it replaces
   ("minwage-within-plot"). dev/measure_charts.R probes by exactly those ids,
   so keeping them lets ~500 lines of that harness -- the probe and all six
   legibility assertions -- run against this site unchanged. */
export function singlePlotBody(canvasHeight, id = null) {
  const heading = h("div");
  const plot = h("div", { id, style: { height: `${canvasHeight}px` } });
  const footer = h("div");
  return {
    nodes: [heading, h("div.plot-spinner.plot-scroll", null, plot), footer],
    heading, plot, footer,
  };
}

/* One cell of the across grid: heading, a fixed-height canvas, footer.
   `across-cell-full` is the full-width variant; the half-width pair (firing's
   dumbbell + ceiling) omits it. */
export function gridCell(canvasHeight, { full = true, id = null } = {}) {
  const heading = h("div");
  const plot = h("div", { id, style: { height: `${canvasHeight}px` } });
  const footer = h("div");
  const el = h("div.across-cell", { class: full ? "across-cell-full" : null },
    heading, h("div.plot-spinner.plot-scroll", null, plot), footer);
  return { el, heading, plot, footer };
}

/* A section of the across view. In the R app this is a conditionalPanel whose
   first section's condition carries `input.pick_section == null` as a
   load-bearing fallback -- the pills use Shiny.setInputValue, which does not
   fire until a click, so without it the page opened on hidden sections and a
   blank screen. Here the active section is initialised to SECTIONS[0] and that
   whole class of problem does not exist.

   Sections are SHOWN AND HIDDEN, never rebuilt, for the plotly reason above. */
export function sectionShell(id, ...children) {
  const el = h("div.across-grid", { "data-section": id }, ...children);
  return { id, el, show: (on) => { el.hidden = !on; } };
}
