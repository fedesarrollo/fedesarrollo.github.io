/* ============================================================================
   router.js - the two routes, the header's active state, and the nav menu
   ============================================================================
   Replaces three things from the Shiny app:

     www/tab-history.js   80 lines that kept `?tab=` in sync with the browser's
                          back/forward by listening to Bootstrap's
                          `shown.bs.tab` AND watching each .tab-pane's class
                          with a MutationObserver, then .click()ing Shiny's
                          hidden tab anchor. The only file in the app that
                          needed jQuery, Bootstrap tab events and the .tab-pane
                          DOM simultaneously.
     server.r             the `topic_selected` observer and updateQueryString().
     www/header.js        setHeaderTopic() and the section-menu disclosure --
                          both already framework-free, and both ported as-is.

   HASH ROUTING, not paths: the built folder has to work from any subdirectory
   of the Fedesarrollo server without being told which, and from the local
   filesystem. A hash needs no server rewrite rule.

   Two details worth keeping from tab-history.js, because they are the parts
   that were actually load-bearing:
     - push vs replace. A user navigation PUSHES a history entry; replaying a
       popstate must not push another, or Back stops working.
     - `event.state` is preferred over re-reading the URL, with the URL as the
       fallback.
   ========================================================================= */

export const TOPICS = ["labor", "minwage", "firing", "btax"];

const listeners = new Set();
let current = null;

/* www/header.js:8, unchanged in substance. Clears `.active` from every topic
   link, sets it on the one that matches, and hides the nav on the landing
   unless the page opts in. */
export function setHeaderTopic(topic) {
  document.querySelectorAll(".header-topic-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.topic === topic);
    /* The nav is a tablist in effect; say which one is current. The Shiny
       version set no ARIA state here at all. */
    if (a.dataset.topic === topic) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const header = document.querySelector(".header");
  if (header) {
    header.classList.toggle("header-nav-hidden-on-landing",
                            topic === "landing" && !window.showHeaderNavOnLanding);
  }
}

/* Parse a location into a route. Accepts the hash form the site uses AND the
   old Shiny query string (`?tab=content&topic=labor`), so links that were
   shared while the app was on shinyapps.io still land in the right place. */
/* The state a topic carries in the URL, after the topic itself:
   `#/labor/within?category=payroll_taxes&country=COL`.

   WHY THIS EXISTS: the R app persisted only `?view=`, and only for one module,
   so a link to "Colombia, payroll taxes" could not be shared -- item 4 of
   CLAUDE.md's own *Still missing* list. A dashboard whose figures get cited in
   reports needs a link, not a set of instructions. It also makes the browser's
   Back button work WITHIN a module, which it did not before.

   Only fields a reader would want to share are carried, and a field equal to
   its default is left out, so the common URL stays `#/minwage`. */
export function parseSelection(loc = window.location) {
  const hash = loc.hash || "";
  const qmark = hash.indexOf("?");
  const parts = hash.replace(/^#\/?/, "").split("?")[0].split("/");
  const out = {};
  /* The segment after the topic, when present, is the view. */
  if (parts[1] === "across" || parts[1] === "within") out.view = parts[1];
  if (qmark >= 0) {
    for (const [k, v] of new URLSearchParams(hash.slice(qmark + 1))) {
      out[k] = v;
    }
  }
  return out;
}

/* Write a topic's shareable state into the hash, WITHOUT adding a history
   entry: a filter click is not a navigation, and pushing one per pill would
   make Back walk backwards through every click the reader made. The topic
   itself still pushes, so Back leaves the module as before. */
export function writeSelection(topic, view, fields = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== null && v !== undefined && v !== "") q.set(k, String(v));
  }
  const qs = q.toString();
  /* THE DEFAULT SELECTION KEEPS THE URL SHORT. With nothing to carry and the
     default view, the hash stays `#/labor` -- which is what the nav links and
     the landing cards produce, so the address bar does not rewrite itself the
     moment a module mounts. "across" is the default view in all four modules
     (none has a selection landing any more). */
  const bare = !qs && view === "across";
  const target = bare ? `#/${topic}` : `#/${topic}/${view}${qs ? `?${qs}` : ""}`;
  if (window.location.hash === target) return;
  history.replaceState({ route: topic }, "",
                       window.location.pathname + window.location.search + target);
}

