/* ============================================================================
   spec.js - which figure a selection asks for
   ============================================================================
   This file replaces the branch cascade of tabs/server/non_salary/plots.R.
   That file is 3,753 lines producing ONE output, and its sibling branches
   differ only in which frame they read, which decoder they use, which palette
   they take and whether they print value labels -- plots.R:1740 and :1843 are
   character-identical apart from one extra filter(country == ...).

   So the shape is a TABLE, matched top to bottom so precedence is preserved by
   construction, producing a flat spec:

     frame      which exported frame to read
     decode     total | payer | component | bonus
     aggregate  sum the rows first (payroll taxes are one row per named tax)
     series     Scenario | Type -- what one trace is
     stack      stacked segments vs one bar per scenario
     order      the legend/stack order
     palette    a key into palette.js, or a function of the state
     labels     print the value on the mark
     zeroFill   back-fill missing (Scenario, Type) pairs with 0
     dropMissing  payroll | occRisk | health -- which country filter applies

   ONLY SIXTEEN SHAPES ARE REACHABLE, and much of plots.R is not. The whole
   tenure branch (:524-843) is dead because input$show_by_tenure has no UI; the
   `length(country_sel) > 1` branches cannot fire because the across view mounts
   no country selector; and the single-country sub-branches of the across
   shapes are the within view's own path. See CLAUDE.md.
   ========================================================================= */

export const CATEGORIES = ["all", "bonuses_and_benefits", "social", "payroll_taxes"];
export const BREAKDOWNS = ["total", "payer", "component"];
export const SOCIAL_SUBS = ["pensions", "health", "occupational_risk"];
export const BONUS_COMPONENTS = ["all_bonuses", "ab", "pl", "up", "ob"];

/* helpers.R:1046. Which breakdowns a category offers -- and `payroll_taxes`
   offers `component` in the WITHIN view only, which is why this takes the
   view. `social` + `occupational_risk` additionally drops `payer`. */
export function breakdownsFor(category, view, socialSub) {
  if (category === "all") return ["total", "payer", "component"];
  if (category === "bonuses_and_benefits") return ["total", "component"];
  if (category === "social") {
    return socialSub === "occupational_risk" ? ["total"] : ["total", "payer"];
  }
  if (category === "payroll_taxes") {
    return view === "within" ? ["total", "payer", "component"] : ["total", "payer"];
  }
  return ["total"];
}

/* The frame ids, per (category, breakdown, view). `across` reads the cross
   frames, `within` the wage_variation ones -- NOT the tenure folder, which
   only the second By-country chart touches. */
const FRAME = {
  across: {
    "all|total": "non_salary",
    "all|payer": "non_salary_payer",
    "all|component": "non_salary_component",
    "bonuses_and_benefits|total": "bonuses_all",
    "bonuses_and_benefits|component": "bonuses_component",
    "social|pensions|total": "pensions_all",
    "social|pensions|payer": "pensions_payer",
    "social|health|total": "health_all",
    "social|health|payer": "health_payer",
    "social|occupational_risk|total": "occupational_risk_all",
    "payroll_taxes|total": "payroll_taxes_all",
    "payroll_taxes|payer": "payroll_taxes_payer",
  },
  within: {
    "all|total": "w_non_salary",
    "all|payer": "w_non_salary_payer",
    "all|component": "w_non_salary_component",
    "bonuses_and_benefits|total": "w_bonuses",
    "bonuses_and_benefits|component": "w_bonuses_component",
    "social|pensions|total": "w_pensions",
    "social|pensions|payer": "w_pensions_payer",
    "social|health|total": "w_health",
    "social|health|payer": "w_health_payer",
    "social|occupational_risk|total": "w_occupational_risk",
    "payroll_taxes|total": "w_payroll_taxes",
    "payroll_taxes|payer": "w_payroll_payer",
    "payroll_taxes|component": "w_payroll_component",
  },
};

