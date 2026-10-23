/* ============================================================================
   refline.js - the dashed reference line and its label
   ============================================================================
   Ports minwage_ref_line (tabs/server/minwage.R:520) and btax_ref_line
   (tabs/server/btax.R:129). Firing has no equivalent and draws none.

   IT TAKES VECTORS, AND THAT IS LOAD-BEARING. plotly's layout() CONCATENATES
   `annotations` across successive calls but REPLACES `shapes`. Calling the R
   helper three times for three quartiles therefore kept all three labels and
   silently dropped two of the three lines -- a real bug, and one that looks
   like a rendering glitch rather than a logic error. Every line belonging to
   one figure must be produced in a single call, which is why these functions
   return the complete `shapes` and `annotations` arrays for the caller to set
   ONCE rather than mutating a figure.

   `orientation` names the axis carrying the VALUE: "v" for vertical bars
   (value on y), "h" for horizontal (value on x). The argument exists because
   the first version hardcoded yref = "y" and drew the dumbbell's reference
   line straight ACROSS the US4 row instead of at value 1.
   ========================================================================= */

import { constants, fs } from "../core/format.js";

function build(values, labels, orientation, color, lineStyle) {
  const vals = Array.isArray(values) ? values : [values];
  const labs = labels === null || labels === undefined
    ? null
    : (Array.isArray(labels) ? labels : [labels]);
  if (labs && labs.length !== vals.length) {
    throw new Error("refLine: labels and values must be the same length");
  }

  const shapes = vals.map((v) => (orientation === "v"
    ? { type: "line", xref: "paper", x0: 0, x1: 1, yref: "y", y0: v, y1: v,
        /* `below` keeps the dashes behind the bars: a dashed line drawn OVER
           thirteen bars reads as a rendering defect. */
        layer: "below", line: { color, ...lineStyle } }
    : { type: "line", yref: "paper", y0: 0, y1: 1, xref: "x", x0: v, x1: v,
        layer: "below", line: { color, ...lineStyle } }));

  if (!labs) return { shapes, annotations: [] };

  const annotations = [];
  vals.forEach((v, i) => {
    const text = labs[i];
    if (!text) return;                       /* R filters on nzchar(label) */
    const pos = orientation === "v"
      ? { xref: "paper", x: 0.995, xanchor: "right",
          yref: "y", y: v, yanchor: "bottom", yshift: 3 }
      : { yref: "paper", y: 1, yanchor: "bottom", yshift: 6,
          xref: "x", x: v, xanchor: "center" };
    annotations.push({
      ...pos, text, showarrow: false, align: "left",
      /* Insurance in case a sort change ever puts a bar behind the label. */
      bgcolor: "rgba(255,255,255,0.85)", borderpad: 2,
      font: { family: constants().PLOTLY_FONT_FAMILY, size: fs(10), color },
    });
  });
  return { shapes, annotations };
}

/* minwage.R:520 */
export function minwageRefLine(values, labels = null, {
  orientation = "v", color = null,
} = {}) {
  return build(values, labels, orientation,
               color ?? constants().MINWAGE_ACCENT,
               { dash: "dash", width: 1.2 });
}

/* btax.R:129. Same geometry, a thinner dotted line, and `label` is REQUIRED --
   the R version asserts length(value) == length(label). */
export function btaxRefLine(values, labels, { orientation = "v", color = null } = {}) {
  if (labels === null || labels === undefined) {
    throw new Error("btaxRefLine: a label is required for every value");
  }
  return build(values, labels, orientation,
               color ?? constants().BTAX_ACCENT,
               { dash: "dot", width: 1.5 });
}
