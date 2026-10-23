/* ============================================================================
   text.js - the Minimum Wages module's prose
   ============================================================================
   The headings, descriptions and footer notes, transcribed from
   tabs/server/minwage.R. They live with the module rather than in
   constants.json because they are chart copy, not palette: the build step
   exports what the charts need to DRAW, and this is what they need to SAY.

   ONE IDEA PER LEVEL, which is the rule the R comments state: the <h3> says
   WHAT, the description says HOW TO READ IT, and the footer carries the
   caveats. Descriptions are kept near 200 characters -- they once ran to 826,
   repeating what the axis, the reference label and the note already said.
   ========================================================================= */


/* minwage.R:77-110 */
export const SOURCE = {
  rules: "Source: authors' calculations on country-level minimum-wage regulations.",
  /* The level chart comes from the project's own minimum-wage database rather
     than the report, hence its own source line. */
  level: "Source: project minimum-wage database, US$ at 2017 purchasing power parity,"
       + " and authors' calculations.",
  /* The compliance chart is the only one built on household-survey microdata
     rather than on the statutory rates. */
  below: "Source: authors' calculations on national household surveys via SEDLAC"
       + " (CEDLAS and the World Bank), and de jure regulatory frameworks.",
  /* A later vintage than the report the rest of the module is built on. Its
     sheets state NO survey year -- the strings that look like years are digits
     inside decimals -- so the footer says so rather than guessing one. */
  dist: "Source: Regulatory frameworks output workbook, 19 December 2025"
      + " (figure F8A), and authors' calculations on household survey microdata.",
  value: "Source: project minimum-wage database, national currency,"
       + " and authors' calculations.",
};

export const DIST_VINTAGE = "Survey year not stated in source.";

export const VIEW_SUBTITLE = {
  across:
    "The 11 Latin American countries the report covers, with Spain and four U.S. states"
    + " (California, Florida, New York and Texas) as comparators. One section at a time:"
    + " how much the minimum wage is, who earns less than it, where it bites in the wage"
    + " distribution, and the rules behind it.",
  within:
    "One country at a time: what each of its legislated minimum wages actually pays per"
    + " month, and how far each sits from the country's own reference rate.",
};

/* =========================== headings ==================================== */

export const HEADING = {
  /* The year is in the title because the survey-based charts on this page are
     2019-2023 and this one is 2023: without it the module read as stale. */
  level: {
    title: "National minimum-wage level, 2023",
    description:
      "The statutory monthly minimum wage, either in US dollars at 2017 purchasing power"
      + " parity or as an index against the LA11 average. Bars run from the highest to the"
      + " lowest.",
  },
  below: {
    title: "Paid workers earning less than the minimum wage",
    description:
      "The solid bar counts workers paid less than the minimum per hour worked; the pale"
      + " bar behind it adds those who fall short of the monthly minimum only because they"
      + " work part time. Ranked by the per-hour figure.",
  },
};

/* The bite heading reads its two figures OUT OF THE DATA for the selected
   basis. They used to be hardcoded monthly numbers on a chart with a
   monthly/hourly toggle, so the sentence was wrong half the time. */
export function biteHeading(wageDist, basis) {
  const med = (country) => {
    const r = wageDist.where({ basis, stat: "p50", country }).toRows()[0];
    return r ? (r.value).toFixed(2) : "?";
  };
  return {
    title: "Where the minimum wage falls in the wage distribution",
    description:
      "The 25th, 50th and 75th percentile of each country's wage distribution, in multiples"
      + " of its own minimum wage: the dashed line at 1 IS the minimum wage, and every"
      + " marker to its left is a wage below the legal minimum. "
      + `The median worker earns ${med("Peru")} of it in Peru and `
      + `${med("United States")} in the United States.`,
  };
}

/* =========================== footers ===================================== */

export const FOOTER = {
  below: {
    note: [
      "The per-hour figure scales the earnings of workers below their country's part-time threshold up to a full-time equivalent, and changes nothing else — which is why it is always the smaller of the two.",
      "Those thresholds are not the statutory workweek and differ across countries (Peru 25 hours, Dominican Rep. 29, Brazil and Chile 30, Argentina and Paraguay 32, Ecuador 36, the rest 40; not stated for the United States), so the per-hour figure is not strictly comparable between them.",
      "Neither measure flags a worker who exceeds full-time hours and still earns below the minimum per hour.",
      "Twelve countries: Spain is absent from the surveys and the United States figure is national, not the four-state US4 construct the charts above use.",
      "Survey years differ — Honduras is 2019, every other country 2022 or 2023. Public-sector, education, domestic and unpaid workers are excluded throughout.",
      "LA11 is the simple average of the eleven Latin American countries.",
    ].join(" "),
    source: SOURCE.below,
    vintage: "Household surveys, 2019-2023.",
  },
  bite: {
    note: [
      "Each marker is a percentile of that country's own wage distribution divided by its minimum wage.",
      "The three quartiles only. The source also carries the 5th, 95th and 99th percentiles and the mean, and they are in the downloaded data — the tails were dropped from the chart because one United States dot at 16 times the minimum wage compressed the range where every country's median actually sits.",
      "The axis does not rescale when a single quartile is selected, so the pills compare like with like.",
      "Twelve countries: Spain is not in this figure, and the United States series is the national wage distribution, not the four-state US4 average the level chart uses.",
    ].join(" "),
    source: SOURCE.dist,
    vintage: DIST_VINTAGE,
  },
};

