/* ============================================================================
   store.js - the per-view state container
   ============================================================================
   Replaces the scattered `reactiveVal`s of the Shiny modules (init.R:142-155
   declares eight for non-salary alone, plus an `ns_variables` reactiveValues).

   TWO DELIBERATE DIFFERENCES from the original, both fixing a known hazard
   rather than reproducing it:

   1. ONE `currentTable` PER VIEW, set by the render. In the R app the CSV
      download reads `ns_variables$df_final`, which is assigned from about
      twenty different branches of plots.R -- so what you downloaded depended
      on which branch happened to run last. Here the render returns the frame
      it drew and the store holds that one value, so the download cannot
      disagree with the chart.

   2. `set()` RETURNS A PROMISE that resolves after the re-render has settled.
      That is what lets dev/measure_charts.R drive the site with
      `await __app.setState(...)` instead of `Shiny.setInputValue` followed by
      a tuned `Sys.sleep(6)` -- turning a ~25-minute sweep into under a minute.
   ========================================================================= */

export function createStore(defaults_, { onRender, normalize = (s) => s } = {}) {
  let state = normalize({ ...defaults_ });
  let currentTable = null;
  let pending = null;
  const subscribers = new Set();

  /* Renders are coalesced into a microtask-plus-frame, so setting three
     filters in a row paints once. The Shiny original debounced the plot by
     250 ms (plots.R:3582) for the same reason, except there the delay was
     covering a network round trip. */
  /* A frame, OR 50ms, whichever comes first. requestAnimationFrame alone is
     the right signal in a visible tab -- it aligns the render with a paint --
     but a BACKGROUNDED tab is throttled or stops firing it entirely, and a
     promise chained on it then never resolves. That is not only a test
     problem: a reader who switches tabs mid-click would leave a render
     permanently pending and every later set() would wait on it.

     It showed up first in the chart harness, whose settle() call hung until
     Chromote gave up on the evaluate. */
  const nextFrame = () => new Promise((resolve) => {
    let done = false;
    const fire = () => { if (!done) { done = true; resolve(); } };
    requestAnimationFrame(fire);
    setTimeout(fire, 50);
  });

  const schedule = () => {
    if (pending) return pending;
    pending = (async () => {
      await nextFrame();
      pending = null;
      try {
        const result = await onRender(state, api);
        if (result && result.table !== undefined) currentTable = result.table;
      } finally {
        for (const fn of subscribers) fn(state);
      }
      /* One more frame, so plotly's own relayout passes (thirteen
         auto-margined axes in the non-salary subplots) have run before a
         caller that awaited this measures anything. */
      await nextFrame();
      return state;
    })();
    return pending;
  };

  /* The normalised defaults, kept so a caller can tell which fields are at
     their default value -- which is how the URL stays short: a selection equal
     to the default is left out of it. */
  const defaults = normalize({ ...defaults_ });

  const api = {
    get: () => state,
    defaults: () => defaults,

    /* Patch the state and re-render. Returns a promise resolving once the
       paint has settled. A patch that changes nothing still resolves, but does
       not re-render -- which is what keeps a repeated click on an already
       active pill from redrawing the chart. */
    set(patch) {
      const next = normalize({ ...state, ...patch });
      let changed = false;
      for (const k of Object.keys(next)) {
        if (!same(next[k], state[k])) { changed = true; break; }
      }
      for (const k of Object.keys(state)) {
        if (!(k in next)) { changed = true; break; }
      }
      state = next;
      return changed ? schedule() : Promise.resolve(state);
    },

    /* Force a render without changing anything (first mount, or a resize). */
    render: () => schedule(),

    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },

    /* The frame the current chart was drawn from -- what the CSV download
       serves. See note 1 above. */
    table: () => currentTable,
  };

  return api;
}

/* Shallow equality, with arrays compared element-wise: the wage selection is
   an array of level codes, and comparing it by reference would re-render on
   every click. */
function same(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return false;
}
