/* ============================================================================
   chrome.js - the shared topic chrome, ported from tabs/ui/filter_drawer.R
   ============================================================================
   That R file holds all the furniture every module shares, not just the
   drawers: the masthead, the two-pill view switch, the chart heading and
   footer, the toolbar and the two drawers. This is its JS counterpart, plus
   the pill groups and flag rows each module built for itself in nearly
   identical form.

   THE CLASS NAMES ARE THE CONTRACT. labor.css is carried over verbatim and is
   written against this exact markup -- `.labor-country-panel >
   .labor-country-buttons > .labor-country-button` with `.labor-flag`,
   `.labor-country-label` and the `.labor-country-hover` overlay inside. The
   first version of btax_jurisdiction_buttons() in the R app invented
   `.labor-country-flag` and `.labor-country-name`, classes with zero rules in
   the stylesheet, and the row rendered as sixteen unstyled buttons. Do not
   improvise here either.
   ========================================================================= */

import { h, raw } from "./dom.js";

/* Namespaced ids, so the two sub-views of a module stay independent exactly as
   Shiny's ns() made them: "minwage-across-detail_drawer". */
export function nsId(topic, view, id) { return `${topic}-${view}-${id}`; }

/* ---- masthead ----------------------------------------------------------- */

/* filter_drawer.R:58. Two columns: what this topic is on the left, which half
   of it you are in on the right. The switch is INSIDE the card on purpose --
   title, description and switch are one unit. Floating it below made it read
   as a filter over the card rather than as the two halves of one topic.

   The per-view header boxes no longer carry an <h1>: the view titles used to
   be "<Topic>: Comparing countries", i.e. the same thing the switch says one
   line below. The description keeps the view's name as an aria-label so the
   view is still announced. */
export function topicTitle(title, description, switchEl) {
  return h("div.labor-header-box.topic-masthead", null,
    h("div.topic-masthead-main", null,
      h("h1.topic-title.topic-title-main", null, title),
      description ? h("p.topic-subtitle", null, description) : null),
    switchEl ? h("div.topic-masthead-switch", null, switchEl) : null);
}

/* filter_drawer.R:76. Replaced both the old selection landing's flag cards and
   the "← Back to selection" bar. Deliberately NOT uppercased by labor.css's
   pill rule -- `.labor-view-switch-btn` is excluded from that list. */
export function viewSwitch(activeView, ariaLabel, onPick) {
  const btn = (view, label) => h("button.labor-view-switch-btn", {
    type: "button",
    class: activeView === view ? "active" : null,
    role: "tab",
    "aria-selected": activeView === view ? "true" : "false",
    onclick: () => onPick(view),
  }, label);

  return h("div.labor-view-switch", { role: "tablist", "aria-label": ariaLabel },
    btn("across", "Comparing countries"),
    btn("within", "By country"));
}

/* ---- chart heading and footer ------------------------------------------- */

/* filter_drawer.R:132. `provisional` marked a chart still reading mock data;
   no module passes it any more (Minimum Wages and Firing Costs are both fully
   sourced), but it is kept because removing a flag without replacing the data
   is the one thing CLAUDE.md forbids here. */
export function chartHeading(title, description = null, {
  provisional = false,
  provisionalNote = "Placeholder data — this chart is not yet sourced from the report.",
} = {}) {
  return h("div", { style: { marginTop: "6px" } },
    h("h3.section-title", null,
      title,
      provisional ? h("span.chart-provisional-mark", { title: provisionalNote }, "*") : null),
    description
      ? h("p", { style: { fontSize: "0.9375rem", color: "#555", margin: "0 0 8px" } },
          description)
      : null,
    provisional
      ? h("p.chart-provisional-note", null, h("span", null, "*"), provisionalNote)
      : null);
}

/* filter_drawer.R:167. HTML, NEVER a plotly annotation. Inside the SVG the
   footer had to be sized in R against a margin the BROWSER computes -- a
   paper-anchored annotation starts at the plot-area edge, i.e. after
   `automargin` has widened the left margin -- so a note sized against the
   nominal margin overhung the canvas by up to 171px and was clipped mid-word
   on six of the seven minwage charts. As HTML it cannot clip, it wraps with
   CSS rather than a character-count estimate, it is selectable, and the plot
   gets back the 130-290px the reserved bottom margin was eating.

   Nothing is lost by leaving the SVG: every chart sets displayModeBar false,
   so there is no image export for the footer to be missing from. */
