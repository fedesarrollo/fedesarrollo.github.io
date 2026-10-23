/* ============================================================================
   ramp.js - R's colorRampPalette, for the ordered series ramps
   ============================================================================
   btax builds its bracket-schedule colours with
   `colorRampPalette(c(BTAX_BASE, FED_INK_PALE))(n)`, so the port needs the same
   interpolation or every multi-series schedule is a different set of colours.

   IT TRUNCATES, IT DOES NOT ROUND, and that is measured rather than assumed.
   R's colorRamp interpolates linearly in sRGB and hands the result to rgb(),
   which converts via as.integer -- i.e. floor. Checked against all four
   captured schedules: Brazil's five series come out
   #091C50 #32467B #5B70A7 #849AD2 #AEC5FE, and the third channel of step 1 is
   80 + 0.25 x 174 = 123.5, which the fixture gives as 0x7B = 123. Rounding
   half-up would give 124 and every intermediate colour would be one off.
   ========================================================================= */

function parseHex(hex) {
  const h = String(hex).replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16),
          parseInt(h.slice(4, 6), 16)];
}

function toHex([r, g, b]) {
  const two = (v) => v.toString(16).toUpperCase().padStart(2, "0");
  return `#${two(r)}${two(g)}${two(b)}`;
}

/* colorRampPalette(c(from, to))(n). n < 2 returns [from], matching R's
   behaviour of `max(length(series), 2)` at the call site. */
export function colorRamp(from, to, n) {
  const a = parseHex(from);
  const b = parseHex(to);
  if (n <= 1) return [toHex(a)];
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return toHex(a.map((v, k) => Math.floor(v + t * (b[k] - v))));
  });
}
