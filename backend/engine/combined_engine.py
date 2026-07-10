"""
SDH COMBINED PAD FOOTING DESIGN ENGINE — structured, N-column (returns data).

Faithful generalisation of the user's COMBINED_PAD_FOOTING.txt (EC2 + EC7).
The source handles 2 columns (P1,P2); this engine accepts a LIST of columns and
applies the SAME formulas over N columns:
  W   = sum(Pi)
  xR  = sum(Pi*xi) / W
  My_axial = sum( Pi*(xi - L/2) )
  longitudinal beam-on-linear-soil: integrate w(x)=B*q(x), subtract each Pi at xi
The N=2 case reproduces the source script's numbers exactly (validated).
N>=3 uses the same formulas extended — flagged for verification before real use.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List
import math


def bar_area(phi):
    return math.pi * phi ** 2 / 4.0


@dataclass
class ColumnLoad:
    P_kN: float
    x_m: float          # position from left edge
    Mx_kNm: float = 0.0
    My_kNm: float = 0.0
    label: str = "C"


@dataclass
class CombinedFootingInput:
    columns: List[ColumnLoad] = field(default_factory=list)
    footing_length_m: float = 1.870
    footing_width_m: float = 0.550
    footing_depth_mm: float = 400.0
    column_x_mm: float = 300.0
    column_y_mm: float = 300.0
    fck: float = 25.0
    fyk: float = 500.0
    gamma_c: float = 1.50
    gamma_s: float = 1.15
    allowable_bearing_kN_m2: float = 100.0
    cover_mm: float = 50.0
    bar_dia_mm: float = 12.0

    @staticmethod
    def two_column(P1_kN=72.967, P2_kN=24.987, column_spacing_m=0.820,
                   left_projection_m=0.550, P1_Mx=0.0, P1_My=0.0, P2_Mx=0.0, P2_My=0.0, **kw):
        """Convenience builder matching the source's 2-column defaults."""
        x1 = left_projection_m
        x2 = left_projection_m + column_spacing_m
        cols = [ColumnLoad(P1_kN, x1, P1_Mx, P1_My, "C1"),
                ColumnLoad(P2_kN, x2, P2_Mx, P2_My, "C2")]
        return CombinedFootingInput(columns=cols, **kw)


def _flexural(d, M_kNm, b_mm, d_eff_mm, label):
    M_Nmm = abs(M_kNm) * 1_000_000
    K = M_Nmm / (b_mm * d_eff_mm ** 2 * d.fck)
    z = d_eff_mm * (0.5 + math.sqrt(max(0.25 - K / 0.9, 0)))
    z = min(z, 0.95 * d_eff_mm)
    As_req = M_Nmm / (0.87 * d.fyk * z)
    fctm = 2.6 if d.fck <= 25 else 2.9
    As_min = max(0.26 * fctm / d.fyk * b_mm * d_eff_mm, 0.0013 * b_mm * d_eff_mm)
    As_design = max(As_req, As_min)
    Abar = bar_area(d.bar_dia_mm)
    spacing_raw = Abar * 1000 / As_design
    spacing = min(math.floor(spacing_raw / 25) * 25, 200)
    if spacing < 75:
        spacing = 75
    As_prov = Abar * 1000 / spacing
    return {"label": label, "M_kNm": round(abs(M_kNm), 3), "b_mm": round(b_mm, 1),
            "d_eff_mm": round(d_eff_mm, 1), "K": round(K, 5), "z_mm": round(z, 1),
            "As_req": round(As_req, 2), "As_min": round(As_min, 2), "As_design": round(As_design, 2),
            "bar_dia": d.bar_dia_mm, "spacing_mm": spacing, "As_provided": round(As_prov, 2),
            "status": "OK" if As_prov >= As_design else "NOT OK"}