/* TWO DIFFERENT NOTES, because the per-hour view is a different measurement
   and not a rescaling of the same one. */
export function levelFooter(period) {
  if (period === "hour") {
    return {
      note: [
        "The monthly minimum wage divided by each country's own statutory full-time month, so this is the legal price of an hour, not what an hour is observed to pay.",
        "Eleven countries: Spain and US4 have no codified workweek in the report and cannot be placed on a per-hour axis at all.",
        "TWO COUNTRIES STATE THEIR FULL-TIME MONTH AND THE REST DO NOT. Ecuador's law puts it at 160 hours and the Dominican Republic's at 190.6; for the other nine the weekly figure is converted at 52/12 weeks per month. That choice decides the top of this ranking and nothing else: on each country's own law Ecuador leads at $4.96 against Honduras's $4.84, while a single uniform conversion for all eleven puts Ecuador at $4.58 and Honduras first. Every other country is unchanged to the cent.",
        "Ordering also differs from the per-month view: Honduras and Ecuador set the shortest weeks (40 hours) and rise, Peru and Colombia the longest (48) and fall.",
      ].join(" "),
      source: SOURCE.rules,
      vintage: "Minimum wages for 2023; working-time rules in force in 2023.",
    };
  }
  return {
    note: [
      "LA11 is the simple average of the eleven Latin American countries shown; US4 and Spain are indexed against it but are not part of it.",
      "Where a country sets several rates this chart uses one of them as its reference — the federal rate in Brazil and Mexico, accommodation and food services in the Dominican Republic, manufacturing (11-50 workers) in Honduras, and the mean of the four states for US4.",
      "That is one comparable rate per country, which is what a cross-country level needs; the By-country view measures each country against its own floor instead.",
    ].join(" "),
    source: SOURCE.level,
    vintage: "Rates for 2023.",
  };
}

/* =========================== By-country ================================== */

/* Which rate the others are measured against, per country. Only the five
   multiple-rate countries have one. */
const REFERENCE_NOTE = {
  "Dominican Rep.": "Rates are measured against accommodation and food services.",
  Honduras: "Each sector is measured against its own 1-10 worker rate, and within a sector the bars run from the smallest firm-size band to the largest.",
  Brazil: "Rates are measured against the federal minimum wage, grouped by state and then by each state's own occupational groups.",
  Mexico: "Rates are measured against the federal minimum wage.",
  US4: "Rates are measured against Texas, which sits at the federal floor.",
};

export function withinHeading(country, nRates, firstMoney) {
  if (nRates <= 1) {
    return {
      title: `Minimum wage — ${country}`,
      description:
        `${country} sets a single national minimum wage of ${firstMoney} a month, with no`
        + " variation by sector, firm size or region."
        + " Eight of the thirteen countries here are in that position.",
    };
  }
  return {
    title: `Minimum-wage dispersion — ${country}`,
    description: [
      "What each of this country's minimum wages actually pays per month, and how far it sits from the reference rate.",
      REFERENCE_NOTE[country] ?? "",
    ].join(" ").trim(),
  };
}

export function withinFooter(rows) {
  const grouped = rows.some((r) => r.dim_secondary != null);
  const years = [...new Set(rows.map((r) => r.year))].sort().join(" / ");
  return {
    note: rows.length === 1
      ? "This country sets one national minimum wage, so there is a single bar and nothing to compare it against."
      : [
          grouped
            ? "Each sector is measured against its own 1-10 worker rate, outlined in the chart, so there is one reference per sector rather than one for the country."
            : "The dashed line marks the reference rate, and the multiple on each bar is that rate divided by it, so a bar left of the line pays less than the reference.",
          "Wages are in national currency and are not comparable across countries — the level chart in Comparing countries is the one built for that.",
        ].join(" "),
    source: SOURCE.value,
    vintage: `Rates for ${years}.`,
  };
}