function frameKey({ category, breakdown, socialSub }) {
  return category === "social"
    ? `social|${socialSub}|${breakdown}`
    : `${category}|${breakdown}`;
}

/* The one frame the second By-country chart reads: the TOTAL tenure frame for
   the selected category. It ignores the breakdown entirely. */
export const TENURE_FRAME = {
  all: "t_non_salary",
  bonuses_and_benefits: "t_bonuses",
  payroll_taxes: "t_payroll_taxes",
  "social|pensions": "t_pensions",
  "social|health": "t_health",
  "social|occupational_risk": "t_occupational_risk",
};

export function tenureFrameFor({ category, socialSub }) {
  return category === "social"
    ? TENURE_FRAME[`social|${socialSub}`]
    : TENURE_FRAME[category];
}

/* The country sets a drop filter is applied against. plots.R:245/257. */
export const DROP = {
  /* Across only. Chile and Ecuador legislate no payroll taxes, Paraguay no
     separate occupational-risk contribution -- so their panels would be empty
     columns, and they are dropped rather than drawn blank. */
  payroll: ["CHL", "ECU"],
  occRisk: ["PRY"],
  /* helpers.R:346. Dropped for across + social + health only. */
  health: ["US4", "BRA", "ESP"],
};

/* ---- the rule table ------------------------------------------------------
   Matched in order. `when` fields are a scalar, an array (membership), or
   absent (wildcard). */
export const RULES = [
  /* --- stacked: five components ------------------------------------------ */
  { when: { category: "all", breakdown: "component" },
    spec: { decode: "component", series: "Type", stack: true,
            order: "COMPONENT", palette: "COMPONENT", labels: false,
            explicitTicks: true, traceorder: "normal" } },

  /* --- stacked: the four bonus components -------------------------------- */
  /* ALL FOUR are drawn when "All Bonuses" is selected, with the missing
     (Scenario, Type) pairs zero-filled so a stacked bar keeps its segment
     order even where a country has no such bonus. */
  { when: { category: "bonuses_and_benefits", breakdown: "component",
            bonusComponent: "all_bonuses" },
    spec: { decode: "bonus", series: "Type", stack: true,
            order: "BONUS", palette: "BONUS", labels: false, zeroFill: true,
            explicitTicks: true } },

  /* A SINGLE bonus component is a DIFFERENT SHAPE IN EACH VIEW, which the
     captured figures settle: across it is one trace per scenario per panel,
     both painted that component's colour, with value labels back on (26
     traces); within it is the same stack as "All Bonuses" with one series left
     in it (2 traces, the second being the component). */
  { when: { view: "within", category: "bonuses_and_benefits", breakdown: "component" },
    spec: { decode: "bonus", series: "Type", stack: true,
            order: "BONUS", palette: "BONUS", labels: false } },
  { when: { category: "bonuses_and_benefits", breakdown: "component" },
    spec: { decode: "bonus", series: "Scenario", stack: false,
            order: "SCENARIO", palette: "BONUS_COMPONENT", labels: true } },

  /* --- stacked: employer / employee -------------------------------------- */
  { when: { breakdown: "payer", category: "payroll_taxes" },
    spec: { decode: "payer", series: "Type", stack: true, aggregate: true,
            order: "PAYER", palette: "PAYER", labels: false,
            dropMissing: "payroll", explicitTicks: true } },
  /* The "all" payer branch does NOT emit explicit ticks; the per-component
     ones (social, payroll) do -- they go through plot_payer_subplots. */
  { when: { breakdown: "payer", category: "all" },
    spec: { decode: "payer", series: "Type", stack: true,
            order: "PAYER", palette: "PAYER", labels: false } },
  { when: { breakdown: "payer" },
    spec: { decode: "payer", series: "Type", stack: true, aggregate: false,
            order: "PAYER", palette: "PAYER", labels: false,
            explicitTicks: true } },

  /* --- the within view's own breakdown: one trace per named tax ---------- */
  { when: { category: "payroll_taxes", breakdown: "component" },
    spec: { decode: "namedComponent", series: "Type", stack: true,
            order: "DATA", palette: "OVERFLOW", labels: false } },

  /* --- one bar per scenario ---------------------------------------------- */
  /* Social and occupational risk paint Min and Max the SAME flat component
     colour (resolve_social_colors, helpers.R:1026) rather than the light/dark
     scenario pair: within one contribution there is no Min-vs-Max story to
     tell with colour, and the component's own colour is what links the chart
     to the stacked ones. */
  /* THE WITHIN SOCIAL CHARTS CARRY NO VALUE LABELS, and the across ones do --
     measured: within/social-total and within/occrisk-total have no
     texttemplate at all, while within/all-total, bonus-total and
     payroll-total do. So the flat-colour social branch loses its labels in
     the By-country view only. */
  { when: { view: "within", category: "social" },
    spec: { decode: "total", series: "Scenario", stack: false,
            order: "SCENARIO", palette: "SOCIAL", labels: false } },
  { when: { category: "social", socialSub: "occupational_risk" },
    spec: { decode: "total", series: "Scenario", stack: false,
            order: "SCENARIO", palette: "SOCIAL", labels: true,
            dropMissing: "occRisk" } },
  { when: { category: "social" },
    spec: { decode: "total", series: "Scenario", stack: false,
            order: "SCENARIO", palette: "SOCIAL", labels: true } },
  { when: { category: "payroll_taxes" },
    spec: { decode: "total", series: "Scenario", stack: false,
            order: "SCENARIO", palette: "SCENARIO", labels: true,
            dropMissing: "payroll" } },
  { when: {},
    spec: { decode: "total", series: "Scenario", stack: false,
            order: "SCENARIO", palette: "SCENARIO", labels: true } },
];