def design_combined_footing(d: CombinedFootingInput) -> dict:
    L, B = d.footing_length_m, d.footing_width_m
    area = L * B
    cols = sorted(d.columns, key=lambda c: c.x_m)
    n = len(cols)

    total_mx = sum(c.Mx_kNm for c in cols)
    total_my_applied = sum(c.My_kNm for c in cols)
    if total_mx == 0 and total_my_applied == 0:
        load_case = "Axial"
    elif total_mx != 0 and total_my_applied != 0:
        load_case = "Biaxial"
    else:
        load_case = "Uniaxial"

    W = sum(c.P_kN for c in cols)
    centre_x, centre_y = L / 2, B / 2
    xR = sum(c.P_kN * c.x_m for c in cols) / W if W else 0.0
    axial_ecc_x = xR - centre_x

    My_from_axial = sum(c.P_kN * (c.x_m - centre_x) for c in cols)
    My_total = My_from_axial + total_my_applied
    Mx_total = total_mx
    ex = My_total / W if W else 0.0
    ey = Mx_total / W if W else 0.0

    q0 = W / area
    q1 = q0 * (1 + 6 * ex / L + 6 * ey / B)
    q2 = q0 * (1 + 6 * ex / L - 6 * ey / B)
    q3 = q0 * (1 - 6 * ex / L + 6 * ey / B)
    q4 = q0 * (1 - 6 * ex / L - 6 * ey / B)
    corners = {"c1": q1, "c2": q2, "c3": q3, "c4": q4}
    qmax, qmin = max(corners.values()), min(corners.values())
    bearing_ok = qmax <= d.allowable_bearing_kN_m2
    uplift_ok = qmin >= 0
    ecc_x_ok = abs(ex) <= L / 6
    ecc_y_ok = abs(ey) <= B / 6

    Iy = B * L ** 3 / 12

    def reaction_integral(x):
        return B * (q0 * x + My_total / Iy * ((x ** 2) / 2 - (L / 2) * x))

    def moment_integral(x):
        return B * (q0 * x ** 2 / 2 + My_total / Iy * (x ** 3 / 6 - L * x ** 2 / 4))

    def shear_at(x):
        V = reaction_integral(x)
        for c in cols:
            if x >= c.x_m:
                V -= c.P_kN
        return V

    def moment_at(x):
        M = moment_integral(x)
        for c in cols:
            if x >= c.x_m:
                M -= c.P_kN * (x - c.x_m)
        return M

    steps = 500
    diagram = []
    for i in range(steps + 1):
        x = L * i / steps
        diagram.append({"x": round(x, 4), "V": round(shear_at(x), 3), "M": round(moment_at(x), 3)})
    max_M, max_x = 0.0, 0.0
    for pt in diagram:
        if abs(pt["M"]) > abs(max_M):
            max_M, max_x = pt["M"], pt["x"]
    key_points = [0.0] + [c.x_m for c in cols] + [L]
    key_shear = {round(x, 3): round(shear_at(x), 3) for x in key_points}
    key_moment = {round(x, 3): round(moment_at(x), 3) for x in key_points}

    d_long = d.footing_depth_mm - d.cover_mm - d.bar_dia_mm / 2
    d_trans = d.footing_depth_mm - d.cover_mm - d.bar_dia_mm - d.bar_dia_mm / 2

    long_flex = _flexural(d, max_M, B * 1000, d_long, "longitudinal")
    proj_y = (B - d.column_y_mm / 1000) / 2
    M_trans = qmax * proj_y ** 2 / 2
    trans_flex = _flexural(d, M_trans, 1000, d_trans, "transverse")

    # one-way shear: critical sections d from the outer column faces (first & last)
    x_first, x_last = cols[0].x_m, cols[-1].x_m
    d_m = d_long / 1000
    crit_left = max(x_first - d_m, 0)
    crit_right = min(x_last + d_m, L)
    w_cons = qmax * B
    V_left = abs(w_cons * crit_left)
    V_right = abs(w_cons * (L - crit_right))
    VEd_sh = max(V_left, V_right)
    bw = B * 1000
    C_Rdc = 0.18 / d.gamma_c
    k = min(1 + math.sqrt(200 / d_long), 2.0)
    rho_l = 0.002
    VRdc = max(C_Rdc * k * (100 * rho_l * d.fck) ** (1 / 3) * bw * d_long,
              0.035 * k ** 1.5 * math.sqrt(d.fck) * bw * d_long) / 1000
    shear_status = "OK" if VEd_sh <= VRdc else "NOT OK"

    # punching around the heaviest column
    d_p = min(d_long, d_trans)
    d_pm = d_p / 1000
    cx, cy = d.column_x_mm / 1000, d.column_y_mm / 1000
    u1 = 2 * (cx + cy) + 4 * math.pi * d_pm
    A_inside = (cx + 4 * d_pm) * (cy + 4 * d_pm)
    worst = max(c.P_kN for c in cols)
    upward = qmax * A_inside
    VEd_p = max(worst - upward, 0.0)
    vEd = VEd_p * 1000 / (u1 * 1000 * d_p)
    kk = min(1 + math.sqrt(200 / d_p), 2.0)
    vRdc = max(C_Rdc * kk * (100 * rho_l * d.fck) ** (1 / 3), 0.035 * kk ** 1.5 * math.sqrt(d.fck))
    punch_status = "OK" if vEd <= vRdc else "NOT OK"

    checks = {"bearing": bearing_ok, "uplift": uplift_ok, "eccentricity_x": ecc_x_ok,
              "eccentricity_y": ecc_y_ok, "flexure_long": long_flex["status"] == "OK",
              "flexure_trans": trans_flex["status"] == "OK", "one_way_shear": shear_status == "OK",
              "punching": punch_status == "OK"}
    status = "PASS" if all(checks.values()) else "FAIL"

    util_bearing = qmax / d.allowable_bearing_kN_m2 if d.allowable_bearing_kN_m2 else 0
    util_punch = vEd / vRdc if vRdc else 0
    util_shear = VEd_sh / VRdc if VRdc else 0

    R = lambda ref, calc, out: {"ref": ref, "calc": calc, "out": str(out)}
    report = [
        {"section": "4. Resultant load & location", "rows": [
            R("W=sum(Pi)", " + ".join(f"{c.P_kN:.3f}" for c in cols), f"{W:.3f} kN"),
            R("xR=sum(Pi*xi)/W", f"{n} columns", f"{xR:.3f} m from left")]},
        {"section": "5. Moments about centre", "rows": [
            R("My_axial=sum(Pi(xi-L/2))", "eccentric axial", f"{My_total:.3f} kNm"),
            R("ex=My/W, ey=Mx/W", "eccentricities", f"ex={ex:.4f}, ey={ey:.4f} m")]},
        {"section": "6. Bearing pressure", "rows": [
            R("q0=W/A", f"{W:.3f}/{area:.3f}", f"{q0:.3f} kN/m2"),
            R("corners q0(1+/-6ex/L+/-6ey/B)", "biaxial", f"qmax={qmax:.3f}, qmin={qmin:.3f}"),
            R("Bearing", f"vs {d.allowable_bearing_kN_m2:.0f}", "OK" if bearing_ok else "NOT OK")]},
        {"section": "8. Longitudinal analysis", "rows": [
            R("Beam on linear soil", f"integrate w(x)=B*q(x), subtract {n} columns", "500-step sweep"),
            R("Max moment", f"at x={max_x:.3f} m", f"{max_M:.3f} kNm")]},
        {"section": "10-11. Flexural reinforcement", "rows": [
            R("Longitudinal", f"M={long_flex['M_kNm']:.2f}, K={long_flex['K']:.4f}", f"Y{d.bar_dia_mm:.0f}@{long_flex['spacing_mm']:.0f} -> {long_flex['status']}"),
            R("Transverse", f"M={trans_flex['M_kNm']:.2f}", f"Y{d.bar_dia_mm:.0f}@{trans_flex['spacing_mm']:.0f} -> {trans_flex['status']}")]},
        {"section": "12. One-way shear", "rows": [
            R("VEd", "at d from outer column faces", f"{VEd_sh:.2f} kN"),
            R("VRd,c", "resistance", f"{VRdc:.2f} kN -> {shear_status}")]},
        {"section": "13. Punching shear", "rows": [
            R("u1=2(cx+cy)+4pi*d", "heaviest column", f"{u1:.3f} m"),
            R("vEd / vRd,c", f"{vEd:.4f} / {vRdc:.4f}", punch_status)]},
    ]

    return {
        "status": status, "load_case": load_case, "n_columns": n,
        "extended_note": None if n == 2 else "N>2 uses the source's 2-column formulas generalised; verify before real design.",
        "resultant": {"W_kN": round(W, 3), "xR_m": round(xR, 3),
                      "axial_ecc_x_m": round(axial_ecc_x, 4)},
        "moments": {"My_from_axial": round(My_from_axial, 3), "My_total": round(My_total, 3),
                    "Mx_total": round(Mx_total, 3), "ex_m": round(ex, 4), "ey_m": round(ey, 4)},
        "geometry": {"L_m": round(L, 3), "B_m": round(B, 3), "area_m2": round(area, 3),
                     "footing_length_mm": round(L * 1000, 0), "footing_width_mm": round(B * 1000, 0),
                     "footing_depth_mm": d.footing_depth_mm, "column_x_mm": d.column_x_mm,
                     "column_y_mm": d.column_y_mm, "cover_mm": d.cover_mm,
                     "d_long_mm": round(d_long, 1), "d_trans_mm": round(d_trans, 1)},
        "materials": {"fck": d.fck, "fyk": d.fyk, "allowable_bearing_kN_m2": d.allowable_bearing_kN_m2,
                      "bar_dia_mm": d.bar_dia_mm},
        "soil_pressure": {"q0": round(q0, 3), "qmax": round(qmax, 3), "qmin": round(qmin, 3),
                          "corners": {k2: round(v, 3) for k2, v in corners.items()},
                          "bearing_ok": bearing_ok, "uplift_ok": uplift_ok},
        "columns": [{"id": c.label, "P_kN": round(c.P_kN, 3), "x_m": round(c.x_m, 3),
                     "Mx_kNm": c.Mx_kNm, "My_kNm": c.My_kNm} for c in cols],
        "longitudinal": {"max_M_kNm": round(max_M, 3), "max_M_location_m": round(max_x, 3),
                         "key_shear": key_shear, "key_moment": key_moment, "diagram": diagram},
        "flexure": {"longitudinal": long_flex, "transverse": trans_flex},
        "one_way_shear": {"VEd_kN": round(VEd_sh, 3), "VRdc_kN": round(VRdc, 3), "status": shear_status},
        "punching": {"u1_m": round(u1, 3), "VEd_punch_kN": round(VEd_p, 3),
                     "vEd_MPa": round(vEd, 4), "vRdc_MPa": round(vRdc, 4), "status": punch_status},
        "checks": checks,
        "utilisation": {"bearing_pct": round(util_bearing * 100, 1), "shear_pct": round(util_shear * 100, 1),
                        "punching_pct": round(util_punch * 100, 1),
                        "overall_pct": round(max(util_bearing, util_shear, util_punch) * 100, 1)},
        "report": report,
    }