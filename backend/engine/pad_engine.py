"""
SDH ISOLATED PAD FOUNDATION DESIGN ENGINE — structured (returns data, not print).

Faithful consolidation of the user's PAD_FOUNDATION.txt (EC2 + EC7).
Same formulas, same order: geometry -> eccentricity -> biaxial corner
pressures -> design moments (qmax) -> flexural reinforcement -> one-way shear
-> punching shear -> summary. Only the fields the engine actually uses are
consumed; the web form collects extra (display-only) fields separately.

Every number below traces to the source script; validated against its default
example (N=233.647, Mx=6.592, My=4.000, 1500x1500x450).
"""
from __future__ import annotations
from dataclasses import dataclass
import math


def bar_area(phi):
    return math.pi * phi ** 2 / 4.0


@dataclass
class PadFoundationInput:
    axial_load_kN: float = 233.647
    moment_x_kNm: float = 6.592
    moment_y_kNm: float = 4.000
    footing_length_mm: float = 1500
    footing_width_mm: float = 1500
    footing_depth_mm: float = 450
    column_x_mm: float = 300
    column_y_mm: float = 300
    concrete_grade_fck: float = 25
    steel_grade_fyk: float = 500
    allowable_bearing_kN_m2: float = 100
    cover_mm: float = 75
    bar_dia_mm: float = 12
    gamma_c: float = 1.5
    gamma_s: float = 1.15


def _flexural(d: PadFoundationInput, M_kNm_per_m, d_eff, direction):
    b = 1000.0
    fck, fyk = d.concrete_grade_fck, d.steel_grade_fyk
    M_Nmm = M_kNm_per_m * 1_000_000
    K = M_Nmm / (b * d_eff ** 2 * fck)
    z = d_eff * (0.5 + math.sqrt(max(0.25 - K / 0.9, 0)))
    z = min(z, 0.95 * d_eff)
    As_req = M_Nmm / (0.87 * fyk * z)
    fctm = 2.6 if fck <= 25 else 2.9
    As_min = max(0.26 * fctm / fyk * b * d_eff, 0.0013 * b * d_eff)
    As_design = max(As_req, As_min)
    area_one_bar = bar_area(d.bar_dia_mm)
    spacing_raw = area_one_bar * 1000 / As_design
    adopted = min(math.floor(spacing_raw / 25) * 25, 200)
    if adopted < 75:
        adopted = 75
    As_prov = area_one_bar * 1000 / adopted
    return {
        "direction": direction, "M_kNm_per_m": round(M_kNm_per_m, 3),
        "d_eff_mm": round(d_eff, 1), "K": round(K, 5), "z_mm": round(z, 1),
        "As_req": round(As_req, 2), "As_min": round(As_min, 2),
        "As_design": round(As_design, 2), "bar_dia": d.bar_dia_mm,
        "spacing_mm": adopted, "As_provided": round(As_prov, 2),
        "status": "OK" if As_prov >= As_design else "NOT OK",
    }


def _one_way_shear(d, q_design, projection_mm, d_eff_mm, direction):
    projection_m = projection_mm / 1000.0
    d_m = d_eff_mm / 1000.0
    shear_length = max(projection_m - d_m, 0.0)
    VEd = q_design * shear_length
    bw, fck = 1000.0, d.concrete_grade_fck
    C_Rdc = 0.18 / d.gamma_c
    k = min(1 + math.sqrt(200 / d_eff_mm), 2.0)
    rho_l = 0.002
    VRdc_N = C_Rdc * k * (100 * rho_l * fck) ** (1 / 3) * bw * d_eff_mm
    vmin = 0.035 * k ** 1.5 * math.sqrt(fck)
    VRdc = max(VRdc_N, vmin * bw * d_eff_mm) / 1000.0
    return {
        "direction": direction, "VEd_kN_per_m": round(VEd, 3),
        "VRdc_kN_per_m": round(VRdc, 3), "k": round(k, 3),
        "status": "OK" if VEd <= VRdc else "NOT OK",
    }


def _punching(d, q_design, d_eff_mm):
    d_eff_m = d_eff_mm / 1000.0
    cx_m, cy_m = d.column_x_mm / 1000.0, d.column_y_mm / 1000.0
    u1 = 2 * (cx_m + cy_m) + 4 * math.pi * d_eff_m
    A_inside = (cx_m + 4 * d_eff_m) * (cy_m + 4 * d_eff_m)
    upward = q_design * A_inside
    VEd_p = max(d.axial_load_kN - upward, 0.0)
    vEd = VEd_p * 1000 / (u1 * 1000 * d_eff_mm)
    fck = d.concrete_grade_fck
    C_Rdc = 0.18 / d.gamma_c
    k = min(1 + math.sqrt(200 / d_eff_mm), 2.0)
    rho_l = 0.002
    vRdc = max(C_Rdc * k * (100 * rho_l * fck) ** (1 / 3), 0.035 * k ** 1.5 * math.sqrt(fck))
    return {
        "u1_m": round(u1, 3), "A_inside_m2": round(A_inside, 3),
        "upward_kN": round(upward, 3), "VEd_punch_kN": round(VEd_p, 3),
        "vEd_MPa": round(vEd, 4), "vRdc_MPa": round(vRdc, 4),
        "status": "OK" if vEd <= vRdc else "NOT OK",
    }


