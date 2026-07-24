"""
SDH — DETAILED one-way SLAB calculation report (EC2 + UK NA).
Every step shows the formula, the substituted numbers, the intermediate
products, and the result — nothing collapsed. Returns ReportSection-shaped
dicts: {title, rows:[{reference, calculation, output}]}.
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional
import math

def _ab(dia): return math.pi * dia ** 2 / 4.0

C_MOMENT = {"simply_supported": 0.125, "end_span": 1/10, "interior_span": 1/24, "cantilever": 0.5}
C_SHEAR  = {"simply_supported": 0.5,  "end_span": 0.6,  "interior_span": 0.5,  "cantilever": 1.0}
K_DEFL   = {"simply_supported": 1.0,  "end_span": 1.3,  "interior_span": 1.5,  "cantilever": 0.4}

IMPOSED_BY_USE = {"residential": 1.5, "office": 2.5, "classroom": 3.0, "retail": 4.0,
                  "assembly": 5.0, "storage": 7.5, "parking": 2.5}

SPACINGS = [75, 100, 125, 150, 175, 200, 225, 250, 275, 300]


@dataclass
class SlabReportInput:
    Lx_m: float = 4.0
    h_mm: float = 160.0
    clear_cover_mm: float = 25.0
    cover_tol_mm: float = 5.0
    bar_dia_mm: float = 12.0
    fck: float = 30.0
    fyk: float = 500.0
    gamma_c: float = 1.5
    gamma_s: float = 1.15
    unit_weight_conc: float = 25.0
    finishes: float = 1.5
    services: float = 0.5
    partition: float = 1.0
    extra_dead: float = 0.0
    occupancy: str = "residential"
    imposed_qk: Optional[float] = 2.0
    extra_live: float = 0.0
    gamma_g: float = 1.35
    gamma_q: float = 1.50
    support: str = "simply_supported"


def _fctm(fck):
    return 0.30 * fck ** (2/3) if fck <= 50 else 2.12 * math.log(1 + (fck + 8) / 10)


def build_detailed_slab_report(d: SlabReportInput) -> List[dict]:
    R = lambda ref, calc, out: {"reference": ref, "calculation": calc, "output": out}
    S: List[dict] = []
    b = 1000.0
    sup_txt = d.support.replace("_", " ")

    # ---------------- 1. Design basis ----------------
    S.append({"title": "1. Design Basis and References", "rows": [
        R("EN 1990", "Basis of structural design — load combinations (Eq. 6.10)", "adopted"),
        R("EN 1991-1-1", "Actions: densities, self-weight, imposed loads (Table 6.2)", "adopted"),
        R("EN 1992-1-1", "Design of concrete structures (Cl. 6.1, 6.2.2, 7.4.2, 9.2.1.1)", "adopted"),
        R("UK NA", "National Annex to EN 1992-1-1", "adopted"),
        R("Design strip", "one-way slab designed as a 1 m wide strip", f"b = {b:.0f} mm"),
        R("Support", f"continuity = {sup_txt}", f"L = {d.Lx_m:.2f} m"),
    ]})

    # ---------------- 2. Geometry & materials ----------------
    d_eff = d.h_mm - d.clear_cover_mm - d.bar_dia_mm / 2
    fctm = _fctm(d.fck)
    fyd = d.fyk / d.gamma_s
    fcd = d.fck / d.gamma_c
    S.append({"title": "2. Geometry and Materials", "rows": [
        R("Geometry", f"span L = {d.Lx_m:.2f} m ; thickness h = {d.h_mm:.0f} mm", f"h = {d.h_mm:.0f} mm"),
        R("EC2 §4.4.1", f"clear cover c = {d.clear_cover_mm:.0f} mm  (+{d.cover_tol_mm:.0f} mm detailing tolerance = {d.clear_cover_mm + d.cover_tol_mm:.0f} mm)", f"c = {d.clear_cover_mm:.0f} mm"),
        R("Bar assumed", f"\u03c6 = {d.bar_dia_mm:.0f} mm  \u2192  \u03c6/2 = {d.bar_dia_mm/2:.0f} mm", f"\u03c6 = {d.bar_dia_mm:.0f} mm"),
        R("EC2 §6.1", f"d = h \u2212 c \u2212 0.5\u03c6 = {d.h_mm:.0f} \u2212 {d.clear_cover_mm:.0f} \u2212 {d.bar_dia_mm/2:.0f}", f"d = {d_eff:.0f} mm"),
        R("EC2 Table 3.1", f"concrete: f_ck = {d.fck:.0f} MPa ; f_ctm = 0.30\u00b7f_ck^(2/3) = 0.30 \u00d7 {d.fck:.0f}^(2/3) = {fctm:.2f} MPa", f"f_ctm = {fctm:.2f} MPa"),
        R("EC2 §3.1.6", f"f_cd = f_ck/\u03b3_c = {d.fck:.0f}/{d.gamma_c:.2f}", f"f_cd = {fcd:.2f} MPa"),
        R("EC2 §3.2.7", f"steel: f_yk = {d.fyk:.0f} MPa ; f_yd = f_yk/\u03b3_s = {d.fyk:.0f}/{d.gamma_s:.2f}", f"f_yd = {fyd:.0f} MPa"),
    ]})

    # ---------------- 3. Loads ----------------
    sw = d.unit_weight_conc * (d.h_mm / 1000.0)
    Gk = sw + d.finishes + d.services + d.partition + d.extra_dead
    qk_base = d.imposed_qk if d.imposed_qk is not None else IMPOSED_BY_USE.get(d.occupancy, 2.5)
    Qk = qk_base + d.extra_live
    parts = f"{sw:.2f} + {d.finishes:.2f} + {d.services:.2f} + {d.partition:.2f} + {d.extra_dead:.2f}"
    S.append({"title": "3. Loads", "rows": [
        R("EN 1991-1-1", f"self-weight g_k,self = \u03b3_c \u00d7 h = {d.unit_weight_conc:.0f} kN/m\u00b3 \u00d7 {d.h_mm/1000:.3f} m", f"{sw:.2f} kN/m\u00b2"),
        R("Finishes", "g_k,finish (assumed)", f"{d.finishes:.2f} kN/m\u00b2"),
        R("Services", "g_k,services (allowance)", f"{d.services:.2f} kN/m\u00b2"),
        R("Partitions", "g_k,partitions (allowance)", f"{d.partition:.2f} kN/m\u00b2"),
        R("Extra dead", "user-defined additional permanent action", f"{d.extra_dead:.2f} kN/m\u00b2"),
        R("Total permanent", f"G_k = {parts} = {Gk:.2f}", f"G_k = {Gk:.2f} kN/m\u00b2"),
        R("EN 1991-1-1 Table 6.2", f"imposed ({d.occupancy}) Q_k = {qk_base:.2f} + extra {d.extra_live:.2f}", f"Q_k = {Qk:.2f} kN/m\u00b2"),
    ]})

    # ---------------- 4. ULS combination ----------------
    pg, pq = d.gamma_g * Gk, d.gamma_q * Qk
    wu = pg + pq
    S.append({"title": "4. Ultimate Limit State Load Combination", "rows": [
        R("EN 1990 Eq. 6.10", "w_Ed = \u03b3_G\u00b7G_k + \u03b3_Q\u00b7Q_k", "combination adopted"),
        R("Partial factors", f"\u03b3_G = {d.gamma_g:.2f} (permanent) ; \u03b3_Q = {d.gamma_q:.2f} (variable)", "EN 1990"),
        R("Substitution", f"w_Ed = ({d.gamma_g:.2f} \u00d7 {Gk:.2f}) + ({d.gamma_q:.2f} \u00d7 {Qk:.2f}) = {pg:.2f} + {pq:.2f}", f"w_Ed = {wu:.2f} kN/m\u00b2"),
        R("Design strip", f"line load on 1 m strip = {wu:.2f} kN/m\u00b2 \u00d7 1.0 m", f"w = {wu:.2f} kN/m"),
    ]})

    # ---------------- 5. Moment & shear ----------------
    c_m, c_v = C_MOMENT.get(d.support, 0.125), C_SHEAR.get(d.support, 0.5)
    MEd = c_m * wu * d.Lx_m ** 2
    VEd = c_v * wu * d.Lx_m
    S.append({"title": "5. Bending Moment and Shear", "rows": [
        R("EC2 §5.3", f"coefficient for {sup_txt}: c_M = {c_m:.4g} ; c_V = {c_v:.3g}", f"c_M = {c_m:.4g}"),
        R("Span moment", f"M_Ed = c_M \u00b7 w \u00b7 L\u00b2 = {c_m:.4g} \u00d7 {wu:.2f} \u00d7 {d.Lx_m:.2f}\u00b2 = {c_m:.4g} \u00d7 {wu:.2f} \u00d7 {d.Lx_m**2:.2f}", f"M_Ed = {MEd:.2f} kNm/m"),
        R("Equivalent form", f"M_Ed = wL\u00b2/8 = ({wu:.2f} \u00d7 {d.Lx_m:.2f}\u00b2)/8 = {wu*d.Lx_m**2:.2f}/8", f"{wu*d.Lx_m**2/8:.2f} kNm/m"),
        R("Hogging", "single simply-supported span \u2192 M_hog = 0", "0.00 kNm/m"),
        R("Shear", f"V_Ed = c_V \u00b7 w \u00b7 L = {c_v:.3g} \u00d7 {wu:.2f} \u00d7 {d.Lx_m:.2f}   (= wL/2)", f"V_Ed = {VEd:.2f} kN/m"),
    ]})

    # ---------------- 6. Flexural reinforcement ----------------
    K = MEd * 1e6 / (d.fck * b * d_eff ** 2)
    singly = K < 0.167
    root = max(0.25 - K / 1.134, 0)
    z_raw = d_eff * (0.5 + math.sqrt(root))
    z_cap = 0.95 * d_eff
    z = min(z_raw, z_cap)
    As = MEd * 1e6 / (0.87 * d.fyk * z)
    S.append({"title": "6. Flexural Reinforcement Design", "rows": [
        R("EC2 §6.1", f"K = M_Ed/(f_ck\u00b7b\u00b7d\u00b2) = ({MEd:.2f} \u00d7 10\u2076)/({d.fck:.0f} \u00d7 {b:.0f} \u00d7 {d_eff:.0f}\u00b2) = ({MEd*1e6:.3e})/({d.fck*b*d_eff**2:.3e})", f"K = {K:.4f}"),
        R("Compression steel", f"K = {K:.4f} {'<' if singly else '\u2265'} K' = 0.167", "singly reinforced \u2014 no compression steel required" if singly else "compression reinforcement required"),
        R("EC2 §6.1", f"z = d[0.5 + \u221a(0.25 \u2212 K/1.134)] = {d_eff:.0f}[0.5 + \u221a(0.25 \u2212 {K:.4f}/1.134)] = {d_eff:.0f}[0.5 + \u221a{root:.4f}] = {d_eff:.0f} \u00d7 {0.5+math.sqrt(root):.4f}", f"z = {z_raw:.1f} mm"),
        R("Cap", f"z \u2264 0.95d = 0.95 \u00d7 {d_eff:.0f} = {z_cap:.1f} mm \u2192 governing z = min({z_raw:.1f}, {z_cap:.1f})", f"z = {z:.1f} mm"),
        R("EC2 §6.1", f"A_s = M_Ed/(0.87\u00b7f_yk\u00b7z) = ({MEd:.2f} \u00d7 10\u2076)/(0.87 \u00d7 {d.fyk:.0f} \u00d7 {z:.1f}) = ({MEd*1e6:.3e})/({0.87*d.fyk*z:.4e})", f"A_s = {As:.0f} mm\u00b2/m"),
    ]})

    # ---------------- 7. Minimum reinforcement ----------------
    bd = b * d_eff
    t1 = 0.26 * fctm / d.fyk * bd
    t2 = 0.0013 * bd
    As_min = max(t1, t2)
    gov = "0.26\u00b7f_ctm/f_yk\u00b7bd" if t1 >= t2 else "0.0013\u00b7bd"
    As_design = max(As, As_min)
    S.append({"title": "7. Minimum Reinforcement Check", "rows": [
        R("EC2 §9.2.1.1", "A_s,min = max(0.26\u00b7f_ctm/f_yk\u00b7b\u00b7d , 0.0013\u00b7b\u00b7d)", "formula"),
        R("Section area", f"b\u00b7d = {b:.0f} \u00d7 {d_eff:.0f}", f"b\u00b7d = {bd:.0f} mm\u00b2"),
        R("Term 1", f"0.26 \u00d7 {fctm:.2f}/{d.fyk:.0f} \u00d7 {bd:.0f} = {0.26*fctm/d.fyk:.6f} \u00d7 {bd:.0f}", f"{t1:.0f} mm\u00b2/m"),
        R("Term 2", f"0.0013 \u00d7 {bd:.0f}", f"{t2:.0f} mm\u00b2/m"),
        R("Governing", f"A_s,min = max({t1:.0f} , {t2:.0f})  \u2190 {gov} governs", f"A_s,min = {As_min:.0f} mm\u00b2/m"),
        R("Required", f"A_s,req = max(A_s , A_s,min) = max({As:.0f} , {As_min:.0f})  \u2192 {'bending governs' if As >= As_min else 'minimum steel governs'}", f"A_s,req = {As_design:.0f} mm\u00b2/m"),
    ]})

    # ---------------- 8. Bar selection ----------------
    Ab = _ab(d.bar_dia_mm)
    chosen_s, As_prov = None, 0.0
    for s in SPACINGS:
        a = Ab * 1000.0 / s
        if a >= As_design:
            chosen_s, As_prov = s, a
    if chosen_s is None:
        chosen_s, As_prov = SPACINGS[0], Ab * 1000.0 / SPACINGS[0]
    s_max = min(3 * d.h_mm, 400)
    S.append({"title": "8. Bar Selection", "rows": [
        R("Bar area", f"A_bar = \u03c0\u03c6\u00b2/4 = \u03c0 \u00d7 {d.bar_dia_mm:.0f}\u00b2/4", f"A_bar = {Ab:.1f} mm\u00b2"),
        R("Spacing required", f"s \u2264 A_bar \u00d7 1000/A_s,req = {Ab:.1f} \u00d7 1000/{As_design:.0f} = {Ab*1000/As_design:.0f} mm  \u2192 use standard spacing", f"s = {chosen_s:.0f} mm"),
        R("Provided", f"A_s,prov = A_bar \u00d7 (1000/s) = {Ab:.1f} \u00d7 (1000/{chosen_s:.0f}) = {Ab:.1f} \u00d7 {1000/chosen_s:.3f}", f"A_s,prov = {As_prov:.0f} mm\u00b2/m"),
        R("Check", f"A_s,prov \u2265 A_s,req \u2192 {As_prov:.0f} \u2265 {As_design:.0f}", "OK" if As_prov >= As_design else "INCREASE STEEL"),
        R("EC2 §9.3.1.1", f"max bar spacing = min(3h , 400) = min({3*d.h_mm:.0f} , 400) = {s_max:.0f} mm ; provided {chosen_s:.0f} mm", "OK" if chosen_s <= s_max else "SPACING TOO WIDE"),
        R("Provide", f"\u03c6{d.bar_dia_mm:.0f} @ {chosen_s:.0f} mm c/c (main, bottom)", f"T{d.bar_dia_mm:.0f} @ {chosen_s:.0f}"),
    ]})

    # ---------------- 9. Deflection ----------------
    rho = As_prov / bd
    rho0 = 1e-3 * math.sqrt(d.fck)
    Kd = K_DEFL.get(d.support, 1.0)
    if rho <= rho0:
        t_a = 1.5 * math.sqrt(d.fck) * (rho0 / rho)
        t_b = 3.2 * math.sqrt(d.fck) * (rho0 / rho - 1) ** 1.5
        ld_basic = Kd * (11 + t_a + t_b)
        branch = (f"\u03c1 \u2264 \u03c1\u2080 \u2192 (L/d) = K[11 + 1.5\u221af_ck(\u03c1\u2080/\u03c1) + 3.2\u221af_ck(\u03c1\u2080/\u03c1 \u2212 1)^1.5]"
                  f" = {Kd:.2f}[11 + {t_a:.3f} + {t_b:.3f}]")
    else:
        t_a = 1.5 * math.sqrt(d.fck) * rho0 / rho
        t_b = math.sqrt(d.fck) / 12
        ld_basic = Kd * (11 + t_a + t_b)
        branch = (f"\u03c1 > \u03c1\u2080 \u2192 (L/d) = K[11 + 1.5\u221af_ck\u00b7\u03c1\u2080/(\u03c1\u2212\u03c1') + \u221af_ck/12\u00b7\u221a(\u03c1'/\u03c1\u2080)]"
                  f" = {Kd:.2f}[11 + {t_a:.3f} + {t_b:.3f}]")
    sigma_s = 310 * d.fyk * As_design / (500 * As_prov)
    beta = min(310 / sigma_s, 2.0)
    ld_allow = beta * ld_basic
    ld_act = (d.Lx_m * 1000) / d_eff
    ok_d = ld_act < ld_allow
    S.append({"title": "9. Deflection Check (EC2 §7.4.2 / UK NA)", "rows": [
        R("K factor", f"{sup_txt}: K = 1.0 (SS) / 1.3 (end span) / 1.5 (interior) / 0.4 (cantilever)", f"K = {Kd:.2f}"),
        R("Steel ratio", f"\u03c1 = A_s,prov/(b\u00b7d) = {As_prov:.0f}/{bd:.0f}", f"\u03c1 = {rho:.5f}"),
        R("Reference ratio", f"\u03c1\u2080 = 10\u207b\u00b3\u221af_ck = 10\u207b\u00b3 \u00d7 \u221a{d.fck:.0f} = 10\u207b\u00b3 \u00d7 {math.sqrt(d.fck):.4f}", f"\u03c1\u2080 = {rho0:.5f}"),
        R("Branch", f"\u03c1 = {rho:.5f} vs \u03c1\u2080 = {rho0:.5f}", "lightly reinforced" if rho <= rho0 else "heavily reinforced"),
        R("EC2 §7.4.2", branch, f"(L/d)_basic = {ld_basic:.2f}"),
        R("Steel stress", f"\u03c3_s = 310\u00b7f_yk\u00b7A_s,req/(500\u00b7A_s,prov) = (310 \u00d7 {d.fyk:.0f} \u00d7 {As_design:.0f})/(500 \u00d7 {As_prov:.0f})", f"\u03c3_s = {sigma_s:.1f} MPa"),
        R("Modification", f"\u03b2 = 310/\u03c3_s = 310/{sigma_s:.1f} = {310/sigma_s:.3f}  (\u2264 2.0)", f"\u03b2 = {beta:.3f}"),
        R("Allowable", f"(L/d)_allow = \u03b2 \u00d7 (L/d)_basic = {beta:.3f} \u00d7 {ld_basic:.2f}", f"{ld_allow:.2f}"),
        R("Actual", f"(L/d)_actual = L/d = {d.Lx_m*1000:.0f}/{d_eff:.0f}", f"{ld_act:.2f}"),
        R("Verdict", f"{ld_act:.2f} {'<' if ok_d else '>'} {ld_allow:.2f}", "Deflection OK" if ok_d else "Deflection NOT OK \u2014 increase depth or steel"),
    ]})

    # ---------------- 10. Shear ----------------
    rho_l = min(As_prov / bd, 0.02)
    k_raw = 1 + math.sqrt(200 / d_eff)
    k_sh = min(k_raw, 2.0)
    C_Rdc = 0.18 / d.gamma_c
    inner = 100 * rho_l * d.fck
    v_main = C_Rdc * k_sh * inner ** (1/3)
    v_min = 0.035 * k_sh ** 1.5 * math.sqrt(d.fck)
    v_rdc = max(v_main, v_min)
    VRdc = v_rdc * bd / 1000.0
    ok_v = VRdc > VEd
    S.append({"title": "10. Shear Verification (EC2 §6.2.2)", "rows": [
        R("Design shear", f"V_Ed = {VEd:.2f} kN/m (from \u00a75)", f"V_Ed = {VEd:.2f} kN/m"),
        R("Steel ratio", f"\u03c1\u2097 = A_s,prov/(b\u00b7d) = {As_prov:.0f}/{bd:.0f} = {As_prov/bd:.5f}  (\u2264 0.02)", f"\u03c1\u2097 = {rho_l:.5f}"),
        R("Size factor", f"k = 1 + \u221a(200/d) = 1 + \u221a(200/{d_eff:.0f}) = 1 + {math.sqrt(200/d_eff):.3f} = {k_raw:.3f}  \u2192 limit 2.0", f"k = {k_sh:.3f}"),
        R("C_Rd,c", f"C_Rd,c = 0.18/\u03b3_c = 0.18/{d.gamma_c:.2f}", f"{C_Rdc:.3f}"),
        R("Main term", f"v_Rd,c = C_Rd,c\u00b7k\u00b7(100\u03c1\u2097f_ck)^(1/3) = {C_Rdc:.3f} \u00d7 {k_sh:.3f} \u00d7 (100 \u00d7 {rho_l:.5f} \u00d7 {d.fck:.0f})^(1/3) = {C_Rdc:.3f} \u00d7 {k_sh:.3f} \u00d7 {inner:.3f}^(1/3)", f"{v_main:.3f} MPa"),
        R("Minimum", f"v_min = 0.035\u00b7k^1.5\u00b7\u221af_ck = 0.035 \u00d7 {k_sh:.3f}^1.5 \u00d7 \u221a{d.fck:.0f}", f"{v_min:.3f} MPa"),
        R("Governing", f"v_Rd,c = max({v_main:.3f} , {v_min:.3f})", f"{v_rdc:.3f} MPa"),
        R("Resistance", f"V_Rd,c = v_Rd,c \u00b7 b \u00b7 d = {v_rdc:.3f} \u00d7 {b:.0f} \u00d7 {d_eff:.0f} / 1000", f"V_Rd,c = {VRdc:.2f} kN/m"),
        R("Verdict", f"V_Rd,c {'>' if ok_v else '<'} V_Ed \u2192 {VRdc:.2f} {'>' if ok_v else '<'} {VEd:.2f}", "OK \u2014 no shear reinforcement required" if ok_v else "shear reinforcement required"),
        R("Note", "Shear links are rarely required in solid slabs supported by beams.", ""),
    ]})

    # ---------------- 11. Summary ----------------
    S.append({"title": "11. Design Summary", "rows": [
        R("Section", f"h = {d.h_mm:.0f} mm ; d = {d_eff:.0f} mm ; cover = {d.clear_cover_mm:.0f} mm", f"{d.h_mm:.0f} mm slab"),
        R("Loading", f"G_k = {Gk:.2f} ; Q_k = {Qk:.2f} ; w_Ed = {wu:.2f} kN/m\u00b2", f"w_Ed = {wu:.2f} kN/m\u00b2"),
        R("Actions", f"M_Ed = {MEd:.2f} kNm/m ; V_Ed = {VEd:.2f} kN/m", "ULS"),
        R("Steel required", f"A_s,req = {As_design:.0f} mm\u00b2/m", f"{As_design:.0f} mm\u00b2/m"),
        R("Steel provided", f"\u03c6{d.bar_dia_mm:.0f} @ {chosen_s:.0f} mm c/c = {As_prov:.0f} mm\u00b2/m", f"T{d.bar_dia_mm:.0f} @ {chosen_s:.0f}"),
        R("Deflection", f"actual {ld_act:.2f} vs allowable {ld_allow:.2f}", "OK" if ok_d else "NOT OK"),
        R("Shear", f"V_Ed {VEd:.2f} vs V_Rd,c {VRdc:.2f} kN/m", "OK" if ok_v else "NOT OK"),
    ]})

    return S