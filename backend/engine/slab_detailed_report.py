"""
SDH — DETAILED one-way (single-span) SLAB calculation report (EC2).
Standalone trace: recomputes every step and returns ReportSection/ReportRow
shapes ({title, rows:[{reference, calculation, output}]}) with FULL substitutions,
faithful to the user's DETAILED_CALCULATION_REPORT spec.

Wire-in: call build_detailed_slab_report(inp) and append/return its sections as
the `report` on the slab result. No engine internals required — it is self-contained
and validated against the worked example (self-wt 3.75, Gk 6.45, wu 12.4575, d 124,
fctm 2.565 at fck25).
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional
import math


def _area_bar(dia): return math.pi * dia ** 2 / 4.0

# EC2 coefficients by support condition
C_MOMENT = {"simply_supported": 0.125, "end_span": 1/10, "interior_span": 1/24, "cantilever": 0.5}
C_SHEAR  = {"simply_supported": 0.5,  "end_span": 0.6,  "interior_span": 0.5,  "cantilever": 1.0}
K_DEFL   = {"simply_supported": 1.0,  "end_span": 1.3,  "interior_span": 1.5,  "cantilever": 0.4}

# imposed load by occupancy (EN 1991-1-1, indicative) — front end can override
IMPOSED_BY_USE = {
    "residential": 1.5, "office": 2.5, "classroom": 3.0, "retail": 4.0,
    "assembly": 5.0, "storage": 7.5, "parking": 2.5,
}


@dataclass
class SlabReportInput:
    Lx_m: float = 4.0
    h_mm: float = 150.0
    clear_cover_mm: float = 20.0
    cover_tol_mm: float = 5.0
    bar_dia_mm: float = 12.0
    fck: float = 25.0
    fyk: float = 500.0
    gamma_c: float = 1.5
    unit_weight_conc: float = 25.0
    finishes: float = 1.2
    partition: float = 1.5
    extra_dead: float = 0.0
    occupancy: str = "office"
    imposed_qk: Optional[float] = 2.5     # if None, resolve from occupancy
    extra_live: float = 0.0
    gamma_g: float = 1.35
    gamma_q: float = 1.50
    support: str = "simply_supported"


def _fctm(fck):
    return 0.30 * fck ** (2/3) if fck <= 50 else 2.12 * math.log(1 + (fck + 8) / 10)


def _sup(txt):
    """superscript helper for readable exponents in the trace"""
    return txt


def build_detailed_slab_report(d: SlabReportInput) -> List[dict]:
    R = lambda ref, calc, out: {"reference": ref, "calculation": calc, "output": out}
    b = 1000.0
    sections: List[dict] = []

    # ---------- 1. Geometry & cover ----------
    d_eff = d.h_mm - d.clear_cover_mm - d.bar_dia_mm / 2
    sections.append({"title": "1. Geometry & Cover", "rows": [
        R("EC2 §4.4.1", f"clear cover c = {d.clear_cover_mm:.0f} mm (+{d.cover_tol_mm:.0f} mm tolerance \u2192 detail at {d.clear_cover_mm + d.cover_tol_mm:.0f} mm)", f"c = {d.clear_cover_mm:.0f} mm"),
        R("Bar assumed", f"\u03c6 = {d.bar_dia_mm:.0f} mm main bars", f"\u03c6 = {d.bar_dia_mm:.0f} mm"),
        R("EC2 §6.1", f"d = h \u2212 c \u2212 \u03c6/2 = {d.h_mm:.0f} \u2212 {d.clear_cover_mm:.0f} \u2212 {d.bar_dia_mm:.0f}/2", f"d = {d_eff:.0f} mm"),
        R("Width", "design per metre width", f"b = {b:.0f} mm"),
    ]})

    # ---------- 2. Loads & combination ----------
    sw = d.unit_weight_conc * (d.h_mm / 1000.0)
    Gk = sw + d.finishes + d.partition + d.extra_dead
    qk = d.imposed_qk if d.imposed_qk is not None else IMPOSED_BY_USE.get(d.occupancy, 2.5)
    Qk = qk + d.extra_live
    wu = d.gamma_g * Gk + d.gamma_q * Qk
    sections.append({"title": "2. Loads & Combination (Load Analysis)", "rows": [
        R("Self weight", f"25 kN/m\u00b3 \u00d7 {d.h_mm/1000:.2f} m", f"{sw:.2f} kN/m\u00b2"),
        R("Finishes", "assumed", f"{d.finishes:.2f} kN/m\u00b2"),
        R("Partition allowance", "assumed", f"{d.partition:.2f} kN/m\u00b2"),
        R("Extra dead", "user input", f"{d.extra_dead:.2f} kN/m\u00b2"),
        R("Permanent G\u2096", f"G\u2096 = {sw:.2f} + {d.finishes:.2f} + {d.partition:.2f} + {d.extra_dead:.2f}", f"G\u2096 = {Gk:.2f} kN/m\u00b2"),
        R(f"Imposed ({d.occupancy})", f"leading variable Q\u2096 (+ {d.extra_live:.2f} extra)", f"Q\u2096 = {Qk:.2f} kN/m\u00b2"),
        R("EN 1990 (ULS)", f"w\u1d64 = (\u03b3_Gk\u00b7G\u2096 + \u03b3_Qk\u00b7Q\u2096) = (1.35 \u00d7 {Gk:.2f}) + (1.50 \u00d7 {Qk:.2f})", f"w\u1d64 = {wu:.4f} kN/m\u00b2"),
    ]})

    # ---------- 3. Design moments (closed form) ----------
    c_m = C_MOMENT.get(d.support, 0.125)
    c_v = C_SHEAR.get(d.support, 0.5)
    MEd = c_m * wu * d.Lx_m ** 2
    VEd = c_v * wu * d.Lx_m
    sections.append({"title": "3. Design Moments (Closed Form)", "rows": [
        R("Coefficient", f"c = {c_m:.4g} ({d.support.replace('_',' ')})", f"c = {c_m:.4g}"),
        R("Span moment", f"M_Ed = c \u00d7 w \u00d7 L\u2093\u00b2 = {c_m:.4g} \u00d7 {wu:.3f} \u00d7 {d.Lx_m:.2f}\u00b2", f"M_Ed = {MEd:.3f} kNm/m"),
        R("Equivalent", f"= w\u00b7L\u00b2/8 = {wu:.3f} \u00d7 {d.Lx_m:.2f}\u00b2 / 8", f"{wu * d.Lx_m**2 / 8:.3f} kNm/m"),
        R("Hogging", "single span, simply supported \u2192 hogging = 0", "0 kNm/m"),
        R("Shear", f"V_Ed = c \u00d7 w \u00d7 L\u2093 = {c_v:.2f} \u00d7 {wu:.3f} \u00d7 {d.Lx_m:.2f}", f"V_Ed = {VEd:.3f} kN/m"),
    ]})

    # ---------- 4. Flexural reinforcement ----------
    k = MEd * 1e6 / (d.fck * b * d_eff ** 2)
    singly = k < 0.167
    z = min(d_eff * (0.5 + math.sqrt(max(0.25 - k / 1.134, 0))), 0.95 * d_eff)
    As = MEd * 1e6 / (0.87 * d.fyk * z)
    fctm = _fctm(d.fck)
    As_min = max(0.26 * fctm / d.fyk * b * d_eff, 0.0013 * b * d_eff)
    which_min = "0.26·fctm/fyk·bd" if (0.26 * fctm / d.fyk * b * d_eff) >= (0.0013 * b * d_eff) else "0.0013·bd"
    As_design = max(As, As_min)
    Ab = _area_bar(d.bar_dia_mm)
    spacing = min(max(math.floor((Ab * 1000 / As_design) / 25) * 25, 75), 300)
    As_prov = Ab * 1000 / spacing
    sections.append({"title": "4. Flexural Reinforcement (Span)", "rows": [
        R("EC2 §6.1", f"k = M_Ed/(f_ck\u00b7b\u00b7d\u00b2) = {MEd:.3f}\u00d710\u2076/({d.fck:.0f}\u00d7{b:.0f}\u00d7{d_eff:.0f}\u00b2)", f"k = {k:.4f}"),
        R("Compression check", f"k = {k:.4f} {'<' if singly else '\u2265'} 0.167", "singly reinforced \u2014 no compression steel" if singly else "compression steel required"),
        R("Lever arm", f"z = d(0.5 + \u221a(0.25 \u2212 k/1.134)) = {d_eff:.0f}(0.5 + \u221a(0.25 \u2212 {k:.4f}/1.134))", f"z = {z:.1f} mm (\u2264 0.95d = {0.95*d_eff:.1f})"),
        R("EC2 §6.1", f"A_s = M_Ed/(0.87\u00b7f_yk\u00b7z) = {MEd:.3f}\u00d710\u2076/(0.87\u00d7{d.fyk:.0f}\u00d7{z:.1f})", f"A_s = {As:.1f} mm\u00b2/m"),
        R("EC2 §7.3", f"f_ctm = 0.30\u00b7f_ck^(2/3) = 0.30\u00d7{d.fck:.0f}^(2/3)", f"f_ctm = {fctm:.3f} MPa"),
        R("EC2 §9.2.1", f"A_s,min = max(0.26\u00b7f_ctm/f_yk\u00b7bd, 0.0013bd) = max(0.26\u00d7{fctm:.3f}/{d.fyk:.0f}\u00d7{b:.0f}\u00d7{d_eff:.0f}, 0.0013\u00d7{b:.0f}\u00d7{d_eff:.0f})", f"A_s,min = {As_min:.1f} mm\u00b2/m ({which_min})"),
        R("Governing", f"A_s,design = max(A_s, A_s,min) = max({As:.0f}, {As_min:.0f})", f"A_s = {As_design:.1f} mm\u00b2/m"),
        R("Bar provision", f"single bar area = \u03c0\u00b7{d.bar_dia_mm:.0f}\u00b2/4 = {Ab:.1f} mm\u00b2; spacing s = 1000\u00b7A_bar/A_s = 1000\u00d7{Ab:.1f}/{As_design:.1f} \u2192 round down to 25 mm", f"T{d.bar_dia_mm:.0f} @ {spacing:.0f} mm c/c"),
        R("Provided", f"A_s,prov = 1000\u00b7A_bar/s = 1000\u00d7{Ab:.1f}/{spacing:.0f}", f"A_s,prov = {As_prov:.1f} mm\u00b2/m ({'OK' if As_prov >= As_design else 'INCREASE'})"),
    ]})

    # ---------- 5. Deflection (EC2 §7.4.2) ----------
    rho = As_prov / (b * d_eff)
    rho0 = 1e-3 * math.sqrt(d.fck)
    Kd = K_DEFL.get(d.support, 1.0)
    if rho <= rho0:
        ld_lim = Kd * (11 + 1.5 * math.sqrt(d.fck) * (rho0 / rho) + 3.2 * math.sqrt(d.fck) * (rho0 / rho - 1) ** 1.5)
        branch = f"\u03c1 \u2264 \u03c1\u2080 \u2192 (L/d) = K[11 + 1.5\u221af_ck\u00b7\u03c1\u2080/\u03c1 + 3.2\u221af_ck(\u03c1\u2080/\u03c1 \u2212 1)^1.5]"
    else:
        ld_lim = Kd * (11 + 1.5 * math.sqrt(d.fck) * rho0 / rho + math.sqrt(d.fck) / 12)
        branch = f"\u03c1 > \u03c1\u2080 \u2192 (L/d) = K[11 + 1.5\u221af_ck\u00b7\u03c1\u2080/(\u03c1\u2212\u03c1') + \u221af_ck/12\u00b7\u221a(\u03c1'/\u03c1\u2080)]"
    sigma_s = 310 * d.fyk * As_design / (500 * As_prov)
    beta = min(310 / sigma_s, 2.0) if sigma_s else 2.0
    ld_allow = beta * ld_lim
    ld_actual = (d.Lx_m * 1000) / d_eff
    defl_ok = ld_actual < ld_allow
    sections.append({"title": "5. Deflection Check (EC2 §7.4.2)", "rows": [
        R("Reinf. ratio", f"\u03c1 = A_s,prov/(b\u00b7d) = {As_prov:.1f}/({b:.0f}\u00d7{d_eff:.0f})", f"\u03c1 = {rho:.5f}"),
        R("Ref. ratio", f"\u03c1\u2080 = 10\u207b\u00b3\u00b7\u221af_ck = 10\u207b\u00b3\u00d7\u221a{d.fck:.0f}", f"\u03c1\u2080 = {rho0:.5f}"),
        R("K value", f"{d.support.replace('_',' ')}", f"K = {Kd:.2f}"),
        R("EC2 §7.4.2", branch, f"(L/d)_basic = {ld_lim:.2f}"),
        R("Steel stress", f"\u03c3_s = 310\u00b7f_yk\u00b7A_s,req/(500\u00b7A_s,prov) = 310\u00d7{d.fyk:.0f}\u00d7{As_design:.0f}/(500\u00d7{As_prov:.0f})", f"\u03c3_s = {sigma_s:.1f} MPa"),
        R("Modification", f"\u03b2 = 310/\u03c3_s = 310/{sigma_s:.1f} (\u2264 2.0)", f"\u03b2 = {beta:.3f}"),
        R("Allowable", f"(L/d)_allow = \u03b2 \u00d7 (L/d)_basic = {beta:.3f} \u00d7 {ld_lim:.2f}", f"{ld_allow:.2f}"),
        R("Actual", f"(L/d)_actual = L\u2093/d = {d.Lx_m*1000:.0f}/{d_eff:.0f}", f"{ld_actual:.2f}"),
        R("Verdict", f"{ld_actual:.2f} {'<' if defl_ok else '>'} {ld_allow:.2f}", "Deflection OK" if defl_ok else "Deflection NOT OK"),
    ]})

    # ---------- 6. Shear verification ----------
    C_Rdc = 0.18 / d.gamma_c
    k_sh = min(1 + math.sqrt(200 / d_eff), 2.0)
    rho_i = min(As_prov / (b * d_eff), 0.02)
    vmin = 0.035 * k_sh ** 1.5 * math.sqrt(d.fck)
    VRdc = max(C_Rdc * k_sh * (100 * rho_i * d.fck) ** (1/3), vmin) * b * d_eff / 1000
    shear_ok = VRdc > VEd
    sections.append({"title": "6. Shear Verification (EC2 §6.2.2)", "rows": [
        R("Design shear", f"V_Ed = {c_v:.2f} \u00d7 w \u00d7 L\u2093 (n\u00b7L\u2093/2)", f"V_Ed = {VEd:.3f} kN/m"),
        R("C_Rd,c", f"0.18/\u03b3_c = 0.18/{d.gamma_c:.2f}", f"{C_Rdc:.3f}"),
        R("Size factor", f"k = 1 + \u221a(200/d) = 1 + \u221a(200/{d_eff:.0f}) (\u2264 2.0)", f"k = {k_sh:.3f}"),
        R("Steel ratio", f"\u03c1\u2097 = A_s,prov/(b\u00b7d) (\u2264 0.02)", f"\u03c1\u2097 = {rho_i:.5f}"),
        R("v_min", f"0.035\u00b7k^1.5\u00b7\u221af_ck = 0.035\u00d7{k_sh:.3f}^1.5\u00d7\u221a{d.fck:.0f}", f"{vmin:.3f} MPa"),
        R("Resistance", f"V_Rd,c = [C_Rd,c\u00b7k\u00b7(100\u00b7\u03c1\u2097\u00b7f_ck)^(1/3)]\u00b7b\u00b7d", f"V_Rd,c = {VRdc:.3f} kN/m"),
        R("Verdict", f"V_Rd,c {'>' if shear_ok else '<'} V_Ed ({VRdc:.2f} vs {VEd:.2f})", "No shear reinf. required" if shear_ok else "Shear reinf. required"),
        R("Note", "Shear links are rarely required in solid slabs supported by beams.", ""),
    ]})

    return sections