def design_pad_foundation(d: PadFoundationInput) -> dict:
    # geometry
    L = d.footing_length_mm / 1000.0
    B = d.footing_width_mm / 1000.0
    area = L * B
    proj_x = (d.footing_length_mm - d.column_x_mm) / 2.0
    proj_y = (d.footing_width_mm - d.column_y_mm) / 2.0
    d_eff_x = d.footing_depth_mm - d.cover_mm - d.bar_dia_mm / 2.0
    d_eff_y = d.footing_depth_mm - d.cover_mm - d.bar_dia_mm - d.bar_dia_mm / 2.0

    # load case
    if d.moment_x_kNm == 0 and d.moment_y_kNm == 0:
        load_case = "Axial"
    elif d.moment_x_kNm != 0 and d.moment_y_kNm != 0:
        load_case = "Biaxial"
    else:
        load_case = "Uniaxial"

    # eccentricity
    ex = d.moment_y_kNm / d.axial_load_kN if d.axial_load_kN else 0.0
    ey = d.moment_x_kNm / d.axial_load_kN if d.axial_load_kN else 0.0
    ecc_x_ok = abs(ex) <= L / 6
    ecc_y_ok = abs(ey) <= B / 6

    # corner pressures
    q0 = d.axial_load_kN / area
    q1 = q0 * (1 + 6 * ex / L + 6 * ey / B)
    q2 = q0 * (1 + 6 * ex / L - 6 * ey / B)
    q3 = q0 * (1 - 6 * ex / L + 6 * ey / B)
    q4 = q0 * (1 - 6 * ex / L - 6 * ey / B)
    corners = {"c1": q1, "c2": q2, "c3": q3, "c4": q4}
    qmax, qmin = max(corners.values()), min(corners.values())
    bearing_ok = qmax <= d.allowable_bearing_kN_m2
    uplift_ok = qmin >= 0

    # design moments (qmax conservative)
    ax_m, ay_m = proj_x / 1000.0, proj_y / 1000.0
    Mx = qmax * ax_m ** 2 / 2.0
    My = qmax * ay_m ** 2 / 2.0

    flex_x = _flexural(d, Mx, d_eff_x, "x")
    flex_y = _flexural(d, My, d_eff_y, "y")
    shear_x = _one_way_shear(d, qmax, proj_x, d_eff_x, "x")
    shear_y = _one_way_shear(d, qmax, proj_y, d_eff_y, "y")
    punch = _punching(d, qmax, min(d_eff_x, d_eff_y))

    checks = {
        "bearing": bearing_ok, "uplift": uplift_ok,
        "eccentricity_x": ecc_x_ok, "eccentricity_y": ecc_y_ok,
        "flexure_x": flex_x["status"] == "OK", "flexure_y": flex_y["status"] == "OK",
        "one_way_shear_x": shear_x["status"] == "OK", "one_way_shear_y": shear_y["status"] == "OK",
        "punching": punch["status"] == "OK",
    }
    status = "PASS" if all(checks.values()) else "FAIL"

    # utilisations for summary chips
    util_bearing = qmax / d.allowable_bearing_kN_m2 if d.allowable_bearing_kN_m2 else 0
    util_punch = punch["vEd_MPa"] / punch["vRdc_MPa"] if punch["vRdc_MPa"] else 0
    util_shear = max(
        shear_x["VEd_kN_per_m"] / shear_x["VRdc_kN_per_m"] if shear_x["VRdc_kN_per_m"] else 0,
        shear_y["VEd_kN_per_m"] / shear_y["VRdc_kN_per_m"] if shear_y["VRdc_kN_per_m"] else 0)

    report = _report(d, L, B, area, proj_x, proj_y, d_eff_x, d_eff_y, ex, ey,
                     q0, corners, qmax, qmin, Mx, My, flex_x, flex_y, shear_x, shear_y, punch)

    return {
        "status": status, "load_case": load_case,
        "geometry": {
            "L_m": round(L, 3), "B_m": round(B, 3), "area_m2": round(area, 3),
            "footing_length_mm": d.footing_length_mm, "footing_width_mm": d.footing_width_mm,
            "footing_depth_mm": d.footing_depth_mm, "column_x_mm": d.column_x_mm,
            "column_y_mm": d.column_y_mm, "cover_mm": d.cover_mm,
            "projection_x_mm": round(proj_x, 1), "projection_y_mm": round(proj_y, 1),
            "d_eff_x_mm": round(d_eff_x, 1), "d_eff_y_mm": round(d_eff_y, 1),
        },
        "materials": {"fck": d.concrete_grade_fck, "fyk": d.steel_grade_fyk,
                      "allowable_bearing_kN_m2": d.allowable_bearing_kN_m2, "bar_dia_mm": d.bar_dia_mm},
        "eccentricity": {"ex_m": round(ex, 4), "ey_m": round(ey, 4),
                         "L_over_6": round(L / 6, 4), "B_over_6": round(B / 6, 4),
                         "ex_ok": ecc_x_ok, "ey_ok": ecc_y_ok},
        "soil_pressure": {
            "q0": round(q0, 3), "qmax": round(qmax, 3), "qmin": round(qmin, 3),
            "corners": {k: round(v, 3) for k, v in corners.items()},
            "bearing_ok": bearing_ok, "uplift_ok": uplift_ok,
        },
        "design_moments": {"Mx_kNm_per_m": round(Mx, 3), "My_kNm_per_m": round(My, 3)},
        "flexure": {"x": flex_x, "y": flex_y},
        "one_way_shear": {"x": shear_x, "y": shear_y},
        "punching": punch,
        "checks": checks,
        "utilisation": {
            "bearing_pct": round(util_bearing * 100, 1),
            "shear_pct": round(util_shear * 100, 1),
            "punching_pct": round(util_punch * 100, 1),
            "overall_pct": round(max(util_bearing, util_shear, util_punch) * 100, 1),
        },
        "input_echo": {
            "axial_load_kN": d.axial_load_kN, "moment_x_kNm": d.moment_x_kNm,
            "moment_y_kNm": d.moment_y_kNm,
        },
        "report": report,
    }


