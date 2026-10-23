/* ============================================================================
   table.js - reading the dictionary-encoded frames written by
              data-raw/export_site_data.R
   ============================================================================
   The R app held every frame in memory as a data.frame and filtered it with
   dplyr on each interaction. This is the static site's equivalent, and the API
   is shaped so the call sites read like the dplyr they replace:

     const df = (await db.frame("pensions_payer"))
       .where({ wage: wageLabels, country: state.country === "All" ? undefined : state.country })
       .derive("Scenario", r => r.label.endsWith("_min") ? "Min" : "Max")
       .toRows();

   WHY DICTIONARY ENCODING, given the data is small: the live corpus is only
   ~6,200 rows across the frames any chart can reach, so filtering was never
   the problem -- DOWNLOAD WEIGHT was. Several columns carry multi-hundred-byte
   prose repeated on every row of a frame, and encoding them as
   {dict, indices} is what takes the payload from 40 MB to 136 KB gzip.

   An `undefined` value in a `where` predicate is IGNORED rather than matched.
   That is load-bearing: it is what lets the "All countries" and
   "one country" cases of the non-salary cascade -- which in plots.R are two
   near-identical branches repeated five times over -- collapse into one
   expression.

   TWO BACKING MODES, one API. A table read from JSON stays ENCODED, and
   `where` on it compares dictionary indices as integers without ever touching
   a string. `derive` cannot work on codes (its callback needs real values), so
   it returns a MATERIALISED table holding plain row objects, on which `where`
   is a straight filter. Both modes expose the same methods, so a caller never
   has to know which it holds. Encoded is the fast path and is what the heavy
   country/wage filtering uses; materialised is the tail of a chain, on at most
   a few hundred surviving rows.
   ========================================================================= */

const KIND_DICT = "dict";
const KIND_NUM  = "num";
const KIND_BOOL = "bool";

export class Table {
  /* Not called directly -- use decodeTable() or the chaining methods. */
  constructor({ n, columns, index = null, rows = null, name = "" }) {
    this.n = n;
    this.name = name;
    this._columns = columns;   // Map<string, {kind, dict?, codes?, values?}>
    this._index = index;       // Int32Array of source row numbers, or null = all
    this._rows = rows;         // materialised row objects, or null = still encoded
  }

  get materialised() { return this._rows !== null; }

  get columnNames() {
    return this._rows
      ? (this._rows.length ? Object.keys(this._rows[0]) : [])
      : [...this._columns.keys()];
  }

  /* The source row number of view row i. */
  _src(i) { return this._index ? this._index[i] : i; }

  /* One cell, by view row and column name. */
  value(i, col) {
    if (this._rows) return this._rows[i][col];
    const c = this._columns.get(col);
    if (!c) return undefined;
    const s = this._src(i);
    if (c.kind === KIND_DICT) return c.dict[c.codes[s]];
    if (c.kind === KIND_BOOL) return c.values[s] === null ? null : c.values[s] === 1;
    return c.values[s];
  }

  /* ---- filtering ---------------------------------------------------------
     `pred` is either an object of {column: value | value[]} or a predicate
     function taking a row object. Object form on an encoded table is resolved
     entirely in dictionary space: each constraint becomes a Set of integer
     codes, so a 3,380-row frame is filtered without materialising a string.

     A constraint naming a column the frame does not have THROWS. Silently
     matching everything is how a typo'd column name turns into a chart that
     quietly ignores its filter -- the exact class of bug this port is trying
     not to inherit. */
  where(pred) {
    if (typeof pred === "function") {
      const rows = this.toRows().filter(pred);
      return new Table({ n: rows.length, columns: this._columns, rows, name: this.name });
    }

    const keys = Object.keys(pred).filter((k) => pred[k] !== undefined);

    if (this._rows) {
      const rows = this._rows.filter((r) =>
        keys.every((k) => {
          const want = pred[k];
          return Array.isArray(want) ? want.includes(r[k]) : r[k] === want;
        }));
      return new Table({ n: rows.length, columns: this._columns, rows, name: this.name });
    }

    for (const k of keys) {
      if (!this._columns.has(k)) {
        throw new Error(
          `Table("${this.name}").where: no column "${k}". Columns: ${this.columnNames.join(", ")}`);
      }
    }

    /* Compile each constraint once, then scan. */
    const tests = keys.map((k) => {
      const c = this._columns.get(k);
      const want = Array.isArray(pred[k]) ? pred[k] : [pred[k]];
      if (c.kind === KIND_DICT) {
        const codes = new Set();
        for (const w of want) {
          const ix = c.dict.indexOf(w);
          if (ix >= 0) codes.add(ix);
        }
        /* No matching dictionary entry means nothing can match; an empty Set
           says exactly that, and the scan below returns zero rows. */
        return (s) => codes.has(c.codes[s]);
      }
      if (c.kind === KIND_BOOL) {
        const vals = new Set(want.map((w) => (w === null ? null : w ? 1 : 0)));
        return (s) => vals.has(c.values[s]);
      }
      const vals = new Set(want);
      return (s) => vals.has(c.values[s]);
    });

    const out = [];
    for (let i = 0; i < this.n; i++) {
      const s = this._src(i);
      let keep = true;
      for (const t of tests) { if (!t(s)) { keep = false; break; } }
      if (keep) out.push(s);
    }
    return new Table({
      n: out.length, columns: this._columns,
      index: Int32Array.from(out), name: this.name,
    });
  }