export function chartFooter({ note = null, source = null, vintage = null } = {}) {
  const n = note ? String(Array.isArray(note) ? note.join(" ") : note).trim() : "";
  const s = source ? String(Array.isArray(source) ? source.join(" ") : source).trim() : "";
  const v = vintage ? String(vintage).trim() : "";
  if (!n && !s) return null;

  const accessed = `Accessed ${new Date().toISOString().slice(0, 10)}.`;
  const sourceLine = s ? [s, v, accessed].filter(Boolean).join(" ") : null;

  return h("div.chart-footer", null,
    n ? h("p.chart-note", null, h("span.chart-note-label", null, "Note:"), " ", n) : null,
    sourceLine ? h("p.chart-source", null, sourceLine) : null);
}

/* ---- filter pills ------------------------------------------------------- */

/* The label + control pair every filter sits in. The label is the grey block
   `.labor-filter-label`; the group is a flex COLUMN, which is why a
   flex-basis belongs on the cell around it and not here (see the tenure
   slider's note in labor.css). */
export function filterCell(label, ...children) {
  return h("div.labor-filter-group", null,
    label ? h("span.labor-filter-label", null, label) : null,
    ...children);
}

/* A pill group. `choices` is [{value, label}] or a {value: label} object.
   The highlight is SERVER-DRIVEN in the R app and single-sourced here for the
   same reason: minwage, firing and btax deliberately do not emit
   labor_shared_scripts(), because the optimistic client-side jQuery that
   non-salary uses would create a second source of truth for `.active`. */
export function pillGroup(choices, active, onPick, { ariaLabel = null } = {}) {
  const items = Array.isArray(choices)
    ? choices
    : Object.entries(choices).map(([value, label]) => ({ value, label }));

  return h("div.labor-filter-choices", { role: "group", "aria-label": ariaLabel },
    items.map(({ value, label, id = null }) =>
      h("button.pill-button.labor-category-button", {
        type: "button",
        /* `id` reproduces the Shiny actionButton's namespaced id where one
           existed ("labor-across-btn_payer"). dev/measure_charts.R clicks the
           non-salary category and breakdown pills BY ID, and without them its
           labor sweep clicked nothing, warned, and measured the same default
           figure 345 times while reporting 345 passing checks. */
        id,
        class: value === active ? "active" : null,
        "aria-pressed": value === active ? "true" : "false",
        onclick: () => onPick(value),
      }, label)));
}

/* The section pill row: a `"Choose a section"` mini-label over the pills.
   In the R app this is a conditionalPanel mechanism whose first section's
   condition carries `input.pick_section == null` as a load-bearing fallback,
   because Shiny.setInputValue does not fire until something is clicked -- so
   without it the page opened on four hidden sections and a blank screen. Here
   the active section is simply initialised to SECTIONS[0] and that whole class
   of problem does not arise.

   Not rendered at all when there is only one section: "Choose a section" over
   a single pill is a control with nothing to choose. */
export function sectionBar(sections, labels, active, onPick) {
  if (!sections || sections.length <= 1) return null;
  return h("div.labor-category-bar", null,
    h("span.labor-filter-label", null, "Choose a section"),
    pillGroup(sections.map((s) => ({ value: s, label: labels[s] ?? s })),
              active, onPick, { ariaLabel: "Choose a section" }));
}

/* The row of filters belonging to the section on screen. `isLead` drops the
   top border: a separator with nothing above it reads as a stray rule across
   the card, which is what btax hit once its pill row stopped being rendered. */
export function filterBar(cells, { isLead = false } = {}) {
  const kept = cells.filter(Boolean);
  if (!kept.length) return null;
  return h("div.labor-filter-bar", { class: isLead ? "is-lead" : null }, kept);
}

/* ---- country flag row --------------------------------------------------- */

/* The markup labor.css is written against, exactly. The flag has no size of
   its own, the hover overlay is position:absolute/inset:0 and needs the button
   as its positioned parent, and the panel supplies the column gap.

   `badge` is minwage's per-country rate count, which the flag row and the
   chart heading both read from the same function so the row can never promise
   "7 rates" over a heading that says "single rate". */
export function flagRow({ items, active, onPick, flagMap, strong = true,
                          panelClass = null }) {
  const flagSrc = (code) => {
    const cc = flagMap[code] ?? String(code).slice(0, 2).toLowerCase();
    /* w80 (80x60) so flags stay crisp on retina: they render at ~26px wide,
       which is ~52px physical at 2x. */
    return `https://flagcdn.com/w80/${cc}.png`;
  };

  return h("div.labor-country-panel", { class: panelClass },
    h("div.labor-country-buttons", null,
      items.map(({ value, code, label, badge, single }) =>
        h("button.labor-country-button", {
          type: "button",
          class: [
            strong ? "labor-country-strong" : null,
            value === active ? "active" : null,
            single ? "labor-country-single" : null,
          ].filter(Boolean).join(" ") || null,
          title: label,
          "aria-pressed": value === active ? "true" : "false",
          onclick: () => onPick(value),
        },
          h("img.labor-flag", { src: flagSrc(code), alt: "", loading: "lazy" }),
          h("span.labor-country-label", null, label),
          badge ? h("span.labor-country-badge", null, badge) : null,
          h("span.labor-country-hover", { "aria-hidden": "true" }, label)))));
}

