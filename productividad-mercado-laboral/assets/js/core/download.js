/* ============================================================================
   download.js - the CSV and XLSX the Downloads drawer serves
   ============================================================================
   Replaces the eight downloadHandler()s. In Shiny these were server-side file
   generators; here they are built in the browser from the frame the current
   render returned, which is also the fix for the hazard the R app carries --
   `ns_variables$df_final` was assigned from about twenty scattered branches of
   plots.R, so what you downloaded depended on which branch happened to run
   last. One assignment site now: the value the render hands back.

   XLSX uses SheetJS, loaded from the CDN ON FIRST USE rather than on every
   page load. It is ~400 KB, it is needed only by the reader who clicks the
   second button in a drawer that starts closed, and the CSV -- which is what
   most people want -- needs nothing at all.

   ROUNDING: round_download_numeric(digits = 2) in the R app, applied to
   numeric columns only. Kept, because the files are meant to be read by a
   person opening a spreadsheet rather than re-analysed at full precision --
   and the full-precision data is in site/data/ for anyone who wants it.
   ========================================================================= */

const SHEETJS = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";

/* tables.R:783 */
function roundNumeric(rows, digits = 2) {
  return rows.map((r) => {
    const o = {};
    for (const [k, v] of Object.entries(r)) {
      o[k] = typeof v === "number" && Number.isFinite(v)
        ? Number(v.toFixed(digits)) : v;
    }
    return o;
  });
}

function columnsOf(rows) {
  const seen = [];
  for (const r of rows) {
    for (const k of Object.keys(r)) if (!seen.includes(k)) seen.push(k);
  }
  return seen;
}

/* RFC 4180: quote a field that contains a comma, a quote or a newline, and
   double any quote inside it. The R app used write.csv, which does the same. */
function csvField(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows) {
  const cols = columnsOf(rows);
  const head = cols.map(csvField).join(",");
  const body = rows.map((r) => cols.map((c) => csvField(r[c])).join(","));
  return [head, ...body].join("\n");
}

function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Revoked on the next task, not immediately: Safari aborts a download whose
     object URL is released in the same turn. */
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function downloadCsv(rows, filename) {
  if (!rows || !rows.length) {
    notify("There is no data to download for this selection.");
    return;
  }
  save(new Blob([toCsv(roundNumeric(rows))], { type: "text/csv;charset=utf-8" }),
       filename);
}

let sheetjs = null;
function loadSheetJs() {
  sheetjs ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SHEETJS;
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error("could not load the spreadsheet writer"));
    document.head.appendChild(s);
  });
  return sheetjs;
}

export async function downloadXlsx(rows, filename, sheetName = "Sheet1") {
  if (!rows || !rows.length) {
    notify("There is no table to download for this selection.");
    return;
  }
  try {
    const XLSX = await loadSheetJs();
    const ws = XLSX.utils.json_to_sheet(roundNumeric(rows),
                                        { header: columnsOf(rows) });
    const wb = XLSX.utils.book_new();
    /* Excel caps a sheet name at 31 characters and forbids : \ / ? * [ ]. */
    XLSX.utils.book_append_sheet(wb, ws,
      String(sheetName).replace(/[:\\/?*[\]]/g, " ").slice(0, 31));
    XLSX.writeFile(wb, filename);
  } catch (err) {
    notify("The spreadsheet could not be generated. The CSV has the same data.");
    console.error(err);
  }
}

/* The R app used showNotification(); this is the same idea, in the page. */
function notify(message) {
  let el = document.getElementById("rf-notice");
  if (!el) {
    el = document.createElement("div");
    el.id = "rf-notice";
    el.className = "rf-notice";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("is-visible");
  clearTimeout(el.__t);
  el.__t = setTimeout(() => el.classList.remove("is-visible"), 5000);
}

/* Wire a module's Downloads drawer. `get` returns {csv, xlsx, names} for the
   CURRENT state, so the files always match what is on screen. */
export function wireDownloads({ csvButton, tableSlot }, get) {
  csvButton.addEventListener("click", () => {
    const { csv, names } = get();
    downloadCsv(csv, names.csv);
  });

  /* The second button exists only when there IS a table -- which is how the R
     app hid it, and why minwage's By-country view shows none for US4 and
     Spain: they have no rules row, and the fallback used to hand the reader
     eleven OTHER countries' rules under a heading that had just said this
     country has none. */
  return function refresh() {
    const { xlsx, names, note } = get();
    tableSlot.innerHTML = "";
    if (!xlsx || !xlsx.length) return;
    const p = document.createElement("p");
    p.style.cssText = "margin:14px 0 8px";
    p.textContent = note ?? "Download the regulation detail behind this view:";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-download";
    b.textContent = names.xlsxLabel ?? "Download regulation detail";
    b.addEventListener("click", () => {
      const cur = get();
      downloadXlsx(cur.xlsx, cur.names.xlsx, cur.names.sheet);
    });
    tableSlot.append(p, b);
  };
}
