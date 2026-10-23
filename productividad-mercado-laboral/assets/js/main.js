/* ============================================================================
   main.js - boot
   ============================================================================
   Starts the router, loads the two files every module needs (the constants and
   the precomputed label casing), and mounts a topic module on demand.

   Modules are loaded with a dynamic import() keyed on the route, so opening
   the landing downloads no module code and no module data. In the Shiny app
   every topic's data was in memory before the first page was served.
   ========================================================================= */

import { startRouter, startNavMenu, onRoute, TOPICS, parseSelection,
         writeSelection } from "./core/router.js";
import { startDrawers } from "./ui/drawers.js";
import { openDb } from "./data/table.js";
import * as format from "./core/format.js";

const db = openDb("data/");
const root = document.getElementById("topic-root");

/* One loader per topic. The value is a function so the import is not issued
   until the route is actually visited. */
const MODULES = {
  labor:   () => import("./modules/nonsalary/index.js"),
  minwage: () => import("./modules/minwage/index.js"),
  firing:  () => import("./modules/firing/index.js"),
  btax:    () => import("./modules/btax/index.js"),
};

const mounted = new Map();   // topic -> the module's instance
let booted = null;

async function boot() {
  const [constants, labels] = await Promise.all([
    db.constants(),
    db.json("labels.json"),
  ]);
  format.init(constants, labels);
  return { constants, labels };
}

function placeholder(topic, detail) {
  /* Reuses the app's own "not implemented" shape rather than inventing a new
     one: topic_under_construction_ui() in tabs/ui/topic_template.R. */
  root.innerHTML = `
    <section class="topic-template-page under-construction-page">
      <div class="topic-template-header">
        <span class="topic-status-pill">Not yet ported</span>
        <h1 class="topic-title">${topic}</h1>
        <p class="topic-subtitle">${detail}</p>
      </div>
    </section>`;
}

async function showTopic(topic) {
  if (!TOPICS.includes(topic)) return;

  booted ??= boot();
  await booted;

  /* A module already mounted keeps its own DOM and its own state -- switching
     away and back does not reset the view. The Shiny app achieved the same
     thing by calling callModule() exactly once per topic and never
     unmounting; here the module simply stays in the map. */
  for (const [name, inst] of mounted) {
    if (inst.el) inst.el.hidden = name !== topic;
  }
  if (mounted.has(topic)) {
    const inst = mounted.get(topic);
    /* A link pasted while the module is already mounted still has to land on
       what it names. */
    const sel = parseSelection();
    if (Object.keys(sel).length && inst.store) await inst.store.set(sel);
    inst.onShow?.();
    return;
  }

  const load = MODULES[topic];
  if (!load) return;

  let mod;
  try {
    mod = await load();
  } catch (err) {
    /* Phases 3-6 add these one at a time, so a missing module is an expected
       state during the port rather than a crash. */
    console.warn(`module "${topic}" is not available yet:`, err);
    placeholder(topic, "This module has not been ported to the static site yet.");
    return;
  }

  const el = document.createElement("div");
  root.appendChild(el);
  /* The selection in the URL, so a shared link opens on what it names. A
     module reads what it recognises and ignores the rest. */
  const inst = await mod.mount({ el, db, format, topic,
                                 selection: parseSelection(),
                                 persist: (view, fields) =>
                                   writeSelection(topic, view, fields) });
  inst.el = el;
  mounted.set(topic, inst);
  for (const [name, other] of mounted) {
    if (other.el) other.el.hidden = name !== topic;
  }
}

startDrawers();
startNavMenu();
onRoute((route) => {
  if (route === "landing") {
    for (const inst of mounted.values()) if (inst.el) inst.el.hidden = true;
    return;
  }
  showTopic(route);
});
startRouter();

/* The handle dev/measure_charts.R drives the site through. `setState` resolves
   after the re-render has settled, which is what replaces the harness's tuned
   Sys.sleep() per interaction. */
window.__app = {
  db,
  format,
  module: (topic) => mounted.get(topic),
  /* Resolves once the module has finished whatever render is in flight. The
     store coalesces renders, so this returns the pending promise when there is
     one and schedules a no-op render otherwise -- either way it is "the DOM is
     settled".

     The chart harness needs it because a real DOM click (a pill, a flag) is
     fire-and-forget: the handler calls store.set() and nothing awaits the
     promise. Without this the harness clicked a category and then immediately
     clicked a breakdown pill that had not re-rendered yet, which measured
     figures mid-transition under the wrong state name -- visible as two runs
     reporting different check counts for the same sweep. */
  settle: async (topic) => {
    const inst = mounted.get(topic);
    if (!inst) return null;
    return inst.store.render();
  },
  /* Resolves once `topic` is mounted and has painted once. The chart harness
     awaits this instead of sleeping for a fixed number of seconds. */
  ready: async (topic) => {
    await showTopic(topic);
    const inst = mounted.get(topic);
    if (!inst) throw new Error(`module "${topic}" did not mount`);
    return inst.store.render();
  },
  setState: async (topic, patch) => {
    const inst = mounted.get(topic);
    if (!inst) throw new Error(`module "${topic}" is not mounted`);
    return inst.store.set(patch);
  },
};
