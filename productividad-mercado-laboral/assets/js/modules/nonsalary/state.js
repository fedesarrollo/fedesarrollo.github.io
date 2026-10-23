/* ============================================================================
   state.js - the non-salary selection, normalised
   ============================================================================
   Ports the eight reactiveVals of init.R:142-155 and the coercion the
   observers do around them.

   NORMALISING BEFORE RESOLVING IS WHAT KEEPS THE SPEC TABLE SMALL. Several of
   plots.R's branches exist only to handle a state that cannot really occur --
   a breakdown the category does not offer, a wage range in the across view,
   an unset country in the within one. Fixing those up here means the rule
   table in spec.js describes figures rather than defending against states.
   ========================================================================= */

import { wageLabel } from "../../core/format.js";
import { breakdownsFor } from "./spec.js";

/* WAGE_LEVELS from constants.R. Kept literal here rather than read from
   constants.json because normalize() runs before the constants are needed
   anywhere else and this is the one place that needs them. */
export const WAGE_LEVELS = ["1sm", "2sm", "5sm", "10sm", "15sm"];

/* The frames each view reads. The across view takes the cross frames, the
   within view the wage_variation ones, and the tenure chart five of the
   wage_tenure_variation TOTAL frames -- the by-payer and by-component tenure
   files are unreachable and are not exported. */
export const ACROSS_FRAMES = [
  "non_salary", "non_salary_payer", "non_salary_component",
  "bonuses_all", "bonuses_component",
  "pensions_all", "pensions_payer", "health_all", "health_payer",
  "occupational_risk_all", "payroll_taxes_all", "payroll_taxes_payer",
];
export const WITHIN_FRAMES = [
  "w_non_salary", "w_non_salary_payer", "w_non_salary_component",
  "w_bonuses", "w_bonuses_component",
  "w_pensions", "w_pensions_payer", "w_health", "w_health_payer",
  "w_occupational_risk", "w_payroll_taxes", "w_payroll_payer",
  "w_payroll_component",
];
export const TENURE_FRAMES = [
  "t_non_salary", "t_bonuses", "t_payroll_taxes",
  "t_pensions", "t_health", "t_occupational_risk",
];

export const DEFAULTS = {
  view: "across",
  category: "all",
  breakdown: "total",
  socialSub: "pensions",
  bonusComponent: "all_bonuses",
  /* TWO SEPARATE SELECTIONS, one per view, exactly as the R app has two
     separate inputs -- `mw_slider`, a single handle, in Comparing countries
     and `mw_range`, two handles, in By country. Keeping one shared value
     meant the across view's clamp to a single level followed the reader into
     the By-country view and collapsed its multicategory axis to one wage, a
     bug the module smoke test caught.

     The within default is all five levels, measured from the running app
     rather than read off the R source: the reactiveVal starts at "1sm" for
     both views, but the two-handle sliderTextInput is given
     `selected = c("1 MW", "1 MW")` and initialises to the FULL range when both
     handles land on the same stop, so every captured By-country figure spans
     1 to 15 MW. */
  wageAcross: "1sm",
  wagesWithin: [...WAGE_LEVELS],
  country: "ARG",
};

export function normalize(raw = {}) {
  const s = { ...DEFAULTS, ...raw };

  /* A breakdown the category does not offer falls back to the first one it
     does. In the R app the button simply is not rendered, so the state could
     only get here by a stale value -- which is what reset_across_defaults was
     for. */
  const allowed = breakdownsFor(s.category, s.view, s.socialSub);
  if (!allowed.includes(s.breakdown)) s.breakdown = allowed[0];

  /* `wages` is PURELY DERIVED from whichever of the two selections the view
     owns -- never read back as an input. Accepting it as one looked harmless
     and was not: normalize() is called with the previous state spread in, so
     the derived `wages` came back round as the By-country selection and
     carried the across view's clamp to a single level with it. Set
     `wageAcross` or `wagesWithin`; `wages` is output. */
  if (!WAGE_LEVELS.includes(s.wageAcross)) s.wageAcross = "1sm";
  let within = WAGE_LEVELS.filter((w) => s.wagesWithin.includes(w));
  if (!within.length) within = [...WAGE_LEVELS];
  s.wagesWithin = within;
  s.wages = s.view === "across" ? [s.wageAcross] : within;

  /* "All" is the across view's country and is meaningless in the within one. */
  if (s.view === "across") s.country = "All";
  else if (!s.country || s.country === "All") s.country = DEFAULTS.country;

  /* Precomputed because almost every consumer needs the LABELS, not the
     codes: the data's `wage` column stores "5 MW" and the state stores
     "5sm". */
  s.wageLabels = s.wages.map((w) => wageLabel(w));
  return s;
}