/* ---- slider ------------------------------------------------------------- */

/* Replaces shinyWidgets' sliderTextInput. The value is an INDEX into `labels`,
   not a number: the stops are not evenly spaced values ("3-6 months",
   "6-12 months", "1 year", … "30 years"), which is exactly why the R code
   needed sliderTextInput rather than a plain sliderInput.

   Only the first and last tick labels are printed. At 32 stops every label
   would overlap, and the selected value is shown above the track instead --
   which is also why it is not a bubble over the handle, as the widget's was. */
export function textSlider({ labels, value, onPick, label = null, cellClass = null }) {
  const index = Math.max(0, labels.indexOf(value));
  const readout = h("span.rf-slider-value", { "aria-hidden": "true" }, labels[index]);

  const input = h("input.rf-slider-input", {
    type: "range", min: 0, max: labels.length - 1, step: 1, value: index,
    "aria-label": label || "Value",
    /* aria-valuetext is what makes a screen reader say "10 years" rather than
       "14 of 31" -- the index is an implementation detail. */
    "aria-valuetext": labels[index],
    oninput: (e) => {
      const v = labels[Number(e.target.value)];
      readout.textContent = v;
      e.target.setAttribute("aria-valuetext", v);
    },
    onchange: (e) => onPick(labels[Number(e.target.value)]),
  });

  const slider = h("div.rf-slider", null, readout, input,
    h("div.rf-slider-ticks", { "aria-hidden": "true" },
      h("span", null, labels[0]),
      h("span", null, labels[labels.length - 1])));

  return h("div.labor-filter-group", { class: cellClass },
    label ? h("span.labor-filter-label", null, label) : null,
    slider);
}

/* ---- toolbar and drawers ------------------------------------------------ */

/* filter_drawer.R:230. ALL FOUR modules pass include_filters = FALSE -- every
   control is on the page -- so the "☰ Filters" toggle and the left filter
   drawer have no caller and are not ported at all. What remains is Downloads
   (left) and, where the module has one, the detail toggle (right).
   btax has only Downloads. */
export function drawerToolbar(topic, view, detailLabel) {
  const ids = (name) => ({
    "data-drawer-toggle": nsId(topic, view, name),
    "data-drawer-backdrop": nsId(topic, view, `${name.replace("_drawer", "")}_backdrop`),
  });

  return h("div.drawer-toolbar", null,
    h("div.drawer-toolbar-left", null,
      h("button.filter-toggle", {
        type: "button", "aria-expanded": "false", ...ids("download_drawer"),
      },
        h("span.drawer-toggle-icon", { html: "&#8595;" }),
        h("span", null, "Downloads"))),
    detailLabel
      ? h("button.detail-toggle", {
          type: "button", title: detailLabel, "aria-expanded": "false",
          ...ids("detail_drawer"),
        },
          h("span.drawer-toggle-icon", { html: "&#9636;" }),
          h("span.detail-toggle-label", null, detailLabel))
      : h("span"));
}

function drawerShell(drawerId, backdropId, title, drawerClass, closeLabel) {
  const body = h("div.filter-drawer-body");
  const el = h("div", { id: drawerId, class: drawerClass, role: "dialog",
                        "aria-modal": "true", "aria-label": title },
    h("div.filter-drawer-header", null,
      h("span.filter-drawer-title", null, title),
      h("button.filter-drawer-close", {
        type: "button", "aria-label": closeLabel, "data-drawer-close": "",
        html: "&times;",
      })),
    body);
  return {
    nodes: [h("div.filter-backdrop", { id: backdropId, "data-drawer-close": "" }), el],
    body,
  };
}

/* filter_drawer.R:245 */
export function detailDrawer(topic, view, label) {
  return drawerShell(nsId(topic, view, "detail_drawer"),
                     nsId(topic, view, "detail_backdrop"),
                     label, "detail-drawer", "Close details");
}

/* filter_drawer.R:301. Reuses `.filter-drawer` (same side and motion) with
   `.download-drawer` only narrowing it. The ids are unchanged from when this
   block lived inside the filters drawer. */
export function downloadDrawer(topic, view, {
  note = "Download the data behind the current view:",
} = {}) {
  const shell = drawerShell(nsId(topic, view, "download_drawer"),
                            nsId(topic, view, "download_backdrop"),
                            "DOWNLOADS", "filter-drawer download-drawer",
                            "Close downloads");
  const csv = h("button.btn.btn-download", { type: "button" }, "Download Data");
  const tableSlot = h("div");
  shell.body.append(h("p", { style: { marginBottom: "12px" } }, note), csv, tableSlot);
  return { ...shell, csv, tableSlot };
}

export { raw };
