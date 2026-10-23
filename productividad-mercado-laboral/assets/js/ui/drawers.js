/* ============================================================================
   drawers.js - the Downloads and detail drawers
   ============================================================================
   Port of www/filter-drawer.js (27 lines of plain DOM, no Shiny, no jQuery --
   one of the few front-end files that needed no translation at all), plus the
   accessibility it was missing.

   WHAT IS CARRIED OVER VERBATIM:
     - `closeAll()` before opening. Three drawers exist per module and two of
       them slide in from the left, so opening one without closing the others
       would stack them in the same space.
     - Esc closes.
     - The `.open` class on both the drawer and its backdrop; all the motion
       and layout is in labor.css's `.filter-drawer` / `.detail-drawer` /
       `.filter-backdrop` rules, which are unchanged.

   WHAT IS ADDED, because the original had none of it:
     - a focus trap while a drawer is open,
     - focus returned to the toggle that opened it,
     - `aria-expanded` on the toggle and `aria-modal`/`role="dialog"` on the
       drawer.
   A drawer you can tab out of, behind a backdrop you cannot see past, is a
   keyboard dead end -- the content stays reachable but the user cannot tell
   where they are.

   IDS: the Shiny version was handed namespaced ids built by ns()
   (`minwage-across-detail_drawer`). The static modules build the same ids, so
   the two sub-views of a module stay independent exactly as before.
   ========================================================================= */

const FOCUSABLE = [
  "a[href]", "button:not([disabled])", "input:not([disabled])",
  "select:not([disabled])", "textarea:not([disabled])", '[tabindex]:not([tabindex="-1"])',
].join(",");

let openDrawer = null;      // the open drawer element
let openerEl = null;        // what to give focus back to

export function closeAll() {
  document.querySelectorAll(
    ".filter-drawer.open, .detail-drawer.open, .filter-backdrop.open"
  ).forEach((el) => el.classList.remove("open"));

  document.querySelectorAll('[data-drawer-toggle][aria-expanded="true"]')
    .forEach((el) => el.setAttribute("aria-expanded", "false"));

  const returnTo = openerEl;
  openDrawer = null;
  openerEl = null;
  if (returnTo && document.contains(returnTo)) returnTo.focus();
}

export function open(drawerId, backdropId, opener = null) {
  closeAll();
  const drawer = document.getElementById(drawerId);
  const backdrop = document.getElementById(backdropId);
  if (!drawer) return;

  drawer.classList.add("open");
  if (backdrop) backdrop.classList.add("open");
  openDrawer = drawer;
  openerEl = opener;
  if (opener) opener.setAttribute("aria-expanded", "true");

  /* Focus the first thing inside, falling back to the panel itself so the
     reader is at least inside the dialog. */
  const first = drawer.querySelector(FOCUSABLE);
  if (first) first.focus();
  else { drawer.setAttribute("tabindex", "-1"); drawer.focus(); }
}

export function close() { closeAll(); }

/* Wire up every drawer toggle and backdrop on the page. Delegated, so a module
   can render its drawers after this has run. */
export function startDrawers() {
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-drawer-toggle]");
    if (toggle) {
      e.preventDefault();
      const id = toggle.dataset.drawerToggle;
      const drawer = document.getElementById(id);
      if (drawer && drawer.classList.contains("open")) closeAll();
      else open(id, toggle.dataset.drawerBackdrop, toggle);
      return;
    }
    if (e.target.closest("[data-drawer-close]") ||
        e.target.classList.contains("filter-backdrop")) {
      e.preventDefault();
      closeAll();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!openDrawer) return;

    if (e.key === "Escape") { e.preventDefault(); closeAll(); return; }
    if (e.key !== "Tab") return;

    /* The trap. Without it, Tab walks out of the drawer and onto the page
       behind the backdrop, which is visually dimmed and not clickable -- the
       focus ring disappears into content the user cannot act on. */
    const items = [...openDrawer.querySelectorAll(FOCUSABLE)]
      .filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
}

/* Kept for parity with the names the Shiny markup called inline. Nothing in
   the static site uses them, but a hand-written onclick copied out of the old
   R code will still work rather than failing silently. */
window.filterDrawerOpen = (drawerId, backdropId) => open(drawerId, backdropId);
window.filterDrawerClose = closeAll;