def _report(d, L, B, area, px, py, dx, dy, ex, ey, q0, corners, qmax, qmin,
            Mx, My, fx, fy, sx, sy, punch):
    R = lambda ref, calc, out: {"ref": ref, "calc": calc, "out": str(out)}
    return [
        {"section": "3. Geometry", "rows": [
            R("L, B", f"{d.footing_length_mm:.0f}×{d.footing_width_mm:.0f} mm", f"A = {area:.3f} m²"),
            R("Projection", f"a_x=(L−cx)/2, a_y=(B−cy)/2", f"{px:.0f} / {py:.0f} mm"),
            R("Eff. depth", "d_x=h−c−φ/2 ; d_y one bar deeper", f"{dx:.1f} / {dy:.1f} mm"),
        ]},
        {"section": "4. Eccentricity", "rows": [
            R("ex=My/N", f"{d.moment_y_kNm:.3f}/{d.axial_load_kN:.3f}", f"{ex:.4f} m (L/6={L/6:.4f})"),
            R("ey=Mx/N", f"{d.moment_x_kNm:.3f}/{d.axial_load_kN:.3f}", f"{ey:.4f} m (B/6={B/6:.4f})"),
        ]},
        {"section": "5. Soil pressure", "rows": [
            R("q0=N/A", f"{d.axial_load_kN:.3f}/{area:.3f}", f"{q0:.3f} kN/m²"),
            R("q=q0(1±6ex/L±6ey/B)", "corner pressures", f"qmax={qmax:.3f}, qmin={qmin:.3f}"),
            R("Bearing", f"qmax vs {d.allowable_bearing_kN_m2:.0f}", "OK" if qmax <= d.allowable_bearing_kN_m2 else "NOT OK"),
        ]},
        {"section": "6. Design moments", "rows": [
            R("Mx=q·ax²/2", f"{qmax:.3f}·{px/1000:.3f}²/2", f"{Mx:.3f} kNm/m"),
            R("My=q·ay²/2", f"{qmax:.3f}·{py/1000:.3f}²/2", f"{My:.3f} kNm/m"),
        ]},
        {"section": "7. Flexural reinforcement", "rows": [
            R("X: K,z,As", f"K={fx['K']:.4f}, z={fx['z_mm']:.0f}", f"Y{d.bar_dia_mm:.0f}@{fx['spacing_mm']:.0f} (As={fx['As_provided']:.0f})"),
            R("Y: K,z,As", f"K={fy['K']:.4f}, z={fy['z_mm']:.0f}", f"Y{d.bar_dia_mm:.0f}@{fy['spacing_mm']:.0f} (As={fy['As_provided']:.0f})"),
        ]},
        {"section": "8. One-way shear", "rows": [
            R("X", f"VEd={sx['VEd_kN_per_m']:.2f}", f"VRd,c={sx['VRdc_kN_per_m']:.2f} → {sx['status']}"),
            R("Y", f"VEd={sy['VEd_kN_per_m']:.2f}", f"VRd,c={sy['VRdc_kN_per_m']:.2f} → {sy['status']}"),
        ]},
        {"section": "9. Punching shear (6.4)", "rows": [
            R("u1=2(cx+cy)+4πd", "perimeter at 2d", f"{punch['u1_m']:.3f} m"),
            R("vEd", f"VEd,p={punch['VEd_punch_kN']:.1f} kN", f"{punch['vEd_MPa']:.4f} MPa"),
            R("vRd,c", "resistance", f"{punch['vRdc_MPa']:.4f} MPa → {punch['status']}"),
        ]},
    ]