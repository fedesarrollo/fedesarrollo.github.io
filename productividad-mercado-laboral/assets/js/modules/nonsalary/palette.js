/* ============================================================================
   palette.js - which colour a series takes
   ============================================================================
   The palettes themselves come from site/data/constants.json, evaluated out of
   global_aux/constants.R by the build step, so there is one definition of each.
   This file is only the RESOLUTION: given a spec and a state, which named map
   does the chart use.

   THE STACK ORDER IS NOT THE PALETTE'S KEY ORDER. COMPONENT_STACK_ORDER puts
   Bonuses and Benefits first and Pensions second, while COMPONENT_PALETTE is
   keyed the other way round -- so the segment order has to come from the stack
   constant, which is exactly what the captured 65-trace figure shows.

   Every label is title-cased through format.titleCase() before it becomes a
   trace name, because the payroll-tax component names come out of the data in
   Spanish and Portuguese ("Asignaciones Familiares (ANSES)") and English-only
   title casing capitalises their function words.
   ========================================================================= */

import { constants, titleCase } from "../../core/format.js";

/* helpers.R:1026. Social and occupational risk paint Min and Max the SAME
   colour -- the component's own -- rather than the light/dark scenario pair.
   Within one contribution there is no Min-vs-Max story for colour to tell,
   and using the component's colour is what links this chart to the stacked
   ones where that component is a segment. */
export function socialColors(socialSub) {
  const K = constants();
  const label = { pensions: "Pensions", health: "Health",
                  occupational_risk: "Occupational Risk" }[socialSub] ?? "Social";
  const base = K.COMPONENT_PALETTE[label] ?? K.FED_INK;
  return { Min: base, Max: base };
}

/* The single-bonus-component case: both scenarios take that component's
   colour out of BONUS_PALETTE. */
export function bonusComponentColors(bonusComponent) {
  const K = constants();
  const label = {
    ab: "Annual and Other Periodic Bonuses",
    pl: "Paid Leave",
    up: "Unemployment Protection",
    ob: "Other Bonuses",
  }[bonusComponent];
  const base = K.BONUS_PALETTE[label] ?? K.FED_INK;
  return { Min: base, Max: base };
}

/* Title-case the KEYS of a palette, so a lookup by trace name works after the
   labels have been cased. format_legend_named_values (formatters.R:124). */
function casedKeys(map) {
  const out = {};
  for (const [k, v] of Object.entries(map)) out[titleCase(k)] = v;
  return out;
}

/* `spec.palette` -> {seriesName: colour}, plus the order the series stack in. */
export function resolvePalette(spec, state) {
  const K = constants();
  switch (spec.palette) {
    case "SCENARIO":
      return { colors: K.LABOR_SCENARIO_COLORS, order: ["Min", "Max"] };
    case "SOCIAL":
      return { colors: socialColors(state.socialSub), order: ["Min", "Max"] };
    case "BONUS_COMPONENT":
      return { colors: bonusComponentColors(state.bonusComponent),
               order: ["Min", "Max"] };
    case "PAYER":
      return { colors: casedKeys(K.LABOR_PAYER_COLORS),
               /* Employee first: plots.R:1144 passes
                  legend_levels(c("Employee", "Employer")). */
               order: ["Employee", "Employer"].map(titleCase) };
    case "COMPONENT":
      return { colors: casedKeys(K.COMPONENT_PALETTE),
               order: K.COMPONENT_STACK_ORDER.map(titleCase) };
    case "BONUS":
      return { colors: casedKeys(K.BONUS_PALETTE),
               order: K.BONUS_STACK_ORDER.map(titleCase) };
    case "OVERFLOW":
      /* The within view's payroll-tax breakdown: one trace per NAMED tax, so
         the series are data rather than a fixed set, and the palette is a
         nine-colour cycle. It TRUNCATES past nine in the R code -- a country
         with more named taxes than that would lose the extras, which no
         country currently has. */
      return { colors: null, order: null, ramp: K.LABOR_OVERFLOW_PALETTE };
    default:
      throw new Error(`resolvePalette: unknown palette "${spec.palette}"`);
  }
}
