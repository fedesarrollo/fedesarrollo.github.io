/* ============================================================================
   verbs.js - the dplyr/tidyr verbs the port actually uses
   ============================================================================
   Nine functions over arrays of plain row objects. No lodash, no Arquero: the
   frames any chart can reach top out at 650 rows, so there is nothing to
   optimise, and nine named functions you can read in one screen cost less than
   a dependency whose semantics you then have to check against dplyr's anyway.

   The one that carries real weight is `orderBy`. Nearly every branch of
   plots.R does `mutate(x = factor(x, levels = L)) |> arrange(x)`, and modelling
   that as "sort by this key, in this explicit level order" is what removes the
   need for a factor type anywhere in the JS. Level order is the single
   commonest source of silent drift when porting R plotting code: the data
   looks right and the bars are in the wrong order.
   ========================================================================= */

const keyOf = (row, keys) => JSON.stringify(keys.map((k) => row[k]));

/* group_by(...keys) -- Map<serialisedKey, Row[]>, groups in first-seen order. */
export function groupBy(rows, keys) {
  const out = new Map();
  for (const r of rows) {
    const k = keyOf(r, keys);
    let g = out.get(k);
    if (!g) { g = []; out.set(k, g); }
    g.push(r);
  }
  return out;
}

/* group_by(...keys) |> summarize(...aggs)
   `aggs` is {outName: (group: Row[]) => value}. The grouping columns are
   carried through from each group's first row, which is what dplyr does. */
export function summarize(rows, keys, aggs) {
  const out = [];
  for (const group of groupBy(rows, keys).values()) {
    const r = {};
    for (const k of keys) r[k] = group[0][k];
    for (const [name, fn] of Object.entries(aggs)) r[name] = fn(group);
    out.push(r);
  }
  return out;
}

/* pivot_wider(id_cols = id, names_from, values_from) */
export function pivotWider(rows, { id, namesFrom, valuesFrom }) {
  const ids = Array.isArray(id) ? id : [id];
  const out = [];
  const byKey = new Map();
  for (const r of rows) {
    const k = keyOf(r, ids);
    let o = byKey.get(k);
    if (!o) {
      o = {};
      for (const c of ids) o[c] = r[c];
      byKey.set(k, o);
      out.push(o);
    }
    o[r[namesFrom]] = r[valuesFrom];
  }
  return out;
}

/* pivot_longer(cols, names_to, values_to), keeping `keep` as id columns. */
export function pivotLonger(rows, { keep, cols, namesTo, valuesTo }) {
  const out = [];
  for (const r of rows) {
    for (const c of cols) {
      const o = {};
      for (const k of keep) o[k] = r[k];
      o[namesTo] = c;
      o[valuesTo] = r[c];
      out.push(o);
    }
  }
  return out;
}

/* distinct(...by) -- first row of each key, in first-seen order. */
export function distinct(rows, by) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const k = keyOf(r, by);
    if (!seen.has(k)) { seen.add(k); out.push(r); }
  }
  return out;
}

/* expand.grid(a, b) -- every combination, a varying fastest (as R does). */
export function crossJoin(a, b) {
  const out = [];
  for (const rb of b) for (const ra of a) out.push({ ...ra, ...rb });
  return out;
}

/* anti_join(rows, other, by) -- rows of `rows` with no match in `other`.
   With crossJoin, this is the zero-fill of the bonus charts: plots.R:986
   builds every (Scenario, Type) pair, drops the ones already present, and
   gives the remainder value 0, so a stacked bar keeps its segment order even
   where a country has no such bonus. */
export function antiJoin(rows, other, by) {
  const have = new Set(other.map((r) => keyOf(r, by)));
  return rows.filter((r) => !have.has(keyOf(r, by)));
}

/* left_join(rows, other, by, pick) -- brings `pick` columns over from the
   FIRST matching row of `other`; unmatched rows get undefined, as R gives NA.
   `pick` is required on purpose: an unrestricted join is how a column silently
   overwrites one of the same name on the left. */
export function leftJoin(rows, other, by, pick) {
  const ix = new Map();
  for (const r of other) {
    const k = keyOf(r, by);
    if (!ix.has(k)) ix.set(k, r);
  }
  return rows.map((r) => {
    const m = ix.get(keyOf(r, by));
    const o = { ...r };
    for (const c of pick) o[c] = m ? m[c] : undefined;
    return o;
  });
}

/* orderBy(rows, ...keys) where a key is either
     "col"                      -- natural order (numbers numeric, text by
                                   locale-free code-unit comparison, as R's
                                   sort() does for character vectors)
     {key, levels}              -- an explicit level order; values absent from
                                   `levels` sort last, keeping their relative
                                   order (R puts unmatched factor levels at NA,
                                   which arrange() places last)
     {key, desc: true}          -- reversed
   Stable: ties keep their input order, like arrange(). */
export function orderBy(rows, ...keys) {
  const specs = keys.map((k) => (typeof k === "string" ? { key: k } : k));
  const ranked = rows.map((r, i) => ({ r, i }));

  const rankOf = (spec, v) => {
    if (!spec.levels) return null;
    const ix = spec.levels.indexOf(v);
    return ix < 0 ? spec.levels.length : ix;
  };

  ranked.sort((a, b) => {
    for (const spec of specs) {
      let va = a.r[spec.key];
      let vb = b.r[spec.key];
      if (spec.levels) { va = rankOf(spec, va); vb = rankOf(spec, vb); }
      let c;
      if (va === vb) c = 0;
      else if (va === undefined || va === null) c = 1;      // NA last
      else if (vb === undefined || vb === null) c = -1;
      else if (typeof va === "number" && typeof vb === "number") c = va - vb;
      else c = String(va) < String(vb) ? -1 : 1;
      if (c !== 0) return spec.desc ? -c : c;
    }
    return a.i - b.i;                                        // stable
  });
  return ranked.map((x) => x.r);
}

/* ---- composites that recur ------------------------------------------------ */

/* The levels of `col` that are actually present in `rows`, in the order given
   by `levels`. This is the panel-order primitive: a 13-panel subplot must not
   emit a panel for a country the current filter dropped. */
export function presentIn(rows, col, levels) {
  const have = new Set(rows.map((r) => r[col]));
  return levels.filter((l) => have.has(l));
}

/* group_by(country) |> summarize(min(value), max(value)) -- the Min/Max pair
   several across branches derive rather than read from the _min/_max labels
   (plots.R:2600, :3132). Note it is genuinely min() and max() OVER THE ROWS,
   not a lookup of the two labelled rows. */
export function minMaxBy(rows, keys, valueCol = "value", outMin = "total_cost_min",
                         outMax = "total_cost_max") {
  const num = (g) => g.map((r) => r[valueCol]).filter((v) => typeof v === "number" && !Number.isNaN(v));
  return summarize(rows, keys, {
    [outMin]: (g) => { const v = num(g); return v.length ? Math.min(...v) : null; },
    [outMax]: (g) => { const v = num(g); return v.length ? Math.max(...v) : null; },
  });
}