export function parseRoute(loc = window.location) {
  const hash = (loc.hash || "").replace(/^#\/?/, "").split(/[/?]/)[0];
  if (TOPICS.includes(hash)) return hash;
  if (hash === "" || hash === "landing") {
    const q = new URLSearchParams(loc.search);
    const legacy = q.get("topic");
    if (TOPICS.includes(legacy)) return legacy;
    return "landing";
  }
  /* An unknown hash is not an error worth a blank page: the Shiny app fell
     back to "labor" for an unrecognised ?topic=, and so does this. */
  return "labor";
}

/* Show one pane and hide the other. `.tab-pane.active` is exactly what
   styles.css section 6 keys the full-height landing shell off, and its comment
   explains why `.active` has to be in that selector -- without it the rule
   would show the landing on every route. */
function showPane(route) {
  const pane = route === "landing" ? "landing" : "content";
  document.querySelectorAll(".tab-content > .tab-pane").forEach((el) => {
    el.classList.toggle("active", el.dataset.value === pane);
  });
  /* A hook for anything that needs to style by route without reaching back
     through the pane chain. */
  document.body.dataset.route = route;
}

function emit(route) {
  current = route;
  showPane(route);
  setHeaderTopic(route);
  for (const fn of listeners) fn(route);
}

export function onRoute(fn) {
  listeners.add(fn);
  if (current !== null) fn(current);
  return () => listeners.delete(fn);
}

export function currentRoute() { return current; }

/* Navigate programmatically. Setting the hash is enough -- the hashchange
   handler below is the single place a route is applied, so there is one code
   path whether the user clicked a link, pressed Back, or we called this. */
export function go(route) {
  const target = route === "landing" ? "#/" : `#/${route}`;
  if (parseRoute() === route) { emit(route); return; }
  window.location.hash = target;
}

export function startRouter() {
  window.addEventListener("hashchange", () => emit(parseRoute()));

  /* An old-style ?topic= link is normalised to a hash once, with replaceState
     so it does not leave a dead entry in the history. */
  const initial = parseRoute();
  if (!window.location.hash && initial !== "landing") {
    history.replaceState({ route: initial }, "",
                         `${window.location.pathname}#/${initial}`);
  }
  emit(initial);
}

/* ---- the section menu (www/header.js:53, ported as-is) -------------------- */
/* Under 1160px the topic nav collapses behind `.nav-toggle`. The click handler
   is delegated off `document` -- in the Shiny app that was necessary because
   Shiny re-rendered the links; here it is simply the cheapest way to catch
   "clicked outside". The resize threshold is 1160 to match the media query in
   styles.css (the comment there says "under 1100px", which the query itself
   does not agree with; 1160 is what the CSS actually does). */
const NAV_BREAKPOINT = 1160;

export function startNavMenu() {
  const nav = document.getElementById("topic-nav");
  const btn = document.getElementById("topic-nav-toggle");
  if (!nav || !btn) return;

  const setOpen = (open) => {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  };
  window.toggleTopicNav = () => setOpen(!nav.classList.contains("open"));
  window.closeTopicNav = () => setOpen(false);

  btn.addEventListener("click", () => window.toggleTopicNav());

  document.addEventListener("click", (e) => {
    if (!nav.classList.contains("open")) return;
    if (e.target.closest(".header-topic-link")) { setOpen(false); return; }
    if (!e.target.closest("#topic-nav") && !e.target.closest("#topic-nav-toggle")) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > NAV_BREAKPOINT) setOpen(false);
  });
}