function matches(when, state) {
  for (const [k, want] of Object.entries(when)) {
    const got = state[k];
    if (Array.isArray(want) ? !want.includes(got) : want !== got) return false;
  }
  return true;
}

/* The within view's exclusion notices: an empty figure carrying one centred
   annotation, because the country genuinely has nothing to show rather than a
   zero. plots.R:485-522. */
export const EXCLUSIONS = [
  { category: "payroll_taxes", countries: ["CHL", "ECU"],
    noun: "statutory payroll taxes" },
  { category: "social", socialSub: "health", countries: ["BRA", "ESP", "US4"],
    noun: "statutory health contributions" },
  { category: "social", socialSub: "occupational_risk", countries: ["PRY"],
    noun: "a separate statutory occupational-risk contribution" },
];

export function exclusionFor(state) {
  if (state.view !== "within") return null;
  for (const e of EXCLUSIONS) {
    if (e.category !== state.category) continue;
    if (e.socialSub && e.socialSub !== state.socialSub) continue;
    if (!e.countries.includes(state.country)) continue;
    return e;
  }
  return null;
}

/* Resolve a normalised state to exactly one spec. The caller is expected to
   have normalised first (state.js), so every field is present. */
export function resolveSpec(state) {
  for (const rule of RULES) {
    if (matches(rule.when, state)) {
      return {
        ...rule.spec,
        frame: FRAME[state.view][frameKey(state)],
        /* The across view's dropMissing filters do not apply to a single
           country: the within view shows an exclusion NOTICE instead, which
           says why rather than silently omitting. */
        dropMissing: state.view === "across" ? rule.spec.dropMissing ?? null : null,
        health: state.view === "across" && state.category === "social"
          && state.socialSub === "health",
      };
    }
  }
  /* Unreachable: the last rule is a wildcard. Throwing rather than returning
     undefined keeps a future edit to the table from failing silently. */
  throw new Error(`resolveSpec: no rule matched ${JSON.stringify(state)}`);
}
