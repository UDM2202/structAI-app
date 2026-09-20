# backend/services/column_frame_bridge.py
"""
Builds a sub-frame from a ColumnDesignRequest and returns the first-order end
moments the column engine expects.

This exists so the user supplies building geometry and loads, never design
actions. The engineer's note was blunt about it: "The moment here should be
calculated by the engine. If they have the moment, they won't come to the app."

Nothing here touches the column engine. It produces the same M01/M02
dictionaries the engine already consumes, so the engine's verification against
the published worked examples is unaffected.

Verified against Engr Eazy, Reinforced Concrete Design, column C3 p55-59:
the sub-frame reproduces Mx = 31.08 kNm and My = 1.225 kNm exactly.
"""

from typing import Dict, List, Tuple

from engine.column_subframe import (
    SubFrameBeam, SubFrameColumn, SubFrameJoint, SubFrameResult, analyse,
)


def _floor_q_uls(floor, gamma_G: float, gamma_Q: float, concrete_density: float) -> Tuple[float, float, float]:
    """Slab load per m2: (Gk, Qk, ULS)."""
    gk = (floor.slab_thickness_m * concrete_density
          + floor.finishes_kN_per_m2
          + floor.services_kN_per_m2
          + floor.partitions_kN_per_m2)
    qk = floor.imposed_override_kN_per_m2
    if qk is None:
        from engine.column_engine import live_load_for_use
        qk = live_load_for_use(floor.building_use)
    return gk, qk, gamma_G * gk + gamma_Q * qk


def _beam_udl(q_uls: float, tributary_width_m: float, beam,
              concrete_density: float, masonry_density: float,
              storey_height_m: float, gamma_G: float) -> float:
    """
    Load per metre on one beam: its slab share, its own weight, and any wall.

    The slab share uses the tributary width measured PERPENDICULAR to the
    beam, so a beam spanning in x carries the y-direction tributary width.
    """
    slab = q_uls * tributary_width_m
    self_wt = gamma_G * beam.width_m * beam.depth_m * concrete_density
    wall = 0.0
    if beam.wall.present:
        density = beam.wall.density_kN_per_m3 or masonry_density
        clear_h = max(storey_height_m - beam.depth_m, 0.0)
        wall = gamma_G * beam.wall.thickness_m * clear_h * density * (1.0 - beam.wall.opening_ratio)
    return slab + self_wt + wall


def level_names(n_typical: int) -> List[str]:
    """Top down: Roof, then Typical_Floor_n ... Typical_Floor_1."""
    return ["Roof"] + [f"Typical_Floor_{i}" for i in range(n_typical, 0, -1)]


