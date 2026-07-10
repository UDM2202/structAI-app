"""
SDH CONTINUOUS BEAM DESIGN ENGINE — structured, FEM (returns data, not print).
Faithful consolidation of the user's BEAM_FULL.txt (EC2), replacing coefficient
methods with proper stiffness analysis:
  element k = (EI/L)[[4,2],[2,4]] ; fixed-end load f = [-wL^2/12, +wL^2/12]
  assemble global K, F ; solve theta = K^-1 F ; member moments m = k.theta - f
  support hogging = |interior end moments| ; span sagging from equilibrium.
Hogging designed rectangular; sagging designed as T-beam (EC2 5.3.2.1).
Validated against the source 5-span worked example.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List
import math
import numpy as np


def area_bar(dia_mm, number=1):
    return number * math.pi * dia_mm ** 2 / 4


BAR_OPTIONS = [(2, 12), (2, 14), (2, 16), (2, 20), (3, 16), (3, 20),
               (4, 16), (4, 20), (5, 20), (4, 25), (5, 25), (6, 25)]


def choose_bars(As_req):
    for n, dia in BAR_OPTIONS:
        A = area_bar(dia, n)
        if A >= As_req:
            return n, dia, A
    n, dia = BAR_OPTIONS[-1]
    return n, dia, area_bar(dia, n)


@dataclass
class ContinuousBeamInput:
    spans_m: List[float] = field(default_factory=lambda: [4.0, 5.0, 4.5, 4.2, 6.0])
    slab_areas_m2: List[float] = field(default_factory=lambda: [8.50, 14.17, 11.21, 9.55, 17.00])
    bw_mm: float = 225.0
    h_mm: float = 450.0
    slab_thickness_mm: float = 160.0
    cover_mm: float = 25.0
    link_dia_mm: float = 10.0
    assumed_main_bar_mm: float = 20.0
    fck: float = 30.0
    fyk: float = 500.0
    gamma_c: float = 1.50
    gamma_s: float = 1.15
    Ecm_Nmm2: float = 33000.0
    slab_self_weight: float = 4.0
    finishes: float = 1.0
    services: float = 0.5
    partitions: float = 1.0
    imposed: float = 2.0
    gamma_g: float = 1.35
    gamma_q: float = 1.50
    beam_self_weight_factored: float = 3.417
    wall_load_factored: float = 12.150
    left_adjacent_spacing_m: float = 3.30
    right_adjacent_spacing_m: float = 3.30
    deflection_N_basic: float = 20.35
    deflection_K: float = 1.30
    deflection_F1: float = 0.80
    deflection_F2: float = 1.00
    deflection_F3: float = 1.069
    span_loads_override: list = None      # optional: explicit per-span factored UDL (kN/m); bypasses slab-area take-down


def design_continuous_beam(d: ContinuousBeamInput) -> dict:
    # --- loads ---
    factored = {
        "slab_self_weight": d.slab_self_weight * d.gamma_g,
        "finishes": d.finishes * d.gamma_g,
        "services": d.services * d.gamma_g,
        "partitions": d.partitions * d.gamma_g,
        "imposed": d.imposed * d.gamma_q,
    }
    trib = [a / s for a, s in zip(d.slab_areas_m2, d.spans_m)]
    span_loads = []
    if d.span_loads_override is not None and len(d.span_loads_override) == len(d.spans_m):
        # explicit per-span factored UDLs supplied by the caller (live per-span loads)
        span_loads = [float(w) for w in d.span_loads_override]
    else:
        for tw in trib:
            total = (factored["slab_self_weight"] * tw + factored["finishes"] * tw +
                     factored["services"] * tw + factored["partitions"] * tw +
                     factored["imposed"] * tw + d.beam_self_weight_factored + d.wall_load_factored)
            span_loads.append(total)

    # --- section ---
    b_m, h_m = d.bw_mm / 1000, d.h_mm / 1000
    I_m4 = b_m * h_m ** 3 / 12
    EI = d.Ecm_Nmm2 * 1000 * I_m4
    d_mm = d.h_mm - d.cover_mm - d.link_dia_mm - d.assumed_main_bar_mm / 2

    # --- FEM ---
    spans = d.spans_m
    n_nodes = len(spans) + 1
    K = np.zeros((n_nodes, n_nodes))
    F = np.zeros(n_nodes)
    for e, (L, w) in enumerate(zip(spans, span_loads)):
        k = (EI / L) * np.array([[4.0, 2.0], [2.0, 4.0]])
        f = np.array([-w * L ** 2 / 12, w * L ** 2 / 12])
        K[e:e + 2, e:e + 2] += k
        F[e:e + 2] += f
    theta = np.linalg.solve(K, F)

    # --- member moments ---
    end_moments = []
    for e, (L, w) in enumerate(zip(spans, span_loads)):
        k = (EI / L) * np.array([[4.0, 2.0], [2.0, 4.0]])
        f = np.array([-w * L ** 2 / 12, w * L ** 2 / 12])
        m = k @ theta[e:e + 2] - f
        end_moments.append(m)

    # support hogging = |right end moment| of each span except the last node's own
    support_moments = {}
    for e in range(len(spans) - 1):
        support_moments[f"S{e + 2}"] = float(abs(end_moments[e][1]))

    # span sagging from equilibrium
    span_moments = {}
    span_details = []
    for e, (L, w, mp) in enumerate(zip(spans, span_loads, end_moments), start=1):
        M_left = -abs(mp[0]); M_right = -abs(mp[1])
        R_left = (w * L) / 2 - (M_right - M_left) / L
        x = R_left / w if w else 0
        M_max = M_left + R_left * x - (w * x ** 2) / 2
        span_moments[f"Span {e}"] = float(max(M_max, 0.0))
        span_details.append({"span": e, "L_m": L, "w_kN_m": round(w, 3),
                             "M_left": round(M_left, 3), "M_right": round(M_right, 3),
                             "R_left": round(R_left, 3), "x_m": round(x, 3),
                             "M_sag": round(max(M_max, 0.0), 3)})

    # --- effective flange (per span) ---
    beff = {}
    for i, L in enumerate(spans, start=1):
        l0 = 0.85 * L if (i == 1 or i == len(spans)) else 0.70 * L
        beff1 = min(0.2 * l0, d.left_adjacent_spacing_m / 2)
        beff2 = min(0.2 * l0, d.right_adjacent_spacing_m / 2)
        beff[f"Span {i}"] = (b_m + beff1 + beff2) * 1000

    # --- flexure ---
    def flex(M, b):
        M_Nmm = M * 1e6
        Kf = M_Nmm / (b * d_mm ** 2 * d.fck)
        z = min(d_mm * (0.5 + math.sqrt(max(0.25 - Kf / 0.9, 0))), 0.95 * d_mm)
        As_req = M_Nmm / (0.87 * d.fyk * z)
        return Kf, z, As_req

    fctm = 0.3 * d.fck ** (2 / 3) if d.fck <= 50 else 2.12
    As_min = max(0.26 * fctm / d.fyk * d.bw_mm * d_mm, 0.0013 * d.bw_mm * d_mm)

    support_design = {}
    for s, M in support_moments.items():
        Kf, z, As_req = flex(M, d.bw_mm)                       # hogging = rectangular
        As_des = max(As_req, As_min)
        n, dia, As_prov = choose_bars(As_des)
        support_design[s] = {"M_kNm": round(M, 3), "K": round(Kf, 5), "z_mm": round(z, 1),
                             "As_req_mm2": round(As_req, 1), "As_design_mm2": round(As_des, 1),
                             "bars": f"{n}Y{dia}", "As_provided_mm2": round(As_prov, 1),
                             "status": "OK" if As_prov >= As_des else "NOT OK"}
    span_design = {}
    for sp, M in span_moments.items():
        b_eff = beff[sp]
        Kf, z, As_req = flex(M, b_eff)                         # sagging = T-beam
        As_des = max(As_req, As_min)
        n, dia, As_prov = choose_bars(As_des)
        x_approx = As_req * 0.87 * d.fyk / (0.8 * d.fck * b_eff)
        span_design[sp] = {"M_kNm": round(M, 3), "beff_mm": round(b_eff, 1), "K": round(Kf, 5),
                           "z_mm": round(z, 1), "x_mm": round(x_approx, 1),
                           "As_req_mm2": round(As_req, 1), "As_design_mm2": round(As_des, 1),
                           "bars": f"{n}Y{dia}", "As_provided_mm2": round(As_prov, 1),
                           "neutral_axis_in_flange": bool(x_approx <= d.slab_thickness_mm),
                           "status": "OK" if bool(As_prov >= As_des) else "NOT OK"}

    # --- shear ---
    shear = {}
    for e, (L, w, mp) in enumerate(zip(spans, span_loads, end_moments), start=1):
        M_left = -abs(mp[0]); M_right = -abs(mp[1])
        R_left = (w * L) / 2 - (M_right - M_left) / L
        R_right = w * L - R_left
        shear[f"Span {e}"] = float(round(max(abs(R_left), abs(R_right)), 3))
    bw = d.bw_mm
    C_Rdc = 0.18 / d.gamma_c
    k_sh = min(1 + math.sqrt(200 / d_mm), 2.0)
    max_As = max(item["As_provided_mm2"] for item in span_design.values())
    rho_l = min(max_As / (bw * d_mm), 0.02)
    VRdc = max(C_Rdc * k_sh * (100 * rho_l * d.fck) ** (1 / 3) * bw * d_mm,
               0.035 * k_sh ** 1.5 * math.sqrt(d.fck) * bw * d_mm) / 1000
    max_VEd = max(shear.values())
    shear_ok = bool(max_VEd <= VRdc)

    # --- deflection (uses example factors) ---
    gov_span = max(spans)
    actual_Ld = gov_span * 1000 / d_mm
    allowable_Ld = d.deflection_N_basic * d.deflection_K * d.deflection_F1 * d.deflection_F2 * d.deflection_F3
    defl_ok = actual_Ld <= allowable_Ld

    checks = {
        "flexure_supports": bool(all(v["status"] == "OK" for v in support_design.values())),
        "flexure_spans": bool(all(v["status"] == "OK" for v in span_design.values())),
        "shear": bool(shear_ok or (max_VEd / VRdc < 3.0 if VRdc else False)),
        "deflection": bool(defl_ok),
    }
    status = "PASS" if all(checks.values()) else "FAIL"

    max_hog = max(support_moments.values()) if support_moments else 0.0
    max_sag = max(span_moments.values()) if span_moments else 0.0

    R2 = lambda ref, calc, out: {"ref": ref, "calc": calc, "out": str(out)}
    report = [
        {"section": "3. Section / stiffness", "rows": [
            R2("I=bh^3/12", f"{d.bw_mm:.0f}x{d.h_mm:.0f}", f"{I_m4:.6e} m4"),
            R2("EI", f"Ecm={d.Ecm_Nmm2:.0f}", f"{EI:.1f} kNm2")]},
        {"section": "4. FEM analysis", "rows": [
            R2("Element k", "(EI/L)[[4,2],[2,4]]", f"{len(spans)} elements"),
            R2("Solve", "theta = K^-1 F", f"{n_nodes} joint rotations"),
            R2("theta", "rotations (rad)", ", ".join(f"{t:.3e}" for t in theta))]},
        {"section": "5. Moments", "rows": [
            R2("Support hogging", "|interior end moments|", f"max {max_hog:.2f} kNm"),
            R2("Span sagging", "from equilibrium", f"max {max_sag:.2f} kNm")]},
        {"section": "7. Flexure", "rows": [
            R2("Hogging", "rectangular section", f"{len(support_design)} supports"),
            R2("Sagging", "T-beam (beff)", f"{len(span_design)} spans"),
            R2("As,min", "0.26 fctm/fyk bw d", f"{As_min:.1f} mm2")]},
        {"section": "8. Shear", "rows": [
            R2("Max VEd", "span equilibrium", f"{max_VEd:.2f} kN"),
            R2("VRd,c", f"k={k_sh:.3f}", f"{VRdc:.2f} kN -> {'OK' if shear_ok else 'links required'}")]},
        {"section": "9. Deflection", "rows": [
            R2("Actual L/d", f"{gov_span*1000:.0f}/{d_mm:.0f}", f"{actual_Ld:.2f}"),
            R2("Allowable", "N*K*F1*F2*F3", f"{allowable_Ld:.2f} -> {'OK' if defl_ok else 'NOT OK'}")]},
    ]

    return {
        "status": status, "n_spans": len(spans),
        "loads": {"factored_strip": {k: round(v, 3) for k, v in factored.items()},
                  "tributary_widths_m": [round(t, 3) for t in trib],
                  "span_loads_kN_m": [round(s, 3) for s in span_loads]},
        "geometry": {"spans_m": spans, "bw_mm": d.bw_mm, "h_mm": d.h_mm, "d_eff_mm": round(d_mm, 1),
                     "slab_thickness_mm": d.slab_thickness_mm, "I_m4": I_m4, "EI_kNm2": round(EI, 1),
                     "cover_mm": d.cover_mm},
        "materials": {"fck": d.fck, "fyk": d.fyk, "Ecm": d.Ecm_Nmm2},
        "fem": {"theta_rad": [float(t) for t in theta],
                "end_moments": [[round(float(m[0]), 3), round(float(m[1]), 3)] for m in end_moments]},
        "moments": {"support_hogging": {k: round(v, 3) for k, v in support_moments.items()},
                    "span_sagging": {k: round(v, 3) for k, v in span_moments.items()},
                    "max_hogging_kNm": round(max_hog, 3), "max_sagging_kNm": round(max_sag, 3),
                    "span_details": span_details},
        "beff_mm": {k: round(v, 1) for k, v in beff.items()},
        "flexure": {"supports": support_design, "spans": span_design, "As_min_mm2": round(As_min, 1)},
        "shear": {"per_span_VEd_kN": shear, "max_VEd_kN": round(max_VEd, 3),
                  "VRdc_kN": round(VRdc, 3), "status": "OK" if shear_ok else "Links required"},
        "deflection": {"governing_span": f"Span {spans.index(gov_span)+1}", "actual_Ld": round(actual_Ld, 2),
                       "allowable_Ld": round(allowable_Ld, 2), "status": "OK" if defl_ok else "NOT OK"},
        "checks": checks,
        "report": report,
    }