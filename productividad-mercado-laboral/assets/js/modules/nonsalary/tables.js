/* ============================================================================
   tables.js - the By-country regulation detail
   ============================================================================
   Ports output$tabla_detalle (tables.R:7) -- the live half of it. Everything
   below the unconditional `return(NULL)` at tables.R:188 (the cross-country
   reactable, its Country filter, the rowspan merge and the nine `TL *` Excel
   sheets that fed them) is unreachable and is not ported.

   WHAT RENDERS: in the By-country view only, for one country, two blocks --
   the heterogeneity fragment for the selection's category, and below it the
   regulation detail for the selection's own table. Both are HTML fragments
   that the build step has already sliced out of the pre-rendered partials, so
   there is no regex surgery left to do at render time.

   The across view shows nothing here: its `return(NULL)` is reached before
   any of this, which is why that view passes no detail label.
   ========================================================================= */

import { h, raw } from "../../ui/dom.js";
import { countryDisplayName } from "../../core/format.js";

/* helpers.R:611. The heterogeneity partials are keyed by these category
   labels, not by the state's category codes. */
export function heteroCategory({ category, socialSub }) {
  if (category === "all") return "All";
  if (category === "bonuses_and_benefits") return "Bonuses";
  if (category === "payroll_taxes") return "Payroll Taxes";
  if (category === "social") {
    return { pensions: "Pension", health: "Health",
             occupational_risk: "Oc Risk" }[socialSub] ?? null;
  }
  return null;
}

/* helpers.R:576. Which regulation table the selection asks for -- and `null`
   when the selection asks for none, which is most of them. */
export function regulationSheet({ category, breakdown, bonusComponent, socialSub }) {
  const show = breakdown === "component"
    || category === "social" || category === "payroll_taxes";
  if (!show) return null;
  if (category === "bonuses_and_benefits") {
    return { all_bonuses: "TL All B", ab: "TL ab", pl: "TL pl",
             up: "TL up", ob: "TL ob" }[bonusComponent] ?? null;
  }
  if (category === "payroll_taxes") return "TL Pt";
  if (category === "social") {
    return { health: "TL H", pensions: "TL All P",
             occupational_risk: "TL Or" }[socialSub] ?? null;
  }
  return null;
}

/* `partials` and `hetero` are the two JSONs the build step writes, keyed
   {sheet or category: {ISO3: fragmentHtml}}. The fragments already carry the
   flag-decorated country title and the "United States" -> "US4" rewrite. */
export function detailUi(state, { partials, hetero }) {
  if (state.view !== "within") return null;
  const code = state.country;
  if (!code || code === "All") return null;

  const blocks = [];

  const category = heteroCategory(state);
  const heteroHtml = category ? hetero?.[category]?.[code] : null;
  if (heteroHtml) {
    blocks.push(
      h("div.section-title", null,
        "Non-salary costs that vary and sources of variation"),
      h("div.labor-reg-partial-container", { html: heteroHtml }));
  }

  /* Shown under the same conditions the cross view used -- a component
     breakdown, or the social / payroll-taxes categories -- and never for the
     "all categories" default, where there is no single table to show. */
  const sheet = regulationSheet(state);
  const skip = state.category === "all" && state.breakdown !== "component";
  const regHtml = sheet && !skip ? partials?.[sheet]?.[code] : null;
  if (regHtml) {
    blocks.push(
      h("div.section-title", null, "Regulation detail"),
      raw(regHtml, "div.labor-reg-partial-container"));
  }

  if (!blocks.length) {
    return h("p", { style: { fontSize: "0.9375rem", color: "#555" } },
      `No regulation detail for this selection in ${countryDisplayName(code)}.`);
  }
  return h("div", null, blocks);
}

/* The XLSX the download serves: the heterogeneity sheet for (category,
   country), pre-read by the build step. */
export function heteroSheet(state, heteroXlsx) {
  const category = heteroCategory(state);
  if (!category || state.view !== "within") return null;
  return heteroXlsx?.[`${category}|${state.country}`] ?? null;
}
