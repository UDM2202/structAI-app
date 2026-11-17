// Two span continuous beam under a single moving point load.
//
// Both spans have length L and constant EI. With the load P at distance a
// from the outer support of the loaded span, the three moment equation gives
// the hogging moment over the middle support directly:
//
//   M_B = -P a (L^2 - a^2) / (4 L^2)
//
// Reactions follow from statics. With only point loads the bending moment
// diagram is piecewise linear and the shear diagram is piecewise constant,
// so both are drawn exactly from a handful of ordinates.
//
// This file has no React or DOM code, so it can be unit tested on its own.

export const SPAN = 6; // m, each span
export const LOAD = 100; // kN
export const TOTAL = 2 * SPAN;

// Drawing geometry in SVG user units. The SVG viewBox is 560 x 362.
export const VIEW = { width: 560, height: 362 };
export const X0 = 40; // support A
export const X1 = 520; // support C
export const PX_PER_M = (X1 - X0) / TOTAL;
export const BMD_BASE = 204;
export const BMD_SCALE = 0.34; // px per kNm, sagging drawn downward
export const SFD_BASE = 320;
export const SFD_SCALE = 0.3; // px per kN

export const toPx = (m) => X0 + m * PX_PER_M;
export const toMetres = (px) => (px - X0) / PX_PER_M;
export const clamp = (x) => Math.min(TOTAL, Math.max(0, x));

/** Reactions and key moments for the load at x metres from A (0..12). */
export function solveBeam(x) {
  const mirrored = x > SPAN;
  const a = mirrored ? TOTAL - x : x;

  const mB = (-LOAD * a * (SPAN * SPAN - a * a)) / (4 * SPAN * SPAN);
  const rNear = (LOAD * (SPAN - a)) / SPAN + mB / SPAN; // outer support, loaded span
  const rFar = mB / SPAN; // outer support, unloaded span (negative = hold down)
  const rB = LOAD - rNear - rFar;

  return {
    rA: mirrored ? rFar : rNear,
    rB,
    rC: mirrored ? rNear : rFar,
    mB,
    mSpan: rNear * a, // sagging moment under the load
  };
}

/** Everything the figure needs to draw itself for the load at x metres. */
export function buildFigure(x) {
  const s = solveBeam(x);
  const xp = toPx(x);
  const xB = toPx(SPAN);
  const f = (v) => v.toFixed(1);

  const yM = (m) => f(BMD_BASE + m * BMD_SCALE);
  const underLoad = `L${f(xp)} ${yM(s.mSpan)}`;
  const overSupport = `L${xB} ${yM(s.mB)}`;
  const bmd = `M${X0} ${BMD_BASE}${x <= SPAN ? underLoad + overSupport : overSupport + underLoad}L${X1} ${BMD_BASE}Z`;

  const yV = (v) => f(SFD_BASE - v * SFD_SCALE);
  const loadFirst = x <= SPAN;
  const v1 = s.rA;
  const v2 = loadFirst ? v1 - LOAD : v1 + s.rB;
  const v3 = -s.rC;
  const xMid = loadFirst ? xp : xB;
  const xLast = loadFirst ? xB : xp;
  const sfd = `M${X0} ${SFD_BASE}V${yV(v1)}H${f(xMid)}V${yV(v2)}H${f(xLast)}V${yV(v3)}H${X1}V${SFD_BASE}Z`;

  const keep = (lo, hi, v) => Math.min(Math.max(v, lo), hi);

  return {
    results: s,
    arrowX: xp,
    loadLabelX: keep(76, 484, xp),
    bmd,
    sfd,
    spanLabel:
      s.mSpan > 0.5
        ? { x: keep(64, 496, xp), y: BMD_BASE + s.mSpan * BMD_SCALE + 14, text: fmt(s.mSpan) }
        : null,
    supportLabel:
      s.mB < -0.5 ? { x: xB, y: BMD_BASE + s.mB * BMD_SCALE - 6, text: fmt(s.mB) } : null,
  };
}

/** One decimal place, with tiny values shown as 0.0 rather than -0.0. */
export const fmt = (v, d = 1) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(d);
