/* ============================================================================
   table.js - the reactable replacement
   ============================================================================
   Three tables in the app are live reactables: minwage's rules matrix with its
   column-family cuts, firing's scenario matrix with coloured cells, and btax's
   CIT matrix (now callerless). The rest of the reactable machinery in
   tabs/server/non_salary/tables.R sits behind an unconditional return(NULL) and
   is not ported.

   A REAL <table>, not reactable's div grid. The only rules in labor.css that
   still target reactable internals are `.tbl-scroll-wrap` and
   `.tbl-scroll-wrap .rt-thead { position: sticky }`, and both work on a
   semantic table -- so the inherited CSS keeps working while the markup
   becomes something a screen reader can navigate by row and column header,
   which a div grid without full ARIA cannot.

   The colDef vocabulary mirrors reactable's closely enough that the R call
   sites translate one-for-one: align, minWidth, sticky, cell(), style(),
   header, html.
   ========================================================================= */

import { h } from "./dom.js";

const DEFAULT_MIN_WIDTH = 120;

/* `columns` is {name: colDef}; `order` is the column order (defaults to the
   keys of the first row). A colDef may carry:
     header     string, defaults to the column name ("" blanks it)
     align      "left" | "center" | "right"
     minWidth   px, default 120 -- also what the natural-width cap sums
     sticky     "left" to pin the column while the table scrolls sideways
     cell       (value, row) => string | Node   -- the displayed content
     style      (value, row) => object          -- per-cell inline style
     html       true when `cell` returns trusted markup from the build step
*/
export function renderTable(rows, {
  columns = {},
  order = null,
  striped = true,
  caption = null,
  /* reactable(width = "100%") distributes leftover space across the columns,
     so a two-column cut would stretch a two-word norm citation across the
     whole window. The cap is the sum of the shown columns' own minimums, and
     it is a MAXIMUM: a window narrower than the cut is unaffected. */
  maxWidth = null,
} = {}) {
  const names = order ?? (rows.length ? Object.keys(rows[0]) : []);

  const thead = h("thead.rt-thead", null,
    h("tr", null, names.map((name) => {
      const def = columns[name] ?? {};
      return h("th.rt-th", {
        scope: "col",
        style: {
          minWidth: `${def.minWidth ?? DEFAULT_MIN_WIDTH}px`,
          textAlign: def.headerAlign ?? "center",
          ...(def.sticky === "left" ? { position: "sticky", left: "0", zIndex: "3" } : {}),
        },
      }, def.header ?? name);
    })));

  const tbody = h("tbody", null, rows.map((row) => h("tr.rt-tr", null,
    names.map((name, i) => {
      const def = columns[name] ?? {};
      const v = row[name];
      const content = def.cell ? def.cell(v, row) : (v ?? "");
      const style = {
        textAlign: def.align ?? "left",
        minWidth: `${def.minWidth ?? DEFAULT_MIN_WIDTH}px`,
        ...(def.sticky === "left"
          ? { position: "sticky", left: "0", zIndex: "1", background: "#fff" }
          : {}),
        ...(def.style ? def.style(v, row) : {}),
      };
      /* The first column is the row's key, so it is a <th scope="row">: that
         is what lets a screen reader announce "Colombia, Full-time workday,
         <text>" instead of reading the cell bare. */
      const tag = i === 0 ? "th.rt-td" : "td.rt-td";
      const attrs = { style, ...(i === 0 ? { scope: "row" } : {}) };
      return def.html && typeof content === "string"
        ? h(tag, { ...attrs, html: content })
        : h(tag, attrs, content);
    }))));

  const table = h("table.rf-table", { class: striped ? "is-striped" : null },
    caption ? h("caption", null, caption) : null, thead, tbody);

  const wrap = h("div.tbl-scroll-wrap", {
    style: {
      display: "flex", justifyContent: "center", width: "100%",
      margin: "0 auto",
      ...(maxWidth ? { maxWidth: `${Math.round(maxWidth)}px` } : {}),
    },
  }, table);

  return wrap;
}

/* The sum of the shown columns' own minimums -- the natural-width cap. */
export function naturalWidth(names, columns) {
  return names.reduce(
    (a, n) => a + ((columns[n] ?? {}).minWidth ?? DEFAULT_MIN_WIDTH), 0);
}

/* A two-column Field/Value transpose of one row. Used wherever the app shows
   one country's detail as a vertical list rather than a matrix: minwage's
   By-country rules, firing's scenario column, btax's CIT row. The R versions
   are three hand-rolled <table>s plus one reactable with both headers blanked;
   this is the one shape they all were. */
export function verticalTable(pairs, {
  fieldWidth = "30%", valueHtml = true, preLine = false,
} = {}) {
  return h("table.rf-table.rf-vertical", null,
    h("tbody", null, pairs.map(([field, value]) =>
      h("tr", null,
        h("th.rf-vertical-field", {
          scope: "row",
          style: { width: fieldWidth, color: "var(--fede-azul-deep)",
                   borderBottom: "var(--hairline)" },
        }, field),
        /* `pre-line`, not `normal`: several CIT values are multi-line lists
           ("1. IRPJ:\n a) Lucro Real:") and collapsing the newlines runs them
           together. */
        valueHtml && typeof value === "string"
          ? h("td.rf-vertical-value", {
              html: value,
              style: preLine ? { whiteSpace: "pre-line" } : {},
            })
          : h("td.rf-vertical-value",
              { style: preLine ? { whiteSpace: "pre-line" } : {} }, value)))));
}
