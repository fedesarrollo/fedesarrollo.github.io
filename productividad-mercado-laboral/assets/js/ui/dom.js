/* ============================================================================
   dom.js - the element builder the UI helpers are written against
   ============================================================================
   Stands in for htmltools' tags$*(). Deliberately tiny: the port needs element
   construction and nothing else -- no reactivity, no diffing, no templates.

   `h()` builds real nodes rather than HTML strings, so text content cannot be
   an injection vector. Where the port genuinely has to insert markup -- the
   pre-sliced regulation fragments, which ARE HTML and come from the build step
   -- it goes through `raw()`, which is the one place innerHTML is used and is
   named so it stands out in review.
   ========================================================================= */

/* h("div.labor-filter-bar", {role: "group"}, child, child, …)
   The tag string takes an optional `.class.class` suffix, which keeps the call
   sites readable where the class list is the whole point -- which, in CSS
   carried over from another application, is most of them. */
export function h(spec, attrs = null, ...children) {
  const [tag, ...classes] = String(spec).split(".");
  const el = document.createElement(tag || "div");
  if (classes.length) el.className = classes.join(" ");

  if (attrs && (typeof attrs !== "object" || attrs.nodeType || Array.isArray(attrs))) {
    children.unshift(attrs);
    attrs = null;
  }

  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") { el.className = [el.className, v].filter(Boolean).join(" "); }
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === "html") el.innerHTML = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }

  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) { append(el, c); continue; }
    el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

/* Trusted markup from the build step. The ONLY innerHTML in the UI layer. */
export function raw(markup, spec = "div") {
  return h(spec, { html: markup });
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/* Replace an element's children in one go. Used by every re-render. */
export function fill(el, ...children) {
  clear(el);
  return append(el, children);
}