  /* ---- deriving ----------------------------------------------------------
     Adds a computed column. This is the port of the `mutate()` calls that
     decode a label into Scenario (Min/Max) and payer (Employer/Employee) by
     substring -- see prepare_payer_data() in plots.R:1044.

     It materialises, because the callback is handed a row object. Chain
     `where` BEFORE `derive` wherever both apply: filtering first is what keeps
     the string work on the surviving rows. */
  derive(name, fn) {
    const rows = this.toRows().map((r) => ({ ...r, [name]: fn(r) }));
    return new Table({ n: rows.length, columns: this._columns, rows, name: this.name });
  }

  select(...names) {
    const rows = this.toRows().map((r) => {
      const o = {};
      for (const k of names) o[k] = r[k];
      return o;
    });
    return new Table({ n: rows.length, columns: this._columns, rows, name: this.name });
  }

  /* ---- materialising ----------------------------------------------------- */
  toRows() {
    if (this._rows) return this._rows;
    const names = this.columnNames;
    const out = new Array(this.n);
    for (let i = 0; i < this.n; i++) {
      const r = {};
      for (const k of names) r[k] = this.value(i, k);
      out[i] = r;
    }
    return out;
  }

  /* One column as a plain array, in view order. */
  column(col) {
    const out = new Array(this.n);
    for (let i = 0; i < this.n; i++) out[i] = this.value(i, col);
    return out;
  }

  /* Distinct values of a column, in first-seen order. For an encoded table
     this walks the dictionary, so it is the cheap way to ask "which countries
     are in this frame?" without materialising anything. */
  distinct(col) {
    const seen = new Set();
    const out = [];
    for (let i = 0; i < this.n; i++) {
      const v = this.value(i, col);
      if (!seen.has(v)) { seen.add(v); out.push(v); }
    }
    return out;
  }

  /* Escape hatches, for the rare case that wants codes rather than values. */
  dict(col) { return this._columns.get(col)?.dict; }
  codes(col) { return this._columns.get(col)?.codes; }
}

/* ------------------------------------------------------------------------- */

export function decodeTable(json, name = "") {
  const columns = new Map();
  for (const [col, dict] of Object.entries(json.dicts || {})) {
    columns.set(col, { kind: KIND_DICT, dict, codes: json.cols[col] });
  }
  for (const [col, values] of Object.entries(json.nums || {})) {
    columns.set(col, { kind: KIND_NUM, values });
  }
  for (const [col, values] of Object.entries(json.bools || {})) {
    columns.set(col, { kind: KIND_BOOL, values });
  }
  return new Table({ n: json.n, columns, name });
}

/* ------------------------------------------------------------------------- */
/* The frame store. One in-flight promise per frame, cached forever: the whole
   live corpus is ~136 KB gzip, so there is nothing worth evicting, and a frame
   fetched twice would be a bug the cache hides rather than a cost.

   `baseUrl` is RELATIVE by default. That is what lets the built folder be
   dropped into any subdirectory of a server without being told the path. */
export function openDb(baseUrl = "data/") {
  const frames = new Map();
  let constantsPromise = null;
  let manifestPromise = null;

  const fetchJson = async (file) => {
    const res = await fetch(baseUrl + file);
    if (!res.ok) throw new Error(`${baseUrl}${file}: HTTP ${res.status}`);
    return res.json();
  };

  const resolved = new Map();

  const frame = (id) => {
    if (!frames.has(id)) {
      frames.set(id, fetchJson(`${id}.json`).then((j) => {
        const t = decodeTable(j, id);
        resolved.set(id, t);
        return t;
      }));
    }
    return frames.get(id);
  };

  return {
    frame,
    /* Warm several frames at once. Modules call this on mount so that the
       render path itself is synchronous -- which is what removes the need for
       Shiny's `recalculating` spinner on every filter click. */
    load: (...ids) => Promise.all(ids.map(frame)),
    /* Already-resolved frames, for a synchronous render after load(). */
    ready: (id) => {
      const t = resolved.get(id);
      if (!t) {
        throw new Error(`frame "${id}" is not loaded yet -- await db.load("${id}") first`);
      }
      return t;
    },
    constants: () => (constantsPromise ??= fetchJson("constants.json")),
    manifest: () => (manifestPromise ??= fetchJson("manifest.json")),
    json: fetchJson,
  };
}