def build_subframe(req) -> Tuple[SubFrameResult, Dict[str, dict]]:
    """
    Assemble and solve the sub-frame for every level of the request.

    Returns (result, trace) where trace carries the per-level beam loads and
    fixed-end moments for the report, so the derivation is auditable rather
    than a number appearing from nowhere.
    """
    g, m, fa = req.geometry, req.materials, req.factors
    rho_c = m.concrete_density_kN_per_m3
    rho_w = m.masonry_density_kN_per_m3
    H = g.storey_height_m

    tx = 0.5 * (g.left_x_m + g.right_x_m)      # tributary width in x
    ty = 0.5 * (g.top_y_m + g.bottom_y_m)      # tributary width in y

    column = SubFrameColumn(b_mm=g.b_mm, h_mm=g.h_mm)
    names = level_names(req.number_of_typical_floors)

    def col_at(level_name):
        """The column section in the storey BELOW the named joint."""
        sp = (req.levels or {}).get(level_name)
        if sp is None or (sp.b_mm is None and sp.h_mm is None):
            return column
        return SubFrameColumn(b_mm=sp.b_mm or g.b_mm, h_mm=sp.h_mm or g.h_mm)

    def floor_at(level_name):
        sp = (req.levels or {}).get(level_name)
        if sp is not None and sp.floor is not None:
            return sp.floor
        return req.roof_floor if level_name == "Roof" else req.typical_floor

    joints: List[SubFrameJoint] = []
    trace: Dict[str, dict] = {}

    for idx, name in enumerate(names):
        floor = floor_at(name)
        gk, qk, q_uls = _floor_q_uls(floor, fa.gamma_G, fa.gamma_Q, rho_c)

        # x-direction beams carry slab over the y tributary width, and vice versa
        w_x = _beam_udl(q_uls, ty, floor.beam_x, rho_c, rho_w, H, fa.gamma_G)
        w_y = _beam_udl(q_uls, tx, floor.beam_y, rho_c, rho_w, H, fa.gamma_G)

        def bx(span_m):
            return SubFrameBeam(span_m=span_m, width_m=floor.beam_x.width_m,
                                depth_m=floor.beam_x.depth_m, udl_kN_per_m=w_x) if span_m > 0 else None

        def by(span_m):
            return SubFrameBeam(span_m=span_m, width_m=floor.beam_y.width_m,
                                depth_m=floor.beam_y.depth_m, udl_kN_per_m=w_y) if span_m > 0 else None

        # No column continues above the roof, so the roof joint's whole
        # out-of-balance moment goes into the column below it.
        joints.append(SubFrameJoint(
            level=name,
            beam_x_a=bx(g.left_x_m), beam_x_b=bx(g.right_x_m),
            beam_y_a=by(g.top_y_m), beam_y_b=by(g.bottom_y_m),
            height_above_m=0.0 if idx == 0 else H,
            height_below_m=H,
            # Above this joint sits the storey named by the level above it;
            # below sits this level's own storey. Where the section steps,
            # the two stiffnesses differ and the split changes.
            column_above=None if idx == 0 else col_at(names[idx - 1]),
            column_below=col_at(name),
        ))
        trace[name] = {"Gk_kN_m2": round(gk, 3), "Qk_kN_m2": round(qk, 3),
                       "q_uls_kN_m2": round(q_uls, 3),
                       "w_x_kN_m": round(w_x, 3), "w_y_kN_m": round(w_y, 3),
                       "tributary_x_m": round(tx, 3), "tributary_y_m": round(ty, 3)}

    res = analyse(joints, column,
                  base_fixed=req.frame.base_fixed,
                  cracked_beams=req.frame.cracked_beam_stiffness)

    for j in res.joints:
        trace.setdefault(j.level, {}).setdefault("joints", {})[j.axis] = {
            "fem_a": round(j.fem_a, 3), "fem_b": round(j.fem_b, 3),
            "out_of_balance": round(j.out_of_balance, 3),
            "K_beam_a": j.K_beam_a, "K_beam_b": j.K_beam_b,
            "K_col_above": j.K_col_above, "K_col_below": j.K_col_below,
            "K_total": j.K_total,
            "M_col_above": round(j.M_col_above, 3),
            "M_col_below": round(j.M_col_below, 3),
        }
    return res, trace


def subframe_report(res: SubFrameResult, trace: Dict[str, dict]) -> List[dict]:
    """Report rows showing how each level's moments were derived."""
    R = lambda ref, calc, out: {"reference": ref, "calculation": calc, "output": str(out)}
    rows = [
        R("Method", "Simplified sub-frame. Beams framing into a joint carry fixed end "
                    "moments wL^2/12. Any out-of-balance is shared between the members "
                    "at that joint in proportion to stiffness K = I/L.", "assembled"),
        R("Distribution", "M_col = dM x K_col / (K_col,above + K_col,below + K_beam,a + K_beam,b)",
          "per joint, per axis"),
        R("Consequence", "Equal spans carrying equal load give dM = 0 and therefore no "
                         "column moment. The design then falls back on minimum eccentricity.",
          "by construction"),
    ]
    for level, t in trace.items():
        if "w_x_kN_m" in t:
            rows.append(R(f"{level} -- slab", f"Gk = {t['Gk_kN_m2']:.3f}, Qk = {t['Qk_kN_m2']:.3f} kN/m2",
                          f"q_uls = {t['q_uls_kN_m2']:.3f} kN/m2"))
            rows.append(R(f"{level} -- beam loads",
                          f"w_x = q_uls x ty + self wt + wall = {t['q_uls_kN_m2']:.3f} x {t['tributary_y_m']:.3f} + ...; "
                          f"w_y uses tx = {t['tributary_x_m']:.3f}",
                          f"w_x = {t['w_x_kN_m']:.3f}, w_y = {t['w_y_kN_m']:.3f} kN/m"))
        for axis, j in (t.get("joints") or {}).items():
            rows.append(R(f"{level} -- {axis} FEM",
                          f"FEM_a = {j['fem_a']:.3f}, FEM_b = {j['fem_b']:.3f} kNm",
                          f"dM = {j['out_of_balance']:.3f} kNm"))
            rows.append(R(f"{level} -- {axis} share",
                          f"K_col,below/K_total = {j['K_col_below']:.6e}/{j['K_total']:.6e}",
                          f"M = {j['M_col_below']:.3f} kNm"))
    for n in res.notes:
        rows.append(R("Note", n, ""))
    return rows