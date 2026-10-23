/* ============================================================================
   text.js - the Business Taxes module's prose
   ============================================================================
   Transcribed from tabs/server/btax.R's heading and footer renderers.
   ========================================================================= */

import { constants } from "../../core/format.js";

export const VIEW_SUBTITLE = {
  across:
    "Sixteen jurisdictions: the eleven Latin American countries the report covers, Spain,"
    + " and four U.S. states (California, Florida, New York and Texas), which are kept"
    + " apart because interstate variation is what this chapter is about.",
  within:
    "One jurisdiction at a time: its bracket schedule where the workbook carries one, and"
    + " everything it legislates — the corporate income tax row and every simplified or"
    + " special regime it operates.",
};

export function rateHeading(scope) {
  return {
    title: "Statutory corporate income tax rate",
    description: scope === "lac"
      ? "The eleven Latin American countries, ranked. This is the report's own figure:"
        + " one legislated rate per country, on net profit."
      : "Every jurisdiction, ranked by the total rate. The four U.S. states are two"
        + " layers — the federal 21% and the state's own share on top of it.",
  };
}

export const FOOTER = {
  rate: {
    note: [
      "The U.S. state share is shown NET of federal deductibility: a state tax is deductible from the federal base, so the combined rate is federal + state × (1 − federal), not the arithmetic sum. California's 8.84% statutory rate therefore appears as 6.98 here.",
      "Texas is shown apart because its tax falls on taxable margin, not net profit; its 0.75% is not on the same scale as the others and is not stacked, so its bar is the federal 21% alone.",
      "Each bar is labelled with its TOTAL rate; the federal layer carries no label of its own because it is the same 21% in all four states.",
      "Eight jurisdictions do not legislate a single rate; what each one sets instead is in the “Corporate tax and regimes” section of the By-country view.",
    ].join(" "),
    source: "Business taxes workbook (19 Aug 2026), sheets DF1, Hoja1 and CIT."
          + " Prepared for “Nivelando el terreno de juego para el crecimiento económico”.",
  },
};

export function scheduleHeading(code, rows) {
  const name = constants().BTAX_CODE_TO_NAME[code] ?? code;
  if (!rows.length) {
    return {
      title: `Rate schedule — ${name}`,
      description:
        "The workbook carries a bracket schedule for four jurisdictions only (Argentina,"
        + " Brazil, Colombia and Ecuador). For the rest, the “Corporate tax and"
        + " regimes” section above has the rate, its relief and every regime this"
        + " jurisdiction operates.",
    };
  }
  return {
    title: `${rows[0].schedule} — ${name}`,
    description: `Marginal rate by bracket, on ${rows[0].basis}. Each jurisdiction's`
      + " schedule is on its own base and its own scale; they are not comparable with one"
      + " another.",
  };
}

export function scheduleFooter(code, rows, flat) {
  if (!rows.length) return null;
  let note;
  if (flat && flat.length) {
    note = `The dashed line is ${String(flat[0].series).toLowerCase()}, a flat `
      + `${flat[0].rate_pct.toFixed(1)}% that applies from the first peso. It is drawn`
      + " apart from the step line because it OVERLAPS the brackets rather than"
      + " following them.";
  } else if (code === "COL") {
    note = "Colombia's groups are the six of sheet AT COL. The other source in the"
      + " workbook, Table C1, omits group G4 (education, human health and social"
      + " welfare) entirely, so it is not used. Hover a step for the group's full name.";
  } else {
    note = "Hover a step for the bracket's bounds and the series it belongs to.";
  }
  const sheets = [...new Set(rows.map((r) => r.source_sheet))].join(", ");
  return { note, source: `Business taxes workbook (19 Aug 2026), sheet ${sheets}.` };
}